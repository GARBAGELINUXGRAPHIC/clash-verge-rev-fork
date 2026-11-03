import type { ProxyNodeView } from '@/types/proxy-view'

import type { Hy2Settings, Hy2SettingsResponse, Hy2Target } from './bindings'
import { setHy2Settings as saveHy2Settings } from './cmds'
import { setCacheData } from './query-client'

export type {
  Hy2Congestion,
  Hy2Settings,
  Hy2SettingsResponse,
  Hy2Target,
} from './bindings'
export { getHy2Settings } from './cmds'

export const hy2SettingsKey = (
  profile: string | null,
  source: ProxyNodeView['source'],
) => ['hy2Settings', profile, source] as const

export const setHy2Settings = async (
  target: Hy2Target,
  settings: Hy2Settings | null,
) => {
  await saveHy2Settings(target, settings)
  await setCacheData<Hy2SettingsResponse>(
    hy2SettingsKey(target.profile, target.source),
    {
      target,
      settings,
    },
  )
}
