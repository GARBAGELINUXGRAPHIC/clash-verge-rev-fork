import { emit } from '@tauri-apps/api/event'
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks'

import type { Hy2Settings, Hy2Target } from '@/services/hy2'
import type { ProxyViewV1 } from '@/types/proxy-view'
import { version } from '@root/package.json'

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
      type: i === 0 ? 'Hysteria2' : 'Shadowsocks',
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
    {
      uid: 'preview-daily',
      name: '日常订阅 · 演示',
      type: 'remote',
      url: 'https://example.com/daily.yaml',
      desc: '日常浏览与办公使用的演示订阅',
      updated: 1767225600,
      extra: {
        upload: 2 * 1024 ** 3,
        download: 28 * 1024 ** 3,
        total: 200 * 1024 ** 3,
        expire: 1893456000,
      },
      option: { allow_auto_update: true, update_interval: 1440 },
    },
    {
      uid: 'preview-streaming',
      name: 'Streaming · 演示',
      type: 'remote',
      url: 'https://example.com/streaming.yaml',
      updated: 1767225600,
      extra: {
        upload: 5 * 1024 ** 3,
        download: 85 * 1024 ** 3,
        total: 100 * 1024 ** 3,
        expire: 1893456000,
      },
    },
    {
      uid: 'preview-backup',
      name: '备用订阅 · 演示',
      type: 'remote',
      url: 'https://example.com/backup.yaml',
      updated: 1767225600,
      desc: '未提供流量信息的演示订阅',
    },
    {
      uid: 'preview-local',
      name: '本地配置 · 演示',
      type: 'local',
      desc: '用于查看本地配置卡片的显示效果',
      updated: 1767225600,
    },
  ],
}
const hy2Settings = new Map<string, Hy2Settings>()
let proxyChainConfig: string | null = null
const previewConnections: IConnectionsItem[] = [
  'example.com',
  'docs.example.com',
  'media.example.com',
].map((host, index) => ({
  id: `preview-connection-${index}`,
  metadata: {
    network: 'tcp',
    type: 'Mixed',
    host,
    sourceIP: '127.0.0.1',
    sourcePort: String(50000 + index),
    destinationIP: '192.0.2.1',
    destinationPort: '443',
    process: 'Web Preview',
  },
  upload: 1024 * (index + 1),
  download: 8192 * (index + 1),
  start: new Date().toISOString(),
  chains: [names[0], groups[0].name],
  rule: 'DomainSuffix',
  rulePayload: 'example.com',
}))
// Synthetic fixtures only; no native backend or network requests are made.
const previewRules = [
  { type: 'DomainSuffix', payload: 'example.com', proxy: 'Select Proxy' },
  { type: 'Domain', payload: 'docs.example.com', proxy: 'DIRECT' },
  { type: 'DomainKeyword', payload: 'streaming', proxy: 'Streaming' },
  { type: 'IPCIDR', payload: '192.0.2.0/24', proxy: 'DIRECT' },
  { type: 'GeoIP', payload: 'CN', proxy: 'DIRECT' },
  { type: 'DomainSuffix', payload: 'ads.example.com', proxy: 'REJECT' },
  { type: 'Match', payload: '', proxy: 'Select Proxy' },
]
const previewUnlockItems = [
  { name: 'Netflix', status: 'Yes', region: 'HK' },
  { name: 'Disney+', status: 'No (IP Banned By Disney+)', region: 'HK' },
  { name: 'YouTube Premium', status: 'Yes', region: 'JP' },
  { name: 'Spotify', status: 'Unsupported Country/Region', region: null },
  { name: 'ChatGPT', status: 'Completed', region: 'US' },
  { name: 'Apple TV+', status: 'Pending', region: null },
].map((item) => ({ ...item, check_time: '2026-10-04T12:00:00+08:00' }))
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
  get_clash_logs: [
    'time="2026-10-04T12:00:00+08:00" level=info msg="Web preview: synthetic configuration loaded"',
    'time="2026-10-04T12:00:01+08:00" level=info msg="[TCP] 127.0.0.1:50000 --> example.com:443 match DomainSuffix using Select Proxy"',
    'time="2026-10-04T12:00:02+08:00" level=warning msg="Web preview: synthetic provider refresh skipped"',
    'time="2026-10-04T12:00:03+08:00" level=error msg="Web preview: synthetic connection timeout to media.example.com"',
    'time="2026-10-04T12:00:04+08:00" level=debug msg="Web preview: synthetic DNS cache hit for docs.example.com"',
  ],
  get_unlock_items: previewUnlockItems,
  get_runtime_logs: {},
  get_app_uptime: 0,
  get_next_update_time: null,
  take_dns_override_notice: false,
  take_service_fallback_notice: false,
  take_service_owner_notice: null,
  get_core_startup_error: null,
  take_service_repair_notice: false,
  take_discarded_keys_notice: null,
  get_network_interfaces: [],
  get_network_interfaces_info: [],
  list_local_backup: [],
  list_webdav_backup: [],
  'plugin:app|version': version,
  'plugin:updater|check': {
    rid: 9001,
    currentVersion: version,
    version: '99.0.0',
    body: 'Web preview: synthetic update for testing the release link.',
    rawJson: { version: '99.0.0' },
  },
  'plugin:app|name': 'Clash Verge Web Preview',
  'plugin:app|tauri_version': '2.0.0',
  'plugin:mihomo|get_base_config': config,
  'plugin:mihomo|get_version': { version: 'web-preview', meta: true },
  'plugin:mihomo|get_rules': { rules: previewRules },
  'plugin:mihomo|get_rule_providers': { providers: {} },
  'plugin:mihomo|get_proxy_providers': { providers: {} },
  'plugin:mihomo|get_connections': {
    connections: previewConnections,
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
    if (
      command === 'check_media_unlock' ||
      command === 'check_media_unlock_item'
    ) {
      const results = previewUnlockItems.map((item) => ({
        ...item,
        status: item.status === 'Pending' ? 'Yes' : item.status,
        check_time: new Date().toISOString(),
      }))
      if (command === 'check_media_unlock') return results
      const result = results.find((item) => item.name === payload.name)
      if (!result) throw new Error('Web preview: test item not found')
      return result
    }
    if (command === 'get_runtime_proxy_chain_config') return proxyChainConfig
    if (command === 'update_proxy_chain_config_in_runtime') {
      proxyChainConfig = payload.proxyChainConfig
      return
    }
    if (command === 'get_hy2_settings') {
      const source = payload.source as Hy2Target['source']
      if (
        !Object.values(records).some(
          (node) =>
            node.type === 'Hysteria2' &&
            JSON.stringify(node.source) === JSON.stringify(source),
        )
      )
        throw new Error('Web preview: Hysteria2 node not found')
      const key = JSON.stringify(source)
      const settings = hy2Settings.get(key)
      if (settings && settings.expiresAt <= Date.now() / 1000)
        hy2Settings.delete(key)
      return {
        target: { profile: profiles.current, source },
        settings: hy2Settings.get(key) ?? null,
      }
    }
    if (command === 'set_hy2_settings') {
      const key = JSON.stringify(payload.target.source)
      if (payload.settings) hy2Settings.set(key, payload.settings)
      else hy2Settings.delete(key)
      return
    }
    if (command === 'plugin:opener|open_url') {
      const url = new URL(payload.url)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Web preview: only HTTP and HTTPS URLs are supported')
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer')
      console.info('Web preview: requested external URL', url.toString())
      return
    }
    if (command === 'plugin:resources|close' && payload.rid === 9001) return
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
      command === 'plugin:mihomo|ws_connections' ||
      command === 'plugin:mihomo|ws_connections_count'
    ) {
      setTimeout(() => {
        payload.onMessage.onmessage(
          command === 'plugin:mihomo|ws_connections'
            ? {
                connections: previewConnections,
                uploadTotal: 6144,
                downloadTotal: 49152,
              }
            : { count: previewConnections.length },
        )
      }, 0)
      return 1
    }
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
