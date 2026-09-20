import { invoke } from '@tauri-apps/api/core'

import type { ProxyNodeView } from '@/types/proxy-view'

export type Hy2Congestion =
  | { mode: 'standard' | 'conservative' | 'aggressive' }
  | { mode: 'brutal'; up: number; down: number }

export interface Hy2Settings {
  congestion: Hy2Congestion
  expiresAt: number
}

export interface Hy2Target {
  profile: string | null
  source: ProxyNodeView['source']
}

export interface Hy2SettingsResponse {
  target: Hy2Target
  settings: Hy2Settings | null
}

export const getHy2Settings = (source: ProxyNodeView['source']) =>
  invoke<Hy2SettingsResponse>('get_hy2_settings', { source })

export const setHy2Settings = (
  target: Hy2Target,
  settings: Hy2Settings | null,
) => invoke<void>('set_hy2_settings', { target, settings })
