import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getBaseConfig,
  getRuleProviders,
  getRules,
} from 'tauri-plugin-mihomo-api'

import { useClashInfo, useRuntimeConfig } from '@/hooks/use-clash'
import { runStateQueryKey } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import {
  getAppUptime,
  getLatencyUptimeSnapshot,
  getProxyView,
  getRuntimeState,
  getSystemProxy,
} from '@/services/cmds'
import delayManager from '@/services/delay'
import { subscribeVergeEvents } from '@/services/events'
import { revalidateQueries, useQuery } from '@/services/query-client'
import { resolveDisplayedMixedPort } from '@/utils/mixed-port'

import {
  ClashConfigContext,
  CoreDataStatusContext,
  LatencyUptimeContext,
  latencyUptimeNodeKey,
  ProxiesContext,
  RefreshersContext,
  RulesContext,
  SystemContext,
  UptimeContext,
} from './app-data-context'

const TQ_MIHOMO = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 1500,
  retry: 3,
  retryDelay: (attempt: number) => Math.min(200 * 2 ** attempt, 3000),
} as const

const TQ_DEFAULTS = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  staleTime: 5000,
  retry: 2,
} as const

function useStableFn<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T
}

// 全局数据提供者组件
export const AppDataProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { verge } = useVerge()
  const [latencyUptime, setLatencyUptime] = useState<ILatencyUptimeSnapshot>({
    enabled: false,
    nodes: [],
  })

  const applyLatencyUptimeSnapshot = useStableFn(
    (snapshot: ILatencyUptimeSnapshot | null | undefined) => {
      if (!snapshot || !Array.isArray(snapshot.nodes)) return
      setLatencyUptime(snapshot)
      delayManager.applyLatencyUptimeSnapshot(snapshot.nodes)
    },
  )
  const { data: runtimeConfig } = useRuntimeConfig()
  const { clashInfo } = useClashInfo()

  const {
    data: proxyView,
    error: proxyViewError,
    isPending: isProxyViewPending,
    refetch: _refetchProxyView,
  } = useQuery({
    queryKey: ['getProxyView'],
    queryFn: getProxyView,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    ...TQ_MIHOMO,
  })

  const {
    data: clashConfig,
    isPending: isClashConfigPending,
    refetch: _refetchClashConfig,
  } = useQuery({
    queryKey: ['getClashConfig'],
    queryFn: getBaseConfig,
    ...TQ_MIHOMO,
  })

  const { data: ruleProviders, refetch: _refetchRuleProviders } = useQuery({
    queryKey: ['getRuleProviders'],
    queryFn: getRuleProviders,
    ...TQ_MIHOMO,
    revalidateOnMount: false,
  })

  const { data: rulesData, refetch: _refetchRules } = useQuery({
    queryKey: ['getRules'],
    queryFn: getRules,
    ...TQ_MIHOMO,
  })

  const { data: sysproxy, refetch: _refetchSysproxy } = useQuery({
    queryKey: ['getSystemProxy'],
    queryFn: getSystemProxy,
    ...TQ_DEFAULTS,
  })

  // Same key as `useSystemState`, so this is the one Run State cache entry, not a second one.
  const { data: runState, isPending: isRunningModePending } = useQuery({
    queryKey: runStateQueryKey,
    queryFn: getRuntimeState,
    ...TQ_DEFAULTS,
  })
  const runningMode = runState?.mode

  const { data: uptimeData } = useQuery({
    queryKey: ['appUptime'],
    queryFn: getAppUptime,
    ...TQ_DEFAULTS,
    refetchInterval: 3000,
    retry: 1,
  })

  const refreshProxy = useStableFn(_refetchProxyView)
  const refreshClashConfig = useStableFn(_refetchClashConfig)
  const refreshRules = useStableFn(_refetchRules)
  const refreshSysproxy = useStableFn(_refetchSysproxy)
  const refreshRuleProviders = useStableFn(_refetchRuleProviders)

  useEffect(() => {
    let lastProfileId: string | null = null
    let lastProfileUpdateTime = 0
    let lastProxyUpdateTime = 0
    const refreshThrottle = 800
    const handleProfileChanged = (newProfileId: string) => {
      const now = Date.now()
      if (
        lastProfileId === newProfileId &&
        now - lastProfileUpdateTime < refreshThrottle
      ) {
        return
      }
      lastProfileId = newProfileId
      lastProfileUpdateTime = now
      void revalidateQueries([['getProfiles']])
    }

    const handleRefreshProxy = () => {
      const now = Date.now()
      if (now - lastProxyUpdateTime <= refreshThrottle) return
      lastProxyUpdateTime = now
      refreshProxy().catch(() => {})
    }

    const handleRefreshProfiles = () => {
      void revalidateQueries([['getProfiles']])
    }

    return subscribeVergeEvents(
      {
        'profile-changed': handleProfileChanged,
        'verge://refresh-profiles': handleRefreshProfiles,
        'verge://refresh-proxy-config': handleRefreshProxy,
        'verge://latency-uptime-updated': applyLatencyUptimeSnapshot,
      },
      () => {
        void getLatencyUptimeSnapshot()
          .then(applyLatencyUptimeSnapshot)
          .catch((error) => {
            console.warn('[AppDataProvider] 获取延迟与 Uptime 快照失败:', error)
          })
      },
    )
  }, [applyLatencyUptimeSnapshot, refreshProxy])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshProxy(),
      refreshClashConfig(),
      refreshRules(),
      refreshSysproxy(),
      refreshRuleProviders(),
    ])
  }, [
    refreshProxy,
    refreshClashConfig,
    refreshRules,
    refreshSysproxy,
    refreshRuleProviders,
  ])

  const proxiesValue = useMemo(
    () => ({
      proxyView,
      isProxyViewPending,
      isProxyViewError: Boolean(proxyViewError),
    }),
    [proxyView, isProxyViewPending, proxyViewError],
  )

  const rulesValue = useMemo(
    () => ({
      rules: rulesData?.rules ?? [],
      ruleProviders: ruleProviders?.providers || {},
    }),
    [rulesData, ruleProviders],
  )

  const clashConfigValue = useMemo(
    () => ({
      clashConfig,
      isClashConfigPending,
    }),
    [clashConfig, isClashConfigPending],
  )

  // Resolved from local sources rather than via useDisplayedMixedPort: that hook reads the
  // ClashConfig context, and this component is the one providing it.
  const displayedMixedPort = resolveDisplayedMixedPort({
    live: clashConfig?.mixedPort,
    runtime: runtimeConfig?.['mixed-port'],
    selected: verge?.verge_mixed_port,
    merge: clashInfo?.mixed_port,
  })

  const systemValue = useMemo(() => {
    const calculateSystemProxyAddress = () => {
      if (!verge) return '-'

      const isPacMode = verge.proxy_auto_config ?? false

      if (isPacMode) {
        // PAC模式：显示我们期望设置的代理地址
        const proxyHost = verge.proxy_host || '127.0.0.1'
        return `${proxyHost}:${displayedMixedPort}`
      } else {
        // HTTP代理模式：优先使用系统地址，但如果格式不正确则使用期望地址
        const systemServer = sysproxy?.server
        if (
          systemServer &&
          systemServer !== '-' &&
          !systemServer.startsWith(':')
        ) {
          return systemServer
        } else {
          // 系统地址无效，返回期望的代理地址
          const proxyHost = verge.proxy_host || '127.0.0.1'
          return `${proxyHost}:${displayedMixedPort}`
        }
      }
    }

    return {
      sysproxy,
      runningMode,
      isRunningModePending,
      systemProxyAddress: calculateSystemProxyAddress(),
    }
  }, [sysproxy, runningMode, isRunningModePending, verge, displayedMixedPort])

  const uptimeValue = useMemo(() => ({ uptime: uptimeData || 0 }), [uptimeData])

  const latencyUptimeValue = useMemo(() => {
    const nodesByKey = new Map<string, ILatencyUptimeNode>()
    const nodesByName = new Map<string, ILatencyUptimeNode | null>()
    latencyUptime.nodes.forEach((node) => {
      nodesByKey.set(latencyUptimeNodeKey(node.name, node.providerName), node)
      nodesByName.set(node.name, nodesByName.has(node.name) ? null : node)
    })
    return {
      enabled: latencyUptime.enabled,
      profileId: latencyUptime.profileId,
      nodesByKey,
      nodesByName,
    }
  }, [latencyUptime])

  const coreDataStatusValue = useMemo(
    () => ({
      isCoreDataPending: isProxyViewPending || isClashConfigPending,
    }),
    [isProxyViewPending, isClashConfigPending],
  )

  const refreshersValue = useMemo(
    () => ({
      refreshProxy,
      refreshClashConfig,
      refreshRules,
      refreshSysproxy,
      refreshRuleProviders,
      refreshAll,
    }),
    [
      refreshProxy,
      refreshClashConfig,
      refreshRules,
      refreshSysproxy,
      refreshRuleProviders,
      refreshAll,
    ],
  )

  return (
    <ProxiesContext value={proxiesValue}>
      <RulesContext value={rulesValue}>
        <ClashConfigContext value={clashConfigValue}>
          <SystemContext value={systemValue}>
            <UptimeContext value={uptimeValue}>
              <LatencyUptimeContext value={latencyUptimeValue}>
                <CoreDataStatusContext value={coreDataStatusValue}>
                  <RefreshersContext value={refreshersValue}>
                    {children}
                  </RefreshersContext>
                </CoreDataStatusContext>
              </LatencyUptimeContext>
            </UptimeContext>
          </SystemContext>
        </ClashConfigContext>
      </RulesContext>
    </ProxiesContext>
  )
}
