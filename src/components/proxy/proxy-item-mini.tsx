import { CheckCircleOutlineRounded } from '@mui/icons-material'
import { alpha, Box, ListItemButton, styled, Typography } from '@mui/material'
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
  onClick?: (member: ResolvedProxyMember) => void
}

// 多列布局
export const ProxyItemMini = (props: Props) => {
  const { group, member, selected, showType = true, onClick } = props
  const details = memberDetails(member)
  const unresolved = member.kind === 'unresolved'
  const name = member.ref.name
  const type = unresolved ? member.ref.reason : (details?.type ?? '')
  const now = member.kind === 'group' ? member.group.now : undefined

  const { t } = useTranslation()

  // -1/<=0 为不显示，-2 为 loading
  const { delayValue, isPreset, timeout, onDelay } = useProxyDelayState(
    member,
    group.name,
  )

  return (
    <ProxyProtocol member={member} contextOnly>
      {() => (
        <ListItemButton
          dense
          disabled={unresolved}
          selected={!unresolved && selected}
          onClick={unresolved ? undefined : () => onClick?.(member)}
          sx={[
            {
              height: 56,
              borderRadius: '6px',
              minWidth: 0,
              pl: 1.5,
              pr: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
            },
            ({ palette: { primary, background, divider } }) => {
              const showDelay = delayValue > 0

              return {
                '&:hover .the-check': {
                  display: !showDelay ? 'block' : 'none',
                },
                '&:hover .the-delay': { display: showDelay ? 'block' : 'none' },
                '&:hover .the-icon': { display: 'none' },
                '& .the-pin, & .the-unpin': {
                  position: 'absolute',
                  fontSize: '12px',
                  top: '-5px',
                  right: '-5px',
                },
                '& .the-unpin': { filter: 'grayscale(1)' },
                '&.Mui-selected': {
                  borderColor: alpha(primary.main, 0.45),
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: `linear-gradient(to right, ${primary.main} 3px, transparent 3px)`,
                    pointerEvents: 'none',
                  },
                  bgcolor: alpha(primary.main, 0.07),
                  '&:hover': { bgcolor: alpha(primary.main, 0.11) },
                },
                border: `1px solid ${divider}`,
                backgroundColor: background.paper,
              }
            },
          ]}
        >
          <Box
            title={`${name}\n${now ?? ''}`}
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}
          >
            <Typography
              variant="body2"
              component="div"
              color="text.primary"
              sx={{
                display: 'block',
                textOverflow: 'ellipsis',
                wordBreak: 'break-all',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
              {showType && now && ` - ${now}`}
            </Typography>

            {showType && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  flex: 'none',
                  marginTop: '4px',
                }}
              >
                <ProxyUptime member={member} />
                <ProxyProtocol member={member}>
                  {(props) => (
                    <TypeBox {...props} color="text.secondary" component="span">
                      {type}
                    </TypeBox>
                  )}
                </ProxyProtocol>
                {!unresolved && details?.udp && (
                  <TypeBox color="text.secondary" component="span">
                    UDP
                  </TypeBox>
                )}
                {!unresolved && details?.xudp && (
                  <TypeBox color="text.secondary" component="span">
                    XUDP
                  </TypeBox>
                )}
                {!unresolved && details?.tfo && (
                  <TypeBox color="text.secondary" component="span">
                    TFO
                  </TypeBox>
                )}
                {!unresolved && details?.mptcp && (
                  <TypeBox color="text.secondary" component="span">
                    MPTCP
                  </TypeBox>
                )}
                {!unresolved && details?.smux && (
                  <TypeBox color="text.secondary" component="span">
                    SMUX
                  </TypeBox>
                )}
              </Box>
            )}
          </Box>
          <Box
            sx={{
              ml: 0.5,
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

            {!unresolved && delayValue >= 0 && (
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
              type !== 'Direct' &&
              delayValue !== -2 &&
              delayValue < 0 &&
              selected && (
                // 展示已选择的 icon
                <CheckCircleOutlineRounded
                  className="the-icon"
                  sx={{ fontSize: 16, mr: 0.5, display: 'block' }}
                />
              )}
          </Box>
          {!unresolved && group.fixed && group.fixed === name && (
            // 展示 fixed 状态
            <span
              className={name === group.now ? 'the-pin' : 'the-unpin'}
              title={
                group.type === 'URLTest'
                  ? t('proxies.page.labels.delayCheckReset')
                  : ''
              }
            >
              📌
            </span>
          )}
        </ListItemButton>
      )}
    </ProxyProtocol>
  )
}

const Widget = styled(Box)(({ theme: { typography } }) => ({
  padding: '2px 4px',
  fontSize: 14,
  fontFamily: typography.fontFamily,
  borderRadius: '4px',
}))

const TypeBox = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'component',
})<{ component?: React.ElementType }>(({ theme }) => ({
  display: 'inline-block',
  border: '1px solid #ccc',
  borderColor: theme.palette.divider,
  color: theme.palette.text.secondary,
  borderRadius: 4,
  fontSize: 10,
  fontFamily: theme.typography.fontFamily,
  marginRight: '4px',
  marginTop: 'auto',
  padding: '0 4px',
  lineHeight: 1.5,
  flexShrink: 0,
}))
