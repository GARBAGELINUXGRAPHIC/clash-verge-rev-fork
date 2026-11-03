use super::CmdResult;
use crate::core::{LatencyUptimeMonitor, latency_uptime::LatencyUptimeSnapshot};

#[tauri::command]
#[specta::specta]
pub async fn get_latency_uptime_snapshot() -> CmdResult<LatencyUptimeSnapshot> {
    Ok(LatencyUptimeMonitor::global().snapshot().await)
}
