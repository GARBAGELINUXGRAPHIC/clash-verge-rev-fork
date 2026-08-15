use std::{
    collections::{BTreeSet, HashMap},
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use clash_verge_logging::{Type, logging};
use futures::{StreamExt as _, stream};
use parking_lot::{Mutex, RwLock};
use serde::Serialize;
use tauri_plugin_mihomo::models::{Proxies, Proxy, ProxyProviders, ProxyType};
use tokio::{sync::mpsc, time::sleep};

use crate::{config::Config, core::handle::Handle, module::lightweight, process::AsyncHandler, singleton};

const DEFAULT_TEST_URL: &str = "http://cp.cloudflare.com/generate_204";
const DEFAULT_TIMEOUT_MS: u32 = 10_000;
const DEFAULT_INTERVAL_MINUTES: u64 = 5;
const MAX_CONCURRENCY: usize = 10;
const LIGHTWEIGHT_POLL_INTERVAL: Duration = Duration::from_secs(5);

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatencyUptimeNode {
    pub name: String,
    pub provider_name: Option<String>,
    pub groups: Vec<String>,
    pub delay: u32,
    pub updated_at: u64,
    pub uptime: f64,
    pub samples: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LatencyUptimeSnapshot {
    pub enabled: bool,
    pub profile_id: Option<String>,
    pub nodes: Vec<LatencyUptimeNode>,
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
struct NodeKey {
    provider_name: Option<String>,
    name: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct MonitorNode {
    key: NodeKey,
    groups: BTreeSet<String>,
}

#[derive(Clone, Debug)]
struct NodeResult {
    node: MonitorNode,
    delay: u32,
    success: bool,
}

#[derive(Default)]
struct LatencyUptimeStore {
    profiles: HashMap<String, HashMap<NodeKey, LatencyUptimeNode>>,
}

impl LatencyUptimeStore {
    fn clear(&mut self) {
        self.profiles.clear();
    }

    fn apply_batch(&mut self, profile_id: &str, results: Option<Vec<NodeResult>>, updated_at: u64) {
        let Some(results) = results else {
            return;
        };

        let profile = self.profiles.entry(profile_id.to_owned()).or_default();
        for result in results {
            let success = u64::from(result.success);
            let entry = profile
                .entry(result.node.key.clone())
                .or_insert_with(|| LatencyUptimeNode {
                    name: result.node.key.name.clone(),
                    provider_name: result.node.key.provider_name.clone(),
                    groups: Vec::new(),
                    delay: 0,
                    updated_at,
                    uptime: 0.0,
                    samples: 0,
                });
            let samples = entry.samples;
            entry.uptime = (entry.uptime * samples as f64 + success as f64) / (samples + 1) as f64;
            entry.samples += 1;
            entry.delay = result.delay;
            entry.updated_at = updated_at;
            entry.groups = result.node.groups.into_iter().collect();
        }
    }

    fn snapshot(&self, profile_id: Option<&str>, enabled: bool) -> LatencyUptimeSnapshot {
        let mut nodes = profile_id
            .and_then(|id| self.profiles.get(id))
            .map(|nodes| nodes.values().cloned().collect::<Vec<_>>())
            .unwrap_or_default();
        nodes.sort_by(|left, right| {
            left.provider_name
                .cmp(&right.provider_name)
                .then_with(|| left.name.cmp(&right.name))
        });

        LatencyUptimeSnapshot {
            enabled,
            profile_id: profile_id.map(str::to_owned),
            nodes,
        }
    }
}

pub struct LatencyUptimeMonitor {
    store: RwLock<LatencyUptimeStore>,
    wake_sender: Mutex<Option<mpsc::Sender<()>>>,
}

singleton!(LatencyUptimeMonitor, LATENCY_UPTIME_MONITOR);

impl LatencyUptimeMonitor {
    pub fn new() -> Self {
        Self {
            store: RwLock::new(LatencyUptimeStore::default()),
            wake_sender: Mutex::new(None),
        }
    }

    pub async fn init(&self) -> anyhow::Result<()> {
        let (sender, receiver) = mpsc::channel(1);
        {
            let mut current_sender = self.wake_sender.lock();
            if current_sender.is_some() {
                return Ok(());
            }
            *current_sender = Some(sender);
        }

        AsyncHandler::spawn(move || async move {
            Self::run(receiver).await;
        });
        self.refresh();
        Ok(())
    }

    pub fn refresh(&self) {
        if let Some(sender) = self.wake_sender.lock().as_ref() {
            let _ = sender.try_send(());
        }
    }

    pub async fn snapshot(&self) -> LatencyUptimeSnapshot {
        let (enabled, profile_id) = current_scope().await;
        self.store.read().snapshot(profile_id.as_deref(), enabled)
    }

    async fn run(mut receiver: mpsc::Receiver<()>) {
        while receiver.recv().await.is_some() {
            let settings = MonitorSettings::load().await;
            if !settings.enabled {
                Self::global().store.write().clear();
                Self::global().emit_snapshot().await;
                continue;
            }
            Self::global().emit_snapshot().await;

            loop {
                let settings = MonitorSettings::load().await;
                if !settings.enabled {
                    Self::global().store.write().clear();
                    Self::global().emit_snapshot().await;
                    break;
                }

                if lightweight::is_in_lightweight_mode() {
                    tokio::select! {
                        signal = receiver.recv() => {
                            if signal.is_none() {
                                return;
                            }
                        }
                        () = sleep(LIGHTWEIGHT_POLL_INTERVAL) => {}
                    }
                    continue;
                }

                Self::global().scan(settings).await;

                let interval = MonitorSettings::load().await.interval;
                tokio::select! {
                    signal = receiver.recv() => {
                        if signal.is_none() {
                            return;
                        }
                    }
                    () = sleep(interval) => {}
                }
            }
        }
    }

    async fn scan(&self, settings: MonitorSettings) {
        let Some(profile_id) = settings.profile_id else {
            return;
        };

        let mihomo = Handle::mihomo().await;
        let proxies = match mihomo.get_proxies().await {
            Ok(proxies) => proxies,
            Err(error) => {
                logging!(
                    warn,
                    Type::Timer,
                    "Skipping latency/Uptime batch because proxy discovery failed: {error}"
                );
                return;
            }
        };
        let providers = match mihomo.get_proxy_providers().await {
            Ok(providers) => providers,
            Err(error) => {
                logging!(
                    warn,
                    Type::Timer,
                    "Skipping latency/Uptime batch because provider discovery failed: {error}"
                );
                return;
            }
        };

        let nodes = collect_monitor_nodes(&proxies, &providers);
        let test_url = Arc::<str>::from(settings.test_url);
        let timeout = settings.timeout;
        let results = stream::iter(nodes)
            .map(|node| {
                let test_url = Arc::clone(&test_url);
                let mihomo = &mihomo;
                async move {
                    let result = if let Some(provider_name) = node.key.provider_name.as_deref() {
                        mihomo
                            .healthcheck_node_in_provider(provider_name, &node.key.name, &test_url, timeout)
                            .await
                    } else {
                        mihomo.delay_proxy_by_name(&node.key.name, &test_url, timeout).await
                    };

                    match result {
                        Ok(result) => NodeResult {
                            success: is_successful_delay(result.delay, timeout),
                            delay: result.delay,
                            node,
                        },
                        Err(error) => {
                            logging!(
                                debug,
                                Type::Timer,
                                "Latency/Uptime check failed for node {}: {error}",
                                node.key.name
                            );
                            NodeResult {
                                node,
                                delay: 0,
                                success: false,
                            }
                        }
                    }
                }
            })
            .buffer_unordered(MAX_CONCURRENCY)
            .collect::<Vec<_>>()
            .await;
        drop(mihomo);

        self.store.write().apply_batch(&profile_id, Some(results), now_millis());
        self.emit_snapshot().await;
    }

    async fn emit_snapshot(&self) {
        let snapshot = self.snapshot().await;
        Handle::notify_latency_uptime_updated(&snapshot);
    }
}

struct MonitorSettings {
    enabled: bool,
    profile_id: Option<String>,
    interval: Duration,
    test_url: String,
    timeout: u32,
}

impl MonitorSettings {
    async fn load() -> Self {
        let verge = Config::verge().await.latest_arc();
        let profile_id = Config::profiles()
            .await
            .latest_arc()
            .current
            .as_ref()
            .map(ToString::to_string);
        let test_url = verge
            .default_latency_test
            .as_deref()
            .map(str::trim)
            .filter(|url| !url.is_empty())
            .unwrap_or(DEFAULT_TEST_URL)
            .to_owned();
        let timeout = verge
            .default_latency_timeout
            .filter(|timeout| *timeout > 0)
            .map_or(DEFAULT_TIMEOUT_MS, |timeout| timeout as u32);
        let interval_minutes = verge
            .auto_delay_detection_interval_minutes
            .unwrap_or(DEFAULT_INTERVAL_MINUTES)
            .max(1);

        Self {
            enabled: verge.enable_auto_all_latency_uptime.unwrap_or(false),
            profile_id,
            interval: Duration::from_secs(interval_minutes.saturating_mul(60)),
            test_url,
            timeout,
        }
    }
}

async fn current_scope() -> (bool, Option<String>) {
    let enabled = Config::verge()
        .await
        .latest_arc()
        .enable_auto_all_latency_uptime
        .unwrap_or(false);
    let profile_id = Config::profiles()
        .await
        .latest_arc()
        .current
        .as_ref()
        .map(ToString::to_string);
    (enabled, profile_id)
}

fn collect_monitor_nodes(proxies: &Proxies, providers: &ProxyProviders) -> Vec<MonitorNode> {
    let mut groups_by_name = HashMap::<String, BTreeSet<String>>::new();
    for proxy in proxies.proxies.values() {
        let Some(members) = proxy.all.as_ref() else {
            continue;
        };
        for member in members {
            groups_by_name
                .entry(member.to_owned())
                .or_default()
                .insert(proxy.name.to_owned());
        }
    }

    let mut nodes = HashMap::<NodeKey, MonitorNode>::new();
    for (provider_name, provider) in &providers.providers {
        for proxy in &provider.proxies {
            if !is_monitorable_leaf(proxy) {
                continue;
            }
            let key = NodeKey {
                provider_name: Some(provider_name.to_owned()),
                name: proxy.name.to_owned(),
            };
            nodes.entry(key.clone()).or_insert_with(|| MonitorNode {
                groups: groups_by_name.get(&proxy.name).cloned().unwrap_or_default(),
                key,
            });
        }
    }

    for proxy in proxies.proxies.values() {
        if !is_monitorable_leaf(proxy) {
            continue;
        }

        let belongs_to_provider = providers
            .providers
            .values()
            .any(|provider| provider.proxies.iter().any(|candidate| candidate.name == proxy.name));
        if belongs_to_provider {
            continue;
        }

        let key = NodeKey {
            provider_name: None,
            name: proxy.name.to_owned(),
        };
        nodes
            .entry(key.clone())
            .and_modify(|node| {
                node.groups
                    .extend(groups_by_name.get(&proxy.name).into_iter().flatten().cloned());
            })
            .or_insert_with(|| MonitorNode {
                groups: groups_by_name.get(&proxy.name).cloned().unwrap_or_default(),
                key,
            });
    }

    nodes.into_values().collect()
}

fn is_monitorable_leaf(proxy: &Proxy) -> bool {
    proxy.all.is_none()
        && !matches!(
            proxy.proxy_type,
            ProxyType::Direct
                | ProxyType::Reject
                | ProxyType::RejectDrop
                | ProxyType::Compatible
                | ProxyType::Pass
                | ProxyType::PassRule
                | ProxyType::Dns
                | ProxyType::Relay
                | ProxyType::Selector
                | ProxyType::Fallback
                | ProxyType::URLTest
                | ProxyType::LoadBalance
        )
        && !matches!(
            proxy.name.to_ascii_uppercase().as_str(),
            "DIRECT" | "REJECT" | "REJECT-DROP" | "PASS" | "COMPATIBLE" | "GLOBAL"
        )
}

const fn is_successful_delay(delay: u32, timeout: u32) -> bool {
    delay > 0 && delay < timeout
}

fn now_millis() -> u64 {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    u64::try_from(millis).unwrap_or(u64::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor_node(name: &str, provider_name: Option<&str>, groups: &[&str]) -> MonitorNode {
        MonitorNode {
            key: NodeKey {
                name: name.to_owned(),
                provider_name: provider_name.map(str::to_owned),
            },
            groups: groups.iter().map(|group| (*group).to_owned()).collect(),
        }
    }

    fn result(node: MonitorNode, delay: u32, success: bool) -> NodeResult {
        NodeResult { node, delay, success }
    }

    #[test]
    fn uptime_uses_incremental_average_without_history() {
        let mut store = LatencyUptimeStore::default();
        let node = monitor_node("node", None, &["group"]);
        store.apply_batch("profile", Some(vec![result(node.clone(), 50, true)]), 1);
        store.apply_batch("profile", Some(vec![result(node.clone(), 0, false)]), 2);
        store.apply_batch("profile", Some(vec![result(node, 60, true)]), 3);

        let snapshot = store.snapshot(Some("profile"), true);
        assert_eq!(snapshot.nodes[0].samples, 3);
        assert!((snapshot.nodes[0].uptime - 2.0 / 3.0).abs() < f64::EPSILON);
    }

    #[test]
    fn delay_success_excludes_zero_and_timeout_boundary() {
        assert!(!is_successful_delay(0, 1_000));
        assert!(is_successful_delay(999, 1_000));
        assert!(!is_successful_delay(1_000, 1_000));
        assert!(!is_successful_delay(1_001, 1_000));
    }

    #[test]
    fn profile_and_provider_keys_are_isolated() {
        let mut store = LatencyUptimeStore::default();
        store.apply_batch(
            "profile-a",
            Some(vec![
                result(monitor_node("same", Some("provider-a"), &[]), 10, true),
                result(monitor_node("same", Some("provider-b"), &[]), 0, false),
            ]),
            1,
        );
        store.apply_batch(
            "profile-b",
            Some(vec![result(monitor_node("same", Some("provider-a"), &[]), 0, false)]),
            1,
        );

        let profile_a = store.snapshot(Some("profile-a"), true);
        let profile_b = store.snapshot(Some("profile-b"), true);
        assert_eq!(profile_a.nodes.len(), 2);
        assert_eq!(profile_b.nodes.len(), 1);
        assert_eq!(profile_b.nodes[0].uptime, 0.0);
    }

    #[test]
    fn infrastructure_failure_does_not_add_samples() {
        let mut store = LatencyUptimeStore::default();
        store.apply_batch("profile", None, 1);
        assert!(store.snapshot(Some("profile"), true).nodes.is_empty());
    }

    #[test]
    fn node_failure_and_timeout_are_recorded_as_failures() {
        let mut store = LatencyUptimeStore::default();
        let node = monitor_node("node", None, &[]);
        store.apply_batch("profile", Some(vec![result(node.clone(), 0, false)]), 1);
        store.apply_batch("profile", Some(vec![result(node, 1_000, false)]), 2);

        let snapshot = store.snapshot(Some("profile"), true);
        assert_eq!(snapshot.nodes[0].samples, 2);
        assert_eq!(snapshot.nodes[0].uptime, 0.0);
    }

    #[test]
    fn disabling_clears_process_state() {
        let mut store = LatencyUptimeStore::default();
        store.apply_batch(
            "profile",
            Some(vec![result(monitor_node("node", None, &[]), 10, true)]),
            1,
        );

        store.clear();
        let disabled = store.snapshot(Some("profile"), false);
        assert!(!disabled.enabled);
        assert!(disabled.nodes.is_empty());
    }

    #[test]
    fn duplicate_node_memberships_are_merged() {
        let mut proxies = Proxies::default();
        let leaf = Proxy {
            name: "node".to_owned(),
            proxy_type: ProxyType::Vmess,
            ..Proxy::default()
        };
        let first_group = Proxy {
            name: "group-a".to_owned(),
            proxy_type: ProxyType::Selector,
            all: Some(vec!["node".to_owned()]),
            ..Proxy::default()
        };
        let second_group = Proxy {
            name: "group-b".to_owned(),
            proxy_type: ProxyType::URLTest,
            all: Some(vec!["node".to_owned()]),
            ..Proxy::default()
        };
        proxies.proxies.insert(leaf.name.clone(), leaf);
        proxies.proxies.insert(first_group.name.clone(), first_group);
        proxies.proxies.insert(second_group.name.clone(), second_group);

        let nodes = collect_monitor_nodes(&proxies, &ProxyProviders::default());
        assert_eq!(nodes.len(), 1);
        assert_eq!(
            nodes[0].groups,
            BTreeSet::from(["group-a".to_owned(), "group-b".to_owned()])
        );
    }

    #[test]
    fn same_name_in_different_providers_remains_isolated() {
        use tauri_plugin_mihomo::models::ProxyProvider;

        let provider_node = || Proxy {
            name: "same".to_owned(),
            proxy_type: ProxyType::Vmess,
            ..Proxy::default()
        };
        let mut proxies = Proxies::default();
        proxies.proxies.insert("same".to_owned(), provider_node());

        let mut providers = ProxyProviders::default();
        providers.providers.insert(
            "provider-a".to_owned(),
            ProxyProvider {
                proxies: vec![provider_node()],
                ..ProxyProvider::default()
            },
        );
        providers.providers.insert(
            "provider-b".to_owned(),
            ProxyProvider {
                proxies: vec![provider_node()],
                ..ProxyProvider::default()
            },
        );

        let nodes = collect_monitor_nodes(&proxies, &providers);
        let provider_names = nodes
            .iter()
            .filter_map(|node| node.key.provider_name.as_deref())
            .collect::<BTreeSet<_>>();
        assert_eq!(nodes.len(), 2);
        assert_eq!(provider_names, BTreeSet::from(["provider-a", "provider-b"]));
    }
}
