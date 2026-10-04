import { DragDropProvider } from '@dnd-kit/react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import {
  type Key,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { AppleOption, AppleSelect } from '@/components/base/apple-select'
import { useProxiesData } from '@/providers/app-data-context'
import { updateProxyChainConfigInRuntime } from '@/services/cmds'
import {
  isInteractableMember,
  type ProxyGroupView,
  type ResolvedProxyMember,
} from '@/types/proxy-view'

import { ScrollTopButton } from '../layout/scroll-top-button'

import { ProxyChain } from './proxy-chain'
import { type ProxyChainItem, rebindProxyChainItems } from './proxy-chain-model'
import { ProxyRender } from './proxy-render'
import type { HeadState } from './use-head-state'
import {
  PROXY_GROUP_HEADER_SENSORS,
  useProxyGroupHeaderLayout,
} from './use-proxy-group-header-layout'
import type { IRenderItem } from './use-render-list'

// ---- Types ----

type VirtualListItem = {
  key: Key
  index: number
  start: number
  end: number
}

type ProxyGroupOption = ProxyGroupView

// ---- Props ----

interface ProxyGroupsChainProps {
  mode: string
  chainConfigData?: string | null
  availableGroups: any[]
  activeSelectedGroup: string | null
  showScrollTop: boolean

  // Virtual list data (from parent's virtualizer)
  parentRef: Ref<HTMLDivElement>
  totalSize: number
  virtualItems: VirtualListItem[]
  renderList: IRenderItem[]
  activeStickyIndex: number | null
  measureElement: (node: Element | null) => void

  // Shared callbacks
  onCheckAll: (groupName: string) => void
  onHeadState: (groupName: string, patch: Partial<HeadState>) => void
  onLocation: (group: any) => void
  onGroupSelect: (groupName: string) => void
  onScrollToTop: () => void
}

// ---- Sub-components ----

function ChainRuleHeader({
  title,
  selectLabel,
  groups,
  selectedGroup,
  onSelect,
}: {
  title: string
  selectLabel: string
  groups: ProxyGroupOption[]
  selectedGroup: string | null
  onSelect: (groupName: string) => void
}) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{ fontWeight: 600, fontSize: 16, flexShrink: 0 }}
      >
        {title}
      </Typography>
      <AppleSelect
        aria-label={selectLabel}
        value={selectedGroup ?? ''}
        onChange={(event) => onSelect(event.target.value)}
        sx={{ width: 200, maxWidth: '100%', minWidth: 0 }}
      >
        {groups.map((group) => (
          <AppleOption key={group.name} value={group.name}>
            {group.name}
          </AppleOption>
        ))}
      </AppleSelect>
    </Box>
  )
}

function ProxyVirtualList({
  parentRef,
  height,
  totalSize,
  virtualItems,
  renderList,
  activeStickyIndex,
  isChainMode,
  measureElement,
  onLocation,
  onCheckAll,
  onHeadState,
  onChangeProxy,
}: {
  parentRef: Ref<HTMLDivElement>
  height: string
  totalSize: number
  virtualItems: VirtualListItem[]
  renderList: IRenderItem[]
  activeStickyIndex: number | null
  isChainMode?: boolean
  measureElement: (node: Element | null) => void
  onLocation: (group: any) => void
  onCheckAll: (groupName: string) => void
  onHeadState: (groupName: string, patch: Partial<HeadState>) => void
  onChangeProxy: (group: ProxyGroupView, member: ResolvedProxyMember) => void
}) {
  const theme = useTheme()
  const stickyBackground = theme.palette.background.default

  return (
    <div ref={parentRef} style={{ height, overflow: 'auto' }}>
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={measureElement}
            style={{
              position:
                virtualItem.index === activeStickyIndex ? 'sticky' : 'absolute',
              top: 0,
              left: 0,
              zIndex: virtualItem.index === activeStickyIndex ? 5 : undefined,
              display:
                virtualItem.index === activeStickyIndex
                  ? 'flow-root'
                  : undefined,
              backgroundColor:
                virtualItem.index === activeStickyIndex
                  ? stickyBackground
                  : undefined,
              width: '100%',
              transform:
                virtualItem.index === activeStickyIndex
                  ? undefined
                  : `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProxyRender
              item={renderList[virtualItem.index]}
              onLocation={onLocation}
              onCheckAll={onCheckAll}
              onHeadState={onHeadState}
              onChangeProxy={onChangeProxy}
              isChainMode={isChainMode}
            />
          </div>
        ))}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}

// ---- Main Chain Component ----

export function ProxyGroupsChain(props: ProxyGroupsChainProps) {
  const { t } = useTranslation()
  const {
    mode,
    chainConfigData,
    availableGroups,
    activeSelectedGroup,
    showScrollTop,
    parentRef,
    totalSize,
    virtualItems,
    renderList,
    activeStickyIndex,
    measureElement,
    onCheckAll,
    onHeadState,
    onLocation,
    onGroupSelect,
    onScrollToTop,
  } = props
  const { proxyView } = useProxiesData()
  const { onDragEnd: onHeaderDragEnd } = useProxyGroupHeaderLayout()

  // Chain-specific state
  const [proxyChain, setProxyChain] = useState<ProxyChainItem[]>(() => {
    try {
      const saved = localStorage.getItem('proxy-chain-items')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore
    }
    return []
  })

  const candidateNodes = useMemo(
    () =>
      renderList.flatMap((item) => {
        const occurrences = item.memberCol ?? (item.member ? [item.member] : [])
        return occurrences.flatMap(({ member }) =>
          member.kind === 'node' ? [member.node] : [],
        )
      }),
    [renderList],
  )

  const currentProxyChain = useMemo(
    () =>
      proxyView
        ? rebindProxyChainItems(proxyChain, candidateNodes, proxyView)
        : proxyChain.map((item) => ({
            ...item,
            recordId: undefined,
            delay: undefined,
          })),
    [candidateNodes, proxyChain, proxyView],
  )

  useEffect(() => {
    if (currentProxyChain.length > 0) {
      const persistedChain = currentProxyChain.map(
        ({ id, name, type, delay }) => ({
          id,
          name,
          type,
          delay,
        }),
      )
      localStorage.setItem('proxy-chain-items', JSON.stringify(persistedChain))
    } else {
      localStorage.removeItem('proxy-chain-items')
    }
  }, [currentProxyChain])

  const [duplicateWarning, setDuplicateWarning] = useState<{
    open: boolean
    message: string
  }>({ open: false, message: '' })

  const handleGroupSelect = (groupName: string) => {
    onGroupSelect(groupName)

    if (mode === 'rule') {
      updateProxyChainConfigInRuntime(null)
      localStorage.removeItem('proxy-chain-group')
      localStorage.removeItem('proxy-chain-exit-node')
      localStorage.removeItem('proxy-chain-items')
      setProxyChain([])
    }
  }

  const handleCloseDuplicateWarning = useCallback(() => {
    setDuplicateWarning({ open: false, message: '' })
  }, [])

  const handleChangeProxy = useCallback(
    (_group: ProxyGroupView, member: ResolvedProxyMember) => {
      if (!isInteractableMember(member) || member.kind !== 'node') return
      const { node } = member
      setProxyChain((prev) => {
        const current = proxyView
          ? rebindProxyChainItems(prev, candidateNodes, proxyView)
          : prev
        if (
          current.some(
            (item) =>
              item.recordId !== undefined && item.recordId === node.recordId,
          )
        ) {
          const warningMessage = t('proxies.page.chain.duplicateNode')
          setDuplicateWarning({
            open: true,
            message: warningMessage,
          })
          return prev // 返回原来的状态，不做任何更改
        }

        // 安全获取延迟数据，如果没有延迟数据则设为 undefined
        const delay =
          node.history.length > 0
            ? node.history[node.history.length - 1].delay
            : undefined

        const chainItem: ProxyChainItem = {
          id: `${node.name}_${Date.now()}`,
          name: node.name,
          recordId: node.recordId,
          source: node.source,
          type: node.type,
          delay,
        }

        return [...current, chainItem]
      })
    },
    [candidateNodes, proxyView, t],
  )

  // Render virtual list for chain mode
  const renderProxyList = (height: string) => (
    <DragDropProvider
      sensors={PROXY_GROUP_HEADER_SENSORS}
      onDragEnd={onHeaderDragEnd}
    >
      <ProxyVirtualList
        parentRef={parentRef}
        height={height}
        totalSize={totalSize}
        virtualItems={virtualItems}
        renderList={renderList}
        activeStickyIndex={activeStickyIndex}
        isChainMode
        measureElement={measureElement}
        onLocation={onLocation}
        onCheckAll={onCheckAll}
        onHeadState={onHeadState}
        onChangeProxy={handleChangeProxy}
      />
    </DragDropProvider>
  )

  const showRuleHeader = mode === 'rule' && availableGroups.length > 0

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          height: '100%',
          minHeight: 0,
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          gridTemplateRows: {
            xs: 'minmax(0, 1fr) minmax(0, 1fr)',
            md: 'minmax(0, 1fr)',
          },
        }}
      >
        <Box sx={{ minWidth: 0, minHeight: 0, position: 'relative' }}>
          {showRuleHeader && (
            <ChainRuleHeader
              title={t('proxies.page.rules.title')}
              selectLabel={t('proxies.page.rules.select')}
              groups={availableGroups}
              selectedGroup={activeSelectedGroup}
              onSelect={handleGroupSelect}
            />
          )}

          {renderProxyList(
            showRuleHeader ? 'calc(100% - 80px)' : 'calc(100% - 14px)',
          )}
          <ScrollTopButton show={showScrollTop} onClick={onScrollToTop} />
        </Box>

        <Box
          sx={{
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <ProxyChain
            proxyChain={currentProxyChain}
            onUpdateChain={setProxyChain}
            chainConfigData={chainConfigData}
            mode={mode}
            selectedGroup={activeSelectedGroup}
          />
        </Box>
      </Box>

      <Snackbar
        open={duplicateWarning.open}
        autoHideDuration={3000}
        onClose={handleCloseDuplicateWarning}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseDuplicateWarning}
          severity="warning"
          variant="standard"
          sx={(theme) => ({
            alignItems: 'center',
            py: 0.5,
            px: 1.5,
            fontSize: 13,
            color: 'text.primary',
            bgcolor: 'background.paper',
            backgroundImage: `linear-gradient(${alpha(theme.palette.warning.main, 0.08)}, ${alpha(theme.palette.warning.main, 0.08)})`,
            border: '1px solid',
            borderColor: alpha(theme.palette.warning.main, 0.2),
            borderRadius: 2,
            boxShadow: '0 4px 16px rgb(0 0 0 / 0.08)',
            '& .MuiAlert-icon': { fontSize: 18, mr: 1, py: 0.5 },
            '& .MuiAlert-message': { py: 0.5 },
            '& .MuiAlert-action': { pt: 0, alignItems: 'center' },
          })}
        >
          {duplicateWarning.message}
        </Alert>
      </Snackbar>
    </>
  )
}
