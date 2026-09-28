import { invoke } from '@tauri-apps/api/core'

import type { ProxyNodeView } from '@/types/proxy-view'

import { setCacheData } from './query-client'

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

export const hy2SettingsKey = (
  profile: string | null,
  source: ProxyNodeView['source'],
) => ['hy2Settings', profile, source] as const

export const setHy2Settings = async (
  target: Hy2Target,
  settings: Hy2Settings | null,
) => {
  await invoke<void>('set_hy2_settings', { target, settings })
  await setCacheData<Hy2SettingsResponse>(
    hy2SettingsKey(target.profile, target.source),
    {
      target,
      settings,
    },
  )
}
