import { DragDropProvider, KeyboardSensor, PointerSensor } from '@dnd-kit/react'
import {
  ArrowBackIosNewRounded,
  LockOpenRounded,
  LockOutlined,
  RestoreRounded,
} from '@mui/icons-material'
import {
  Box,
  alpha,
  Button,
  Portal,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  SvgIcon,
  Tooltip,
  Typography,
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import iconDark from '@/assets/image/icon_dark.svg?react'
import iconLight from '@/assets/image/icon_light.svg?react'
import { useVerge } from '@/hooks/use-verge'
import { useNavMenuOrder } from '@/pages/_layout/hooks'
import { navItems } from '@/pages/_navigation'
import { navigationItems } from '@/pages/_navigation-meta'

import { SortableItem } from '../base'

import { LayoutItem } from './layout-item'
import { LayoutTraffic } from './layout-traffic'
import { UpdateButton } from './update-button'

type MenuContextPosition = { top: number; left: number }

interface LayoutSidebarProps {
  isDark: boolean
  isCollapsed: boolean
}

const SENSORS = [PointerSensor, KeyboardSensor]

export const LayoutSidebar = (props: LayoutSidebarProps) => {
  const { isDark, isCollapsed } = props
  const { t } = useTranslation()
  const { verge, mutateVerge, patchVerge } = useVerge()
  const [menuUnlocked, setMenuUnlocked] = useState(false)
  const [menuContextPosition, setMenuContextPosition] =
    useState<MenuContextPosition | null>(null)

  const handleMenuOrderOptimisticUpdate = useCallback(
    (order: string[]) => {
      mutateVerge(
        (prev) => (prev ? { ...prev, menu_order: order } : prev),
        false,
      )
    },
    [mutateVerge],
  )

  const handleMenuOrderPersist = useCallback(
    (order: string[]) => patchVerge({ menu_order: order }),
    [patchVerge],
  )

  const {
    menuOrder,
    navItemMap,
    handleMenuDragEnd,
    isDefaultOrder,
    resetMenuOrder,
  } = useNavMenuOrder({
    enabled: menuUnlocked,
    items: navItems,
    storedOrder: verge?.menu_order,
    onOptimisticUpdate: handleMenuOrderOptimisticUpdate,
    onPersist: handleMenuOrderPersist,
  })

  const handleMenuContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setMenuContextPosition({ top: event.clientY, left: event.clientX })
    },
    [],
  )

  const handleMenuContextClose = useCallback(() => {
    setMenuContextPosition(null)
  }, [])

  const handleResetMenuOrder = useCallback(() => {
    setMenuContextPosition(null)
    void resetMenuOrder()
  }, [resetMenuOrder])

  const handleUnlockMenu = useCallback(() => {
    setMenuUnlocked(true)
    setMenuContextPosition(null)
  }, [])

  const handleLockMenu = useCallback(() => {
    setMenuUnlocked(false)
    setMenuContextPosition(null)
  }, [])

  useEffect(() => {
    if (!menuUnlocked) return
    const content = document.querySelector<HTMLElement>(
      '.layout-content__right',
    )
    const wasInert = content?.inert ?? false
    if (content) content.inert = true
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleLockMenu()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      if (content) content.inert = wasInert
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuUnlocked, handleLockMenu])

  const handleToggleNavCollapsed = useCallback(() => {
    setMenuContextPosition(null)
    void patchVerge({ collapse_navbar: !isCollapsed })
  }, [isCollapsed, patchVerge])

  const collapseLabel = t(
    isCollapsed
      ? 'layout.components.navigation.menu.expandNavBar'
      : 'layout.components.navigation.menu.collapseNavBar',
  )

  const collapseNavItem = (
    <ListItem
      key="collapse-navigation"
      className="nav-collapse-item"
      sx={{ p: 0 }}
    >
      <Tooltip title={isCollapsed ? collapseLabel : ''} placement="right">
        <ListItemButton
          onClick={handleToggleNavCollapsed}
          aria-label={collapseLabel}
        >
          <ListItemIcon
            sx={{
              color: 'inherit',
              minWidth: 24,
              '& svg': {
                width: 24,
                height: 24,
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 220ms ease',
              },
              cursor: 'inherit',
            }}
          >
            <ArrowBackIosNewRounded />
          </ListItemIcon>
          <ListItemText
            primary={collapseLabel}
            sx={{
              m: 0,
              minWidth: 0,
              '& span': { overflowWrap: 'anywhere' },
            }}
          />
        </ListItemButton>
      </Tooltip>
    </ListItem>
  )

  const navMenuItems = menuOrder.flatMap((path, index) => {
    const item = navItemMap.get(path)
    if (!item) return []

    const navItem = (
      <SortableItem
        key={item.path}
        id={item.path}
        index={index}
        disabled={!menuUnlocked}
      >
        {(sortable) => (
          <LayoutItem to={item.path} icon={item.icon} sortable={sortable}>
            {t(item.label)}
          </LayoutItem>
        )}
      </SortableItem>
    )

    return item.path === navigationItems.settings.path
      ? [navItem, collapseNavItem]
      : [navItem]
  })

  return (
    <aside className="layout-content__left">
      {/* Logo */}
      <div className="the-logo" data-tauri-drag-region="false">
        <div data-tauri-drag-region="true" className="sidebar-brand">
          <SvgIcon
            component={isDark ? iconDark : iconLight}
            sx={{ height: 30, width: 30, flexShrink: 0 }}
            inheritViewBox
          />
          <Typography
            className="sidebar-brand-name"
            sx={{ fontSize: 16, fontWeight: 600 }}
            data-tauri-drag-region="true"
          >
            Clash Verge
          </Typography>
        </div>
        <UpdateButton className="the-newbtn" />
      </div>

      {menuUnlocked && (
        <Portal>
          <Box
            sx={(theme) => ({
              position: 'fixed',
              inset: 0,
              left: isCollapsed ? 64 : 180,
              zIndex: theme.zIndex.drawer,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.7),
              backdropFilter: 'blur(2px) saturate(160%)',
              WebkitBackdropFilter: 'blur(2px) saturate(160%)',
            })}
          >
            <Typography sx={{ fontSize: 18, fontWeight: 600 }}>
              {t('layout.components.navigation.menu.reorderMode')}
            </Typography>
            <Button variant="contained" onClick={handleLockMenu}>
              {t('layout.components.navigation.menu.done', { defaultValue: 'Done' })}
            </Button>
          </Box>
        </Portal>
      )}

      {/* Navigation menu */}
      <List className="the-menu" onContextMenu={handleMenuContextMenu}>
        <DragDropProvider sensors={SENSORS} onDragEnd={handleMenuDragEnd}>
          {navMenuItems}
        </DragDropProvider>
      </List>

      {/* Context menu */}
      <Menu
        open={Boolean(menuContextPosition)}
        onClose={handleMenuContextClose}
        anchorReference="anchorPosition"
        anchorPosition={
          menuContextPosition
            ? {
                top: menuContextPosition.top,
                left: menuContextPosition.left,
              }
            : undefined
        }
        transitionDuration={200}
        slotProps={{
          list: {
            sx: { py: 0.5 },
          },
        }}
      >
        <MenuItem onClick={handleToggleNavCollapsed} dense>
          <ListItemIcon>
            <ArrowBackIosNewRounded
              fontSize="small"
              sx={{
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </ListItemIcon>
          {isCollapsed
            ? t('layout.components.navigation.menu.expandNavBar')
            : t('layout.components.navigation.menu.collapseNavBar')}
        </MenuItem>
        <MenuItem
          onClick={menuUnlocked ? handleLockMenu : handleUnlockMenu}
          dense
        >
          <ListItemIcon>
            {menuUnlocked ? (
              <LockOutlined fontSize="small" />
            ) : (
              <LockOpenRounded fontSize="small" />
            )}
          </ListItemIcon>
          {menuUnlocked
            ? t('layout.components.navigation.menu.lock')
            : t('layout.components.navigation.menu.unlock')}
        </MenuItem>
        <MenuItem
          onClick={handleResetMenuOrder}
          dense
          disabled={isDefaultOrder}
        >
          <ListItemIcon>
            <RestoreRounded fontSize="small" />
          </ListItemIcon>
          {t('layout.components.navigation.menu.restoreDefaultOrder')}
        </MenuItem>
      </Menu>

      {/* Traffic */}
      <div className="the-traffic">
        <LayoutTraffic />
      </div>
    </aside>
  )
}
