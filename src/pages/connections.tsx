import {
  DeleteForeverRounded,
  TableChartRounded,
  TableRowsRounded,
  ViewColumnRounded,
  CloseRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
} from '@mui/icons-material'
import { Box, IconButton, MenuItem, Tooltip, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { closeAllConnections } from 'tauri-plugin-mihomo-api'

import {
  BaseEmpty,
  BasePage,
  BaseSearchBox,
  BaseStyledSelect,
  type SearchState,
  VirtualList,
} from '@/components/base'
import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'
import {
  ConnectionDetail,
  ConnectionDetailRef,
} from '@/components/connection/connection-detail'
import { ConnectionRowItem } from '@/components/connection/connection-row-item'
import {
  getConnectionStartTime,
  useConnectionRowViews,
} from '@/components/connection/connection-row-view'
import { ConnectionTable } from '@/components/connection/connection-table'
import { useConnectionData } from '@/hooks/use-connection-data'
import { useConnectionSetting } from '@/hooks/use-connection-setting'
import { useTrafficData } from '@/hooks/use-traffic-data'
import { useVisibility } from '@/hooks/use-visibility'
import parseTraffic from '@/utils/parse-traffic'

type OrderFunc = (list: IConnectionsItem[]) => IConnectionsItem[]

const ORDER_OPTIONS = [
  {
    id: 'default',
    labelKey: 'connections.components.order.default',
    fn: (list: IConnectionsItem[]) =>
      list.sort(
        (a, b) => getConnectionStartTime(b) - getConnectionStartTime(a),
      ),
  },
  {
    id: 'uploadSpeed',
    labelKey: 'connections.components.order.uploadSpeed',
    fn: (list: IConnectionsItem[]) =>
      list.sort((a, b) => (b.curUpload ?? 0) - (a.curUpload ?? 0)),
  },
  {
    id: 'downloadSpeed',
    labelKey: 'connections.components.order.downloadSpeed',
    fn: (list: IConnectionsItem[]) =>
      list.sort((a, b) => (b.curDownload ?? 0) - (a.curDownload ?? 0)),
  },
] as const

type OrderKey = (typeof ORDER_OPTIONS)[number]['id']

const orderFunctionMap = ORDER_OPTIONS.reduce<Record<OrderKey, OrderFunc>>(
  (acc, option) => {
    acc[option.id] = option.fn
    return acc
  },
  {} as Record<OrderKey, OrderFunc>,
)

const EMPTY_CONNECTIONS: IConnectionsItem[] = []
const ConnectionsPage = () => {
  const { t } = useTranslation()
  const pageVisible = useVisibility()
  const [match, setMatch] = useState<(input: string) => boolean>(
    () => () => true,
  )
  const [hasSearch, setHasSearch] = useState(false)
  const [curOrderOpt, setCurOrderOpt] = useState<OrderKey>('default')
  const [connectionsType, setConnectionsType] = useState<'active' | 'closed'>(
    'active',
  )

  const {
    response: { data: connections },
    clearClosedConnections,
  } = useConnectionData({ enabled: pageVisible })
  const {
    response: { data: traffic },
  } = useTrafficData({ enabled: pageVisible })

  const [setting, setSetting] = useConnectionSetting()

  const isTableLayout = setting.layout === 'table'

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false)

  const selectedConnections =
    connectionsType === 'active'
      ? (connections?.activeConnections ?? EMPTY_CONNECTIONS)
      : (connections?.closedConnections ?? EMPTY_CONNECTIONS)

  const filterConn = useMemo(() => {
    const orderFunc = orderFunctionMap[curOrderOpt]

    if (isTableLayout && !hasSearch) return selectedConnections
    if (!hasSearch) return orderFunc([...selectedConnections])

    const matchConns = selectedConnections.filter((conn) => {
      const { host, destinationIP, process } = conn.metadata
      return (
        match(host || '') || match(destinationIP || '') || match(process || '')
      )
    })

    return orderFunc ? orderFunc(matchConns) : matchConns
  }, [selectedConnections, isTableLayout, hasSearch, match, curOrderOpt])

  const displayRows = useConnectionRowViews(
    isTableLayout ? EMPTY_CONNECTIONS : filterConn,
  )

  const detailRef = useRef<ConnectionDetailRef>(null!)

  const selectConnectionsType = useCallback(
    (type: 'active' | 'closed') => {
      if (type === connectionsType) return
      detailRef.current?.close()
      setIsColumnManagerOpen(false)
      setConnectionsType(type)
    },
    [connectionsType],
  )

  const showDetailById = useCallback(
    (id: string) => {
      const connection = filterConn.find((item) => item.id === id)
      if (connection) {
        detailRef.current?.open(connection, connectionsType === 'closed')
      }
    },
    [connectionsType, filterConn],
  )

  const onCloseAll = useLockFn(closeAllConnections)

  const handleSearch = useCallback(
    (match: (content: string) => boolean, state: SearchState) => {
      setMatch(() => match)
      setHasSearch(state.text.length > 0)
    },
    [],
  )
  const hasTableData = filterConn.length > 0

  return (
    <BasePage
      full
      title={
        <span style={{ whiteSpace: 'nowrap' }}>
          {t('connections.page.title')}
        </span>
      }
      contentStyle={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
      }}
      header={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              color: 'text.secondary',
              userSelect: 'text',
            }}
          >
            <Tooltip title={t('shared.labels.downloaded')}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ArrowDownwardRounded sx={{ fontSize: 14 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {parseTraffic(traffic?.downTotal || 0).join(' ')}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title={t('shared.labels.uploaded')}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ArrowUpwardRounded sx={{ fontSize: 14 }} />
                <Typography
                  variant="caption"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {parseTraffic(traffic?.upTotal || 0).join(' ')}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip
              title={t(
                isTableLayout
                  ? 'shared.actions.listView'
                  : 'shared.actions.tableView',
              )}
            >
              <IconButton
                aria-label={t(
                  isTableLayout
                    ? 'shared.actions.listView'
                    : 'shared.actions.tableView',
                )}
                color="inherit"
                size="small"
                onClick={() =>
                  setSetting((o) =>
                    o?.layout !== 'table'
                      ? { ...o, layout: 'table' }
                      : { ...o, layout: 'list' },
                  )
                }
              >
                {isTableLayout ? (
                  <TableRowsRounded
                    titleAccess={t('shared.actions.listView')}
                  />
                ) : (
                  <TableChartRounded
                    titleAccess={t('shared.actions.tableView')}
                  />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title={t('shared.actions.closeAll')}>
              <IconButton
                size="small"
                onClick={onCloseAll}
                aria-label={t('shared.actions.closeAll')}
              >
                <CloseRounded />
              </IconButton>
            </Tooltip>
            {connectionsType === 'closed' && filterConn.length > 0 && (
              <Tooltip title={t('shared.actions.clear')}>
                <IconButton
                  size="small"
                  onClick={() => clearClosedConnections()}
                  aria-label={t('shared.actions.clear')}
                >
                  <DeleteForeverRounded />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      }
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          flexShrink: 0,
          bgcolor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          userSelect: 'text',
        }}
      >
        <AppleSegmentedControl
          exclusive
          value={connectionsType}
          onChange={(_, next) => selectConnectionsType(next)}
          sx={{ mr: 0.5, flexShrink: 0 }}
        >
          <AppleSegment size="small" value="active">
            {t('connections.components.actions.active')}{' '}
            {connections?.activeConnections.length}
          </AppleSegment>
          <AppleSegment size="small" value="closed">
            {t('connections.components.actions.closed')}{' '}
            {connections?.closedConnections.length}
          </AppleSegment>
        </AppleSegmentedControl>
        {!isTableLayout && (
          <BaseStyledSelect
            value={curOrderOpt}
            onChange={(e) => setCurOrderOpt(e.target.value as OrderKey)}
          >
            {ORDER_OPTIONS.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                <span style={{ fontSize: 14 }}>{t(option.labelKey)}</span>
              </MenuItem>
            ))}
          </BaseStyledSelect>
        )}
        <Box
          sx={{
            flex: '1 1 180px',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            '& > *': {
              flex: 1,
            },
          }}
        >
          <BaseSearchBox onSearch={handleSearch} />
        </Box>
        {isTableLayout && hasTableData && (
          <Tooltip title={t('connections.components.columnManager.title')}>
            <IconButton
              size="small"
              aria-label={t('connections.components.columnManager.title')}
              onClick={() => setIsColumnManagerOpen(true)}
              sx={{ flex: '0 0 auto' }}
            >
              <ViewColumnRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {!hasTableData ? (
        <BaseEmpty />
      ) : isTableLayout ? (
        <ConnectionTable
          connections={filterConn}
          onShowDetail={showDetailById}
          columnManagerOpen={isColumnManagerOpen}
          onCloseColumnManager={() => setIsColumnManagerOpen(false)}
        />
      ) : (
        <VirtualList
          key={connectionsType}
          count={displayRows.length}
          estimateSize={56}
          renderItem={(i) => (
            <ConnectionRowItem
              row={displayRows[i]}
              closed={connectionsType === 'closed'}
              onShowDetail={showDetailById}
            />
          )}
          style={{
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        />
      )}
      <ConnectionDetail ref={detailRef} />
    </BasePage>
  )
}

export default ConnectionsPage
