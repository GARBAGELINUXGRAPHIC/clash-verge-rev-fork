import { emit } from '@tauri-apps/api/event'
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'

import type { ProxyViewV1 } from '@/types/proxy-view'

const capabilities = {
  udp: true,
  xudp: false,
  tfo: false,
  mptcp: false,
  smux: false,
}
const names = Array.from(
  { length: 18 },
  (_, i) =>
    `${['Hong Kong', 'Tokyo', 'Singapore'][i % 3]} ${String(i + 1).padStart(2, '0')}`,
)
const records: ProxyViewV1['records'] = Object.fromEntries(
  names.map((name, i) => [
    name,
    {
      ...capabilities,
      recordId: name,
      name,
      type: 'Shadowsocks',
      alive: true,
      history: [{ time: '2026-01-01T00:00:00Z', delay: 40 + i * 7 }],
      source: { kind: 'core', proxyName: name },
    },
  ]),
)
const groups: ProxyViewV1['groups'] = [
  'Select Proxy',
  'Auto Select',
  'Streaming',
].map((name) => ({
  ...capabilities,
  name,
  type: 'Selector',
  alive: true,
  now: names[0],
  history: [],
  members: names.map((name) => ({ kind: 'node', name, recordId: name })),
}))
const proxyView: ProxyViewV1 = {
  schemaVersion: 1,
  orderSource: 'runtime',
  providerState: 'ready',
  global: { ...groups[0], name: 'GLOBAL' },
  direct: null,
  groups,
  records,
  standalone: [],
  providers: [],
}
const verge: IVergeConfig = {
  language: 'zh',
  theme_mode: 'light',
  enable_system_proxy: false,
  enable_auto_launch: false,
  auto_check_update: false,
  enable_auto_all_latency_uptime: true,
}
const config = {
  mode: 'rule',
  'mixed-port': 7897,
  'allow-lan': false,
  ipv6: false,
  'log-level': 'info',
  tun: { enable: false },
  dns: { enable: true },
}
const profiles: IProfilesConfig = {
  current: 'preview',
  items: [
    { uid: 'preview', name: 'Web Preview', type: 'local', updated: 1767225600 },
  ],
}
const values: Record<string, unknown> = {
  get_verge_config: verge,
  get_profiles: profiles,
  get_proxy_view: proxyView,
  get_runtime_config: config,
  get_clash_info: null,
  get_runtime_state: {
    mode: 'Sidecar',
    service: 'notInstalled',
    serviceUnavailableReason: null,
    pendingAction: null,
    sidecarAllowed: true,
    isAdmin: false,
    opInFlight: false,
    serviceUsable: false,
    tunCapable: false,
    serviceNeedsAttention: false,
  },
  get_auto_proxy: { enable: false, url: '' },
  get_embedded_server_port: 0,
  get_app_dir: '/web-preview',
  'plugin:fs|exists': false,
  get_sys_proxy: { enable: false, server: '', bypass: '' },
  get_latency_uptime_snapshot: {
    enabled: true,
    profileId: 'preview',
    nodes: names.map((name, i) => ({
      name,
      groups: [...groups.map((group) => group.name), 'GLOBAL'],
      delay: 40 + i * 7,
      updatedAt: 1767225600,
      uptime: [1, 0.995, 0.978, 0.953, 0.924, 0.88][i % 6],
      samples: 200,
    })),
  },
  get_pending_failures: [],
  get_clash_logs: [],
  get_runtime_logs: {},
  get_app_uptime: 0,
  get_next_update_time: null,
  take_dns_override_notice: false,
  take_service_fallback_notice: false,
  take_service_repair_notice: false,
  take_discarded_keys_notice: null,
  get_network_interfaces: [],
  get_network_interfaces_info: [],
  list_local_backup: [],
  list_webdav_backup: [],
  'plugin:app|version': '2.5.5',
  'plugin:app|name': 'Clash Verge Web Preview',
  'plugin:app|tauri_version': '2.0.0',
  'plugin:mihomo|get_base_config': config,
  'plugin:mihomo|get_version': { version: 'web-preview', meta: true },
  'plugin:mihomo|get_rules': { rules: [] },
  'plugin:mihomo|get_rule_providers': { providers: {} },
  'plugin:mihomo|get_proxy_providers': { providers: {} },
  'plugin:mihomo|get_connections': {
    connections: [],
    uploadTotal: 0,
    downloadTotal: 0,
    memory: 0,
  },
  'plugin:window|is_decorated': true,
  'plugin:window|is_maximized': false,
  'plugin:window|is_fullscreen': false,
  'plugin:window|is_focused': true,
  'plugin:window|is_visible': true,
  'plugin:window|scale_factor': 1,
  'plugin:window|inner_size': { width: innerWidth, height: innerHeight },
  'plugin:window|outer_position': { x: 0, y: 0 },
  'plugin:window|theme': 'light',
}

mockWindows('main')
mockIPC(
  async (command, args = {}) => {
    const payload = args as Record<string, any>
    if (command in values) return structuredClone(values[command])
    if (command === 'plugin:path|join') return payload.paths.join('/')
    if (command === 'get_clash_mode') return config.mode
    if (command === 'patch_verge_config') {
      Object.assign(verge, payload.payload)
      await emit('verge://refresh-verge-config', '')
      return
    }
    if (command === 'patch_clash_mode') {
      config.mode = payload.payload
      await emit('verge://refresh-clash-config', '')
      return
    }
    if (
      command === 'patch_clash_config' ||
      command === 'plugin:mihomo|patch_base_config'
    ) {
      Object.assign(config, payload.payload ?? payload.data)
      await emit('verge://refresh-clash-config', '')
      return
    }
    if (command === 'plugin:mihomo|select_node_for_group') {
      const group = [...groups, proxyView.global!].find(
        (group) => group.name === payload.groupName,
      )
      if (group) group.now = payload.node
      await emit('verge://refresh-proxy-config', null)
      return
    }
    if (command === 'plugin:mihomo|delay_proxy_by_name') return { delay: 64 }
    if (command === 'plugin:mihomo|delay_group')
      return Object.fromEntries(names.map((name) => [name, 64]))
    if (
      command === 'record_selected_node' ||
      command === 'sync_tray_proxy_selection'
    )
      return
    if (
      command.startsWith('plugin:window|set_') ||
      command === 'plugin:window|show'
    )
      return
    if (
      command.startsWith('plugin:mihomo|ws_') ||
      command === 'plugin:mihomo|clear_all_ws_connections'
    )
      return 1
    throw new Error(
      `Web preview: ${command} is unavailable without the native backend`,
    )
  },
  { shouldMockEvents: true },
)

document.title = 'Clash Verge · Web Preview'
