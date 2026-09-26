import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useMatch, useNavigate, useResolvedPath } from 'react-router'

import type { SortableItemRenderProps } from '@/components/base/sortable-item'
import { useVerge } from '@/hooks/use-verge'

interface Props {
  to: string
  children: string
  icon: ReactNode[]
  sortable?: SortableItemRenderProps
}
export const LayoutItem = (props: Props) => {
  const { to, children, icon, sortable } = props
  const { verge } = useVerge()
  const { menu_icon } = verge ?? {}
  const navCollapsed = verge?.collapse_navbar ?? false
  const narrow = useMediaQuery('(max-width: 700px)')
  const resolved = useResolvedPath(to)
  const match = useMatch({ path: resolved.pathname, end: true })
  const navigate = useNavigate()

  const effectiveMenuIcon =
    (navCollapsed || narrow) && menu_icon === 'disable'
      ? 'monochrome'
      : menu_icon

  return (
    <ListItem
      ref={sortable?.ref}
      style={sortable?.style}
      sx={{ p: 0, mb: 0.5 }}
    >
      <ListItemButton
        ref={sortable?.handleRef}
        selected={!!match}
        sx={{
          borderRadius: '6px',
          minHeight: 38,
          px: 1.25,
          py: 0.75,
          color: 'text.secondary',
          gap: 1.25,
          '& .MuiListItemText-primary': {
            fontWeight: match ? 600 : 400,
            fontSize: 16,
          },
          '&.Mui-selected, &.Mui-selected:hover': {
            bgcolor: 'action.selected',
            color: 'primary.main',
          },
        }}
        title={children}
        aria-label={children}
        aria-current={match ? 'page' : undefined}
        onClick={() => navigate(to)}
      >
        {(effectiveMenuIcon === 'monochrome' || !effectiveMenuIcon) && (
          <ListItemIcon
            sx={{
              color: 'inherit',
              minWidth: 20,
              '& svg': { width: 20, height: 20 },
              cursor: 'inherit',
            }}
          >
            {icon[0]}
          </ListItemIcon>
        )}
        {effectiveMenuIcon === 'colorful' && (
          <ListItemIcon
            sx={{
              cursor: 'inherit',
              minWidth: 20,
              '& svg': { width: 20, height: 20 },
            }}
          >
            {icon[1]}
          </ListItemIcon>
        )}
        <ListItemText
          sx={{
            m: 0,
            minWidth: 0,
            '& span': { overflowWrap: 'anywhere' },
          }}
          primary={children}
        />
      </ListItemButton>
    </ListItem>
  )
}
