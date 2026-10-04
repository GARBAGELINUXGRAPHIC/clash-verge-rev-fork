import {
  DeleteOutlineRounded,
  EditOutlined,
  LanguageRounded,
  RefreshRounded,
} from '@mui/icons-material'
import {
  Box,
  ListItemIcon,
  MenuItem,
  Menu,
  Tooltip,
  Typography,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseLoading } from '@/components/base'
import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import { useIconCache } from '@/hooks/use-icon-cache'
import { cmdTestDelay } from '@/services/cmds'
import delayManager from '@/services/delay'
import { subscribeVergeEvents } from '@/services/events'
import { showNotice } from '@/services/notice-service'

import { TestBox } from './test-box'

interface Props {
  itemData: IVergeTestItem
  onEdit: () => void
  onDelete: (uid: string) => void
}

export const TestItem = ({ itemData, onEdit, onDelete: removeTest }: Props) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<any>(null)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [delay, setDelay] = useState(-1)
  const { uid, name, icon, url } = itemData
  const iconCachePath = useIconCache({ icon, cacheKey: uid })

  const onDelay = useCallback(async () => {
    setDelay(-2)
    const result = await cmdTestDelay(url)
    setDelay(result)
  }, [url])

  const onEditTest = () => {
    setAnchorEl(null)
    onEdit()
  }

  const onDelete = useLockFn(async () => {
    setAnchorEl(null)
    try {
      removeTest(uid)
    } catch (err: any) {
      showNotice.error(err)
    }
  })

  const menu = [
    {
      label: t('shared.actions.edit'),
      handler: onEditTest,
      icon: EditOutlined,
      destructive: false,
    },
    {
      label: t('shared.actions.delete'),
      handler: onDelete,
      icon: DeleteOutlineRounded,
      destructive: true,
    },
  ]

  useEffect(
    () => subscribeVergeEvents({ 'verge://test-all': () => onDelay() }),
    [url, onDelay],
  )

  return (
    <Box sx={{ minWidth: 0 }}>
      <TestBox
        onContextMenu={(event) => {
          const { clientX, clientY } = event
          setPosition({ top: clientY, left: clientX })
          setAnchorEl(event.currentTarget)
          event.preventDefault()
        }}
      >
        <Box
          data-sortable-handle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'move',
            minWidth: 0,
            height: 28,
          }}
        >
          {icon && icon.trim() !== '' ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                width: 28,
                height: 28,
                '& img': { maxWidth: '100%', objectFit: 'contain' },
              }}
            >
              {icon.trim().startsWith('http') && (
                <img
                  alt={name}
                  src={iconCachePath === '' ? icon : iconCachePath}
                  height="28px"
                />
              )}
              {icon.trim().startsWith('data') && (
                <img alt={name} src={icon} height="28px" />
              )}
              {icon.trim().startsWith('<svg') && (
                <img
                  alt={name}
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(icon)}`}
                  height="28px"
                />
              )}
            </Box>
          ) : (
            <LanguageRounded
              sx={{
                width: 28,
                height: 28,
                color: 'text.secondary',
                flexShrink: 0,
              }}
            />
          )}

          <Typography
            variant="body2"
            noWrap
            title={name}
            sx={{ fontWeight: 600, minWidth: 0 }}
          >
            {name}
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 1.25,
            height: 28,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color:
                delay >= 0
                  ? delayManager.formatDelayColor(delay)
                  : 'text.secondary',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {delay >= 0 ? delayManager.formatDelay(delay) : '--'}
          </Typography>
          <Tooltip title={t('tests.components.item.actions.test')}>
            <span>
              <IconButton
                size="small"
                disabled={delay === -2}
                aria-label={`${t('tests.components.item.actions.test')} ${name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  void onDelay()
                }}
                sx={{ width: 28, height: 28 }}
              >
                {delay === -2 ? (
                  <BaseLoading />
                ) : (
                  <RefreshRounded sx={{ fontSize: 17 }} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </TestBox>

      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorPosition={position}
        anchorReference="anchorPosition"
        transitionDuration={225}
        slotProps={{ list: { sx: { py: 0.5 } } }}
        onContextMenu={(e) => {
          setAnchorEl(null)
          e.preventDefault()
        }}
      >
        {menu.map((item) => (
          <MenuItem
            key={item.label}
            onClick={item.handler}
            sx={{
              minWidth: 160,
              color: item.destructive ? 'error.main' : 'text.primary',
              ...(item.destructive
                ? {
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    mt: 0.5,
                    pt: 1,
                  }
                : {}),
            }}
            dense
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <item.icon fontSize="small" />
            </ListItemIcon>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
