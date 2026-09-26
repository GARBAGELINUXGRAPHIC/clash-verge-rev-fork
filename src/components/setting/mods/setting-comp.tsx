import { ChevronRightRounded } from '@mui/icons-material'
import {
  Box,
  List,
  type ListProps,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  styled,
} from '@mui/material'
import CircularProgress from '@mui/material/CircularProgress'
import React, { ReactNode, useState } from 'react'

import isAsyncFunction from '@/utils/is-async-function'

const FormList = styled(List)(({ theme }) => ({
  padding: 0,
  minWidth: 0,
  '& > .MuiListItem-root': {
    minHeight: 52,
    padding: '10px 0',
    columnGap: 12,
    borderBottom: `1px solid ${theme.palette.divider}`,
    '&:last-child': { borderBottom: 0 },
    '& > .MuiListItemText-root': { minWidth: 0, margin: 0 },
    '& .MuiListItemText-primary': { overflowWrap: 'anywhere' },
    '& .MuiListItemText-secondary': {
      marginTop: 4,
      overflowWrap: 'anywhere',
    },
    '& .MuiInputBase-root': { maxWidth: '100%' },
    [theme.breakpoints.down('sm')]: {
      '&:has(> .MuiFormControl-root), &:has(> .MuiAutocomplete-root)': {
        flexWrap: 'wrap',
        rowGap: 8,
        '& > .MuiListItemText-root': { flexBasis: '100%' },
        '& > .MuiFormControl-root, & > .MuiAutocomplete-root': {
          width: '100%',
          marginLeft: 0,
        },
      },
    },
  },
}))

export const SettingForm = (props: ListProps) => <FormList {...props} />

interface ItemProps {
  label: ReactNode
  extra?: ReactNode
  children?: ReactNode
  secondary?: ReactNode
  onClick?: () => void | Promise<any>
}

export const SettingItem: React.FC<ItemProps> = ({
  label,
  extra,
  children,
  secondary,
  onClick,
}) => {
  const clickable = !!onClick

  const primary = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: 14,
        gap: 0.5,
        overflowWrap: 'anywhere',
      }}
    >
      <span>{label}</span>
      {extra ? extra : null}
    </Box>
  )

  const [isLoading, setIsLoading] = useState(false)
  const handleClick = () => {
    if (onClick) {
      if (isAsyncFunction(onClick)) {
        setIsLoading(true)
        onClick()!.finally(() => setIsLoading(false))
      } else {
        onClick()
      }
    }
  }

  return clickable ? (
    <ListItem disablePadding sx={{ borderBottom: 1, borderColor: 'divider' }}>
      <ListItemButton
        onClick={handleClick}
        disabled={isLoading}
        sx={{ minHeight: 52, px: 0.5, gap: 2 }}
      >
        <ListItemText primary={primary} secondary={secondary} />
        {isLoading ? (
          <CircularProgress color="inherit" size={20} />
        ) : (
          <ChevronRightRounded sx={{ fontSize: 18, color: 'text.secondary' }} />
        )}
      </ListItemButton>
    </ListItem>
  ) : (
    <ListItem
      sx={{
        minHeight: 52,
        py: 1,
        px: 0.5,
        gap: 2,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <ListItemText
        primary={primary}
        secondary={secondary}
        sx={{ minWidth: 0 }}
      />
      {children}
    </ListItem>
  )
}

export const SettingList: React.FC<{
  title: string
  children: ReactNode
}> = ({ title, children }) => (
  <List sx={{ py: 0, '& > .MuiListItem-root:last-child': { borderBottom: 0 } }}>
    <ListSubheader
      sx={[
        {
          background: 'transparent',
          fontSize: 16,
          fontWeight: 600,
          px: 0.5,
          py: 1,
          lineHeight: 2,
        },
        ({ palette }) => {
          return {
            color: palette.text.primary,
          }
        },
      ]}
      disableSticky
    >
      {title}
    </ListSubheader>

    {children}
  </List>
)
