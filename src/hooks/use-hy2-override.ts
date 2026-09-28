import { useEffect, useState } from 'react'

import { getHy2Settings, hy2SettingsKey } from '@/services/hy2'
import { useQuery } from '@/services/query-client'
import type { ProxyNodeView } from '@/types/proxy-view'

import { useProfiles } from './use-profiles'

export function useHy2Override(source?: ProxyNodeView['source']) {
  const { profiles } = useProfiles()
  const [expiredAt, setExpiredAt] = useState<number | null>(null)
  const { data } = useQuery({
    queryKey: source
      ? hy2SettingsKey(profiles?.current ?? null, source)
      : ['hy2Settings'],
    queryFn: () => getHy2Settings(source!),
    enabled: Boolean(source && profiles),
    refetchOnWindowFocus: true,
  })
  const expiresAt = data?.settings?.expiresAt

  useEffect(() => {
    if (!expiresAt) return
    let timer: number
    const schedule = () => {
      const remaining = expiresAt * 1000 - Date.now()
      if (remaining <= 0) {
        setExpiredAt(expiresAt)
        return
      }
      timer = window.setTimeout(schedule, Math.min(remaining, 2_147_483_647))
    }
    timer = window.setTimeout(schedule, 0)
    return () => window.clearTimeout(timer)
  }, [expiresAt])

  return Boolean(expiresAt && expiresAt !== expiredAt)
}
