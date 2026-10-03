import {
  ExpandLessRounded,
  ExpandMoreRounded,
  InboxRounded,
} from '@mui/icons-material'
import {
  alpha,
  Box,
  ListItemText,
  ListItemButton,
  Typography,
  styled,
} from '@mui/material'
import { memo, useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useIconCache } from '@/hooks/use-icon-cache'
import { useVerge } from '@/hooks/use-verge'
import type { ResolvedProxyMember } from '@/types/proxy-view'

import { ProxyGroupHeaderBlock } from './proxy-group-header-block'
import { ProxyGroupTools } from './proxy-group-tools'
import { ProxyHead } from './proxy-head'
import { ProxyItem } from './proxy-item'
import { ProxyItemMini } from './proxy-item-mini'
import type { HeadState } from './use-head-state'
import type { IRenderItem } from './use-render-list'

interface RenderProps {
  item: IRenderItem
  stickyed?: boolean
  isChainMode?: boolean
  onLocation: (group: IRenderItem['group']) => void
  onCheckAll: (groupName: string) => void
  onHeadState: (groupName: string, patch: Partial<HeadState>) => void
  onChangeProxy: (
    group: IRenderItem['group'],
    member: ResolvedProxyMember,
  ) => void
  onGroupToggle?: (group: IRenderItem['group']) => void
}

export const ProxyRender = memo(function ProxyRender(props: RenderProps) {
  const { t } = useTranslation()
  const {
    item,
    onLocation,
    onCheckAll,
    onHeadState,
    onChangeProxy,
    onGroupToggle,
    isChainMode: _ = false,
  } = props
  const { type, group, headState, member, memberCol } = item
  const { verge } = useVerge()
  const enable_group_icon = verge?.enable_group_icon ?? true
  const toolsOnLeft = verge?.proxy_group_tools_position === 'left'
  const headerId = useId()
  const iconCachePath = useIconCache({
    icon: group.icon,
    cacheKey: group.name.replaceAll(' ', ''),
    enabled: enable_group_icon,
  })

  const showType = headState?.showType
  const memberColItemsMemo = useMemo(() => {
    if (type !== 4 || !memberCol) {
      return null
    }

    return memberCol.map((occurrence) => (
      <ProxyItemMini
        key={`${item.key}-${occurrence.memberIndex}`}
        group={group}
        member={occurrence.member}
        selected={group.now === occurrence.member.ref.name}
        showType={showType}
        onClick={(nextMember) => onChangeProxy(group, nextMember)}
      />
    ))
  }, [type, memberCol, item.key, group, showType, onChangeProxy])

  if (type === 0) {
    const nameBlock = (
      <ProxyGroupHeaderBlock
        key="name"
        group={headerId}
        block="name"
        sx={{ gridArea: 'name', mr: toolsOnLeft ? 1 : 0 }}
      >
        {enable_group_icon && group.icon?.trim().startsWith('http') && (
          <img
            src={iconCachePath === '' ? group.icon : iconCachePath}
            alt={group.name}
            width="32px"
            style={{ marginRight: '12px', borderRadius: '6px' }}
          />
        )}
        {enable_group_icon && group.icon?.trim().startsWith('data') && (
          <img
            src={group.icon}
            alt={group.name}
            width="32px"
            style={{ marginRight: '12px', borderRadius: '6px' }}
          />
        )}
        {enable_group_icon && group.icon?.trim().startsWith('<svg') && (
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(group.icon)}`}
            alt={group.name}
            width="32px"
          />
        )}
        <ListItemText
          sx={{ flex: '0 1 auto', minWidth: 0 }}
          primary={<StyledPrimary>{group.name}</StyledPrimary>}
          secondary={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                pt: '2px',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              <Box
                component="span"
                sx={{
                  marginTop: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <StyledTypeBox>{group.type}</StyledTypeBox>
                <StyledSubtitle sx={{ color: 'text.secondary' }}>
                  {group.now}
                </StyledSubtitle>
              </Box>
            </Box>
          }
          slotProps={{
            secondary: {
              component: 'div',
              sx: {
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
              },
            },
          }}
        />
      </ProxyGroupHeaderBlock>
    )

    const toolsBlock = (
      <ProxyGroupHeaderBlock
        key="tools"
        group={headerId}
        block="tools"
        sx={{
          gridArea: 'tools',
          flex: '1 1 auto',
          justifyContent: toolsOnLeft ? 'start' : 'end',
          mr: toolsOnLeft ? 2 : 0,
          '@container proxy-header (max-width: 560px)': { mr: 0 },
          '@supports not (container-type: inline-size)': { mr: 0 },
        }}
      >
        <ProxyGroupTools
          side={toolsOnLeft ? 'left' : 'right'}
          url={group.testUrl}
          groupName={group.name}
          headState={headState!}
          onLocation={() => onLocation(group)}
          onCheckDelay={() => onCheckAll(group.name)}
          onHeadState={(p) => onHeadState(group.name, p)}
        />
      </ProxyGroupHeaderBlock>
    )

    return (
      <div style={{ padding: '6px 20px' }}>
        <ListItemButton
          dense
          sx={{
            px: 2.5,
            py: 1.25,
            backgroundColor: 'background.paper',
            height: '100%',
            borderRadius: '8px',
            transition: 'box-shadow .3s cubic-bezier(0,0,.5,1)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '2px 4px 12px #00000040'
                : '2px 4px 12px #00000014',
            '&:hover, &:focus-visible': {
              backgroundColor: 'background.paper',
              boxShadow: (theme) =>
                theme.palette.mode === 'dark'
                  ? '2px 4px 16px #00000066'
                  : '2px 4px 16px #00000029',
            },
            containerType: 'inline-size',
            containerName: 'proxy-header',
          }}
          onClick={() => {
            if (headState?.open) {
              onGroupToggle?.(group)
            }
            onHeadState?.(group.name, { open: !headState?.open })
          }}
        >
          <Box sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'grid',
                alignItems: 'center',
                width: '100%',
                gridTemplateColumns: toolsOnLeft
                  ? 'minmax(250px, auto) minmax(0, 1fr) 24px'
                  : 'minmax(0, 1fr) minmax(250px, auto) 24px',
                gridTemplateAreas: toolsOnLeft
                  ? '"tools name toggle"'
                  : '"name tools toggle"',
                '@container proxy-header (max-width: 560px)': {
                  gridTemplateColumns: 'minmax(0, 1fr) 24px',
                  gridTemplateAreas: '"name toggle" "tools tools"',
                  rowGap: 0.75,
                },
                '@supports not (container-type: inline-size)': {
                  gridTemplateColumns: 'minmax(0, 1fr) 24px',
                  gridTemplateAreas: '"name toggle" "tools tools"',
                  rowGap: 0.75,
                },
              }}
            >
              {toolsOnLeft ? toolsBlock : nameBlock}
              {toolsOnLeft ? nameBlock : toolsBlock}
              {headState?.open ? (
                <ExpandLessRounded sx={{ gridArea: 'toggle' }} />
              ) : (
                <ExpandMoreRounded sx={{ gridArea: 'toggle' }} />
              )}
            </Box>
          </Box>
        </ListItemButton>
      </div>
    )
  }

  if (type === 1) {
    return (
      <ProxyHead
        sx={{ px: 2.5, mt: 0.5, mb: 1 }}
        url={group.testUrl}
        groupName={group.name}
        headState={headState!}
        onLocation={() => onLocation(group)}
        onCheckDelay={() => onCheckAll(group.name)}
        onHeadState={(p) => onHeadState(group.name, p)}
      />
    )
  }

  if (type === 2) {
    return (
      <ProxyItem
        group={group}
        member={member!.member}
        selected={group.now === member?.member.ref.name}
        showType={headState?.showType}
        sx={{ py: '5px', px: 2.5 }}
        onClick={(nextMember) => onChangeProxy(group, nextMember)}
      />
    )
  }

  if (type === 3) {
    return (
      <Box
        sx={{
          py: 2,
          pl: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <InboxRounded sx={{ fontSize: '2.5em', color: 'inherit' }} />
        <Typography sx={{ color: 'inherit' }}>
          {t('proxies.page.empty.noProxies')}
        </Typography>
      </Box>
    )
  }

  if (type === 4) {
    return (
      <Box
        sx={{
          display: 'grid',
          py: '5px',
          columnGap: '8px',
          px: 2.5,
          gridTemplateColumns: `repeat(${item.col! || 2}, minmax(0, 1fr))`,
        }}
      >
        {memberColItemsMemo}
      </Box>
    )
  }

  return null
})

const StyledPrimary = styled('span')`
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`
const StyledSubtitle = styled('span')`
  font-size: 13px;
  overflow: hidden;
  color: text.secondary;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StyledTypeBox = styled(Box)(({ theme }) => ({
  display: 'inline-block',
  border: '1px solid #ccc',
  borderColor: alpha(theme.palette.primary.main, 0.5),
  color: alpha(theme.palette.primary.main, 0.8),
  borderRadius: 4,
  fontSize: 10,
  padding: '0 4px',
  lineHeight: 1.5,
  marginRight: '8px',
}))
