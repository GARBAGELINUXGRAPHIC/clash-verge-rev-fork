import { CheckCircleOutlineRounded } from '@mui/icons-material'
import {
  alpha,
  Box,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
  type SxProps,
  type Theme,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { BaseLoading } from '@/components/base'
import { useProxyDelayState } from '@/hooks/use-proxy-delay-state'
import delayManager from '@/services/delay'
import {
  memberDetails,
  type ProxyGroupView,
  type ResolvedProxyMember,
} from '@/types/proxy-view'

import { ProxyProtocol } from './proxy-protocol'
import { ProxyUptime } from './proxy-uptime'

interface Props {
  group: ProxyGroupView
  member: ResolvedProxyMember
  selected: boolean
  showType?: boolean
  sx?: SxProps<Theme>
  onClick?: (member: ResolvedProxyMember) => void
}

const Widget = styled(Box)(() => ({
  padding: '3px 6px',
  fontSize: 14,
  borderRadius: '4px',
}))

const TypeBox = styled('span')(({ theme }) => ({
  display: 'inline-block',
  border: '1px solid #ccc',
  borderColor: '#bbbbbbbb',
  color: theme.palette.text.secondary,
  borderRadius: 4,
  fontSize: 10,
  marginRight: '4px',
  padding: '0 2px',
  lineHeight: 1.25,
  flexShrink: 0,
}))

export const ProxyItem = (props: Props) => {
  const { t } = useTranslation()
  const { group, member, selected, showType = true, sx, onClick } = props
  const details = memberDetails(member)
  const unresolved = member.kind === 'unresolved'
  const name = member.ref.name
  const type = unresolved ? member.ref.reason : (details?.type ?? '')
  const now = member.kind === 'group' ? member.group.now : undefined

  // -1/<=0 为不显示，-2 为 loading
  const { delayValue, isPreset, timeout, onDelay } = useProxyDelayState(
    member,
    group.name,
  )

  return (
    <ProxyProtocol member={member} contextOnly>
      {() => (
        <ListItem sx={sx}>
          <ListItemButton
            dense
            disabled={unresolved}
            selected={!unresolved && selected}
            onClick={unresolved ? undefined : () => onClick?.(member)}
            sx={[
              { borderRadius: '6px', minWidth: 0 },
              ({ palette: { primary, background, mode } }) => {
                const showDelay = delayValue > 0

                return {
                  '&:hover .the-check': {
                    display: !showDelay ? 'block' : 'none',
                  },
                  '&:hover .the-delay': {
                    display: showDelay ? 'block' : 'none',
                  },
                  '&:hover .the-icon': { display: 'none' },
                  '&.Mui-selected': {
                    borderColor: alpha(primary.main, 0.45),
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 'inherit',
                      background: `linear-gradient(to right, ${primary.main} 4px, transparent 4px)`,
                      pointerEvents: 'none',
                    },
                    bgcolor: alpha(primary.main, mode === 'dark' ? 0.16 : 0.07),
                    '&:hover': {
                      bgcolor: alpha(
                        primary.main,
                        mode === 'dark' ? 0.22 : 0.11,
                      ),
                    },
                  },
                  border: '1px solid transparent',
                  backgroundColor: background.paper,
                  boxShadow:
                    mode === 'dark'
                      ? '2px 4px 12px #00000040'
                      : '2px 4px 12px #00000014',
                  transition:
                    'transform .15s cubic-bezier(0,0,.5,1), box-shadow .3s cubic-bezier(0,0,.5,1), background-color .3s cubic-bezier(0,0,.5,1)',
                  '&:hover': {
                    transform: 'scale(1.01)',
                    boxShadow:
                      mode === 'dark'
                        ? '2px 4px 16px #00000066'
                        : '2px 4px 16px #00000029',
                  },
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                  },
                  height: showType ? 60 : 40,
                }
              },
            ]}
          >
            <ListItemText
              title={name}
              slotProps={{ secondary: { component: 'div' } }}
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                '& .MuiListItemText-secondary': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }}
              secondary={
                <>
                  <Box
                    sx={{
                      display: 'block',
                      mb: showType ? 0.5 : 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      color: 'text.primary',
                    }}
                  >
                    {name}
                    {showType && now && ` - ${now}`}
                  </Box>
                  {showType && (
                    <Box
                      component="span"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <ProxyUptime member={member} />
                      <ProxyProtocol member={member}>
                        {(props) => <TypeBox {...props}>{type}</TypeBox>}
                      </ProxyProtocol>
                      {!unresolved && details?.udp && <TypeBox>UDP</TypeBox>}
                      {!unresolved && details?.xudp && <TypeBox>XUDP</TypeBox>}
                      {!unresolved && details?.tfo && <TypeBox>TFO</TypeBox>}
                      {!unresolved && details?.mptcp && (
                        <TypeBox>MPTCP</TypeBox>
                      )}
                      {!unresolved && details?.smux && <TypeBox>SMUX</TypeBox>}
                    </Box>
                  )}
                </>
              }
            />

            <ListItemIcon
              sx={{
                justifyContent: 'flex-end',
                color: 'primary.main',
                display: isPreset ? 'none' : '',
              }}
            >
              {!unresolved && delayValue === -2 && (
                <Widget>
                  <BaseLoading />
                </Widget>
              )}

              {!unresolved && delayValue !== -2 && (
                <Widget
                  className="the-check"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void onDelay()
                  }}
                  sx={({ palette }) => ({
                    display: 'none', // hover 时显示
                    ':hover': { bgcolor: alpha(palette.primary.main, 0.15) },
                  })}
                >
                  {t('shared.actions.check')}
                </Widget>
              )}

              {!unresolved && delayValue > 0 && (
                // 显示延迟
                <Widget
                  className="the-delay"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void onDelay()
                  }}
                  sx={({ palette }) => ({
                    color: delayManager.formatDelayColor(delayValue, timeout),
                    ':hover': { bgcolor: alpha(palette.primary.main, 0.15) },
                  })}
                >
                  {delayManager.formatDelay(delayValue, timeout)}
                </Widget>
              )}

              {!unresolved &&
                delayValue !== -2 &&
                delayValue <= 0 &&
                selected && (
                  // 展示已选择的 icon
                  <CheckCircleOutlineRounded
                    className="the-icon"
                    sx={{ fontSize: 16 }}
                  />
                )}
            </ListItemIcon>
          </ListItemButton>
        </ListItem>
      )}
    </ProxyProtocol>
  )
}
