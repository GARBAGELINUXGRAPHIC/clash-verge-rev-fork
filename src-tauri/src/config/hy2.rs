use anyhow::{Context as _, Result, bail};
use serde::{Deserialize, Serialize};
use serde_yaml_ng::{Mapping, Value};
use std::{
    io::ErrorKind,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tokio::sync::{Mutex, Notify};

#[cfg(target_os = "macos")]
mod clock;

use crate::{
    core::{CoreManager, handle::Handle, proxy_view::ProxyNodeSource},
    utils::{dirs, help},
};

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hy2Target {
    pub profile: Option<String>,
    pub source: ProxyNodeSource,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum Hy2Congestion {
    Standard,
    Conservative,
    Aggressive,
    Brutal { up: f64, down: f64 },
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hy2Settings {
    pub congestion: Hy2Congestion,
    pub expires_at: u64,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Hy2Override {
    pub target: Hy2Target,
    pub settings: Hy2Settings,
}

static OVERRIDES: Mutex<Option<Vec<Hy2Override>>> = Mutex::const_new(None);
static CHANGED: Notify = Notify::const_new();

pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

impl Hy2Settings {
    pub fn validate(&self) -> Result<()> {
        if self.expires_at <= now() {
            bail!("The expiration time must be in the future");
        }
        if let Hy2Congestion::Brutal { up, down } = self.congestion {
            for speed in [up, down] {
                if !speed.is_finite() || !(0.01..=1_000_000.0).contains(&speed) {
                    bail!("Bandwidth must be between 0.01 and 1000000 Mbps");
                }
            }
        }
        Ok(())
    }

    fn fields(&self) -> Mapping {
        let (profile, up, down) = match self.congestion {
            Hy2Congestion::Standard => ("standard", String::new(), String::new()),
            Hy2Congestion::Conservative => ("conservative", String::new(), String::new()),
            Hy2Congestion::Aggressive => ("aggressive", String::new(), String::new()),
            Hy2Congestion::Brutal { up, down } => ("standard", format!("{up} Mbps"), format!("{down} Mbps")),
        };
        // Both bandwidth values must be cleared to request BBR instead of Brutal.
        Mapping::from_iter([
            ("bbr-profile".into(), profile.into()),
            ("up".into(), up.into()),
            ("down".into(), down.into()),
        ])
    }
}

pub async fn load() -> Result<Vec<Hy2Override>> {
    let mut cached = OVERRIDES.lock().await;
    if let Some(entries) = cached.as_ref() {
        return Ok(entries.clone());
    }
    let path = dirs::app_home_dir()?.join("hy2-overrides.json");
    let entries: Vec<Hy2Override> = match tokio::fs::read(path).await {
        Ok(bytes) => serde_json::from_slice(&bytes).context("Failed to read Hysteria2 overrides")?,
        Err(error) if error.kind() == ErrorKind::NotFound => Vec::new(),
        Err(error) => return Err(error.into()),
    };
    *cached = Some(entries.clone());
    drop(cached);
    Ok(entries)
}

pub async fn save(entries: &[Hy2Override]) -> Result<()> {
    let mut cached = OVERRIDES.lock().await;
    help::save_yaml_str(
        &dirs::app_home_dir()?.join("hy2-overrides.json"),
        &serde_json::to_string(entries)?,
    )
    .await?;
    *cached = Some(entries.to_vec());
    drop(cached);
    CHANGED.notify_one();
    Ok(())
}

pub fn apply(config: &mut Mapping, profile: Option<&str>, entries: &[Hy2Override], now: u64) -> Result<()> {
    for entry in entries
        .iter()
        .filter(|entry| entry.target.profile.as_deref() == profile && entry.settings.expires_at > now)
    {
        let fields = entry.settings.fields();
        match &entry.target.source {
            ProxyNodeSource::Core { proxy_name } => {
                if let Some(proxies) = config.get_mut("proxies").and_then(Value::as_sequence_mut) {
                    for proxy in proxies {
                        if proxy.get("name").and_then(Value::as_str) == Some(proxy_name)
                            && proxy.get("type").and_then(Value::as_str) == Some("hysteria2")
                            && let Some(proxy) = proxy.as_mapping_mut()
                        {
                            proxy.extend(fields.clone());
                        }
                    }
                }
            }
            ProxyNodeSource::Provider {
                provider_name,
                proxy_name,
            } => {
                let Some(provider) = config
                    .get_mut("proxy-providers")
                    .and_then(Value::as_mapping_mut)
                    .and_then(|providers| providers.get_mut(provider_name.as_str()))
                    .and_then(Value::as_mapping_mut)
                else {
                    continue;
                };
                let overrides = provider
                    .entry(Value::from("override"))
                    .or_insert_with(|| Value::Mapping(Mapping::new()))
                    .as_mapping_mut()
                    .context("Invalid provider override")?;
                let expressions = overrides
                    .entry(Value::from("override-expr"))
                    .or_insert_with(|| Value::Sequence(Vec::new()))
                    .as_sequence_mut()
                    .context("Invalid provider override-expr")?;
                // Match the displayed name after existing renames, and preserve other provider nodes.
                for (key, value) in &fields {
                    expressions.push(
                        format!(
                            "(select(.name == {} and .type == \"hysteria2\") | .{}) = {}",
                            serde_json::to_string(proxy_name)?,
                            serde_json::to_string(key)?,
                            serde_json::to_string(value)?
                        )
                        .into(),
                    );
                }
            }
        }
    }
    Ok(())
}

async fn wait_for_expiry(expires_at: Option<u64>, changed: &Notify) {
    let Some(expires_at) = expires_at else {
        changed.notified().await;
        return;
    };
    let deadline = UNIX_EPOCH + Duration::from_secs(expires_at);
    let delay = deadline.duration_since(SystemTime::now()).unwrap_or_default();
    tokio::select! {
        _ = tokio::time::sleep(delay) => {}
        _ = changed.notified() => {}
    }
}

pub fn start_expiry_task() {
    #[cfg(target_os = "macos")]
    clock::start();

    crate::process::AsyncHandler::spawn(|| async {
        loop {
            if Handle::global().is_exiting() {
                break;
            }
            let result = async {
                let expires_at = load().await?.iter().map(|entry| entry.settings.expires_at).min();
                if expires_at.is_some_and(|expires_at| expires_at <= now()) {
                    CoreManager::global().update_hy2_override(None).await?;
                } else {
                    // notify_one keeps a permit if settings change between reading and waiting.
                    wait_for_expiry(expires_at, &CHANGED).await;
                }
                Ok::<_, anyhow::Error>(())
            }
            .await;
            if let Err(error) = result {
                clash_verge_logging::logging!(
                    warn,
                    clash_verge_logging::Type::Config,
                    "Failed to expire Hysteria2 overrides: {error:#}"
                );
                tokio::time::sleep(Duration::from_secs(60)).await;
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(start_paused = true)]
    async fn empty_schedule_waits_for_a_change_without_a_timer() {
        let changed = Notify::new();
        let waiting = wait_for_expiry(None, &changed);
        tokio::pin!(waiting);
        assert!(futures::poll!(&mut waiting).is_pending());
        tokio::time::advance(Duration::from_secs(24 * 3600)).await;
        assert!(futures::poll!(&mut waiting).is_pending());
        changed.notify_one();
        assert!(futures::poll!(&mut waiting).is_ready());
    }

    #[tokio::test(start_paused = true)]
    async fn deadline_wait_is_interruptible_and_keeps_early_notifications() {
        let changed = Notify::new();
        let waiting = wait_for_expiry(Some(now() + 3600), &changed);
        tokio::pin!(waiting);
        assert!(futures::poll!(&mut waiting).is_pending());
        changed.notify_one();
        assert!(futures::poll!(&mut waiting).is_ready());

        changed.notify_one();
        let waiting = wait_for_expiry(Some(now() + 3600), &changed);
        tokio::pin!(waiting);
        assert!(futures::poll!(&mut waiting).is_ready());
    }

    #[tokio::test(start_paused = true)]
    async fn deadline_wait_fires_without_a_change_notification() {
        let changed = Notify::new();
        let waiting = wait_for_expiry(Some(now() + 60), &changed);
        tokio::pin!(waiting);
        assert!(futures::poll!(&mut waiting).is_pending());
        tokio::time::advance(Duration::from_secs(58)).await;
        assert!(futures::poll!(&mut waiting).is_pending());
        tokio::time::advance(Duration::from_secs(2)).await;
        assert!(futures::poll!(&mut waiting).is_ready());
    }

    #[test]
    fn provider_overrides_preserve_payload_and_escape_exact_names() -> Result<()> {
        let original: Mapping = serde_yaml_ng::from_str(
            "proxy-providers:\n  p:\n    type: inline\n    payload: [{name: node, type: hysteria2}]\n    override:\n      additional-prefix: prefix\n      override-expr: ['.udp = true']\n  other:\n    type: inline\n    payload: [{name: node, type: hysteria2}]",
        )?;
        let name = "prefix node \"quoted\" | .up";
        let entry = Hy2Override {
            target: Hy2Target {
                profile: Some("p".into()),
                source: ProxyNodeSource::Provider {
                    provider_name: "p".into(),
                    proxy_name: name.into(),
                },
            },
            settings: Hy2Settings {
                congestion: Hy2Congestion::Aggressive,
                expires_at: 100,
            },
        };
        let mut config = original.clone();
        apply(&mut config, Some("p"), &[entry], 99)?;
        let providers = &config["proxy-providers"];
        assert_eq!(providers["other"], original["proxy-providers"]["other"]);
        assert_eq!(providers["p"]["payload"], original["proxy-providers"]["p"]["payload"]);
        let overrides = &providers["p"]["override"];
        assert_eq!(overrides["additional-prefix"].as_str(), Some("prefix"));
        let expressions = overrides["override-expr"].as_sequence().context("expressions")?;
        assert_eq!(expressions.len(), 4);
        assert_eq!(expressions[0].as_str(), Some(".udp = true"));
        assert_eq!(
            expressions[1].as_str(),
            Some(
                format!(
                    "(select(.name == {} and .type == \"hysteria2\") | .\"bbr-profile\") = \"aggressive\"",
                    serde_json::to_string(name)?
                )
                .as_str()
            )
        );
        Ok(())
    }

    #[test]
    fn overrides_are_scoped_and_expiry_restores_fresh_subscription() -> Result<()> {
        let original: Mapping = serde_yaml_ng::from_str(
            "proxies:\n- {name: node, type: hysteria2, up: 20 Mbps, down: 50 Mbps, udp: true}\n- {name: other, type: hysteria2, up: 10 Mbps}",
        )?;
        let entry = Hy2Override {
            target: Hy2Target {
                profile: Some("p".into()),
                source: ProxyNodeSource::Core {
                    proxy_name: "node".into(),
                },
            },
            settings: Hy2Settings {
                congestion: Hy2Congestion::Conservative,
                expires_at: 100,
            },
        };
        let mut config = original.clone();
        apply(&mut config, Some("p"), std::slice::from_ref(&entry), 99)?;
        let nodes = config.get("proxies").and_then(Value::as_sequence).context("proxies")?;
        assert_eq!(nodes[0]["up"].as_str(), Some(""));
        assert_eq!(nodes[0]["down"].as_str(), Some(""));
        assert_eq!(nodes[0]["bbr-profile"].as_str(), Some("conservative"));
        assert_eq!(nodes[0]["udp"].as_bool(), Some(true));
        assert_eq!(nodes[1]["up"].as_str(), Some("10 Mbps"));
        for (profile, time) in [(Some("other"), 99), (Some("p"), 100)] {
            let mut config = original.clone();
            apply(&mut config, profile, std::slice::from_ref(&entry), time)?;
            assert_eq!(config, original);
        }
        let brutal = Hy2Settings {
            congestion: Hy2Congestion::Brutal { up: 12.5, down: 100.0 },
            expires_at: 100,
        };
        assert_eq!(brutal.fields()["up"].as_str(), Some("12.5 Mbps"));
        Ok(())
    }
}
