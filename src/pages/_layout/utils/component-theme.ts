import { alpha, type Components, type Theme } from '@mui/material'

import { listItemTransition } from '@/components/base/list-row'

export const componentTheme = (theme: Theme): Components<Theme> => {
  const { palette } = theme
  const focusRing = `0 0 0 3px ${alpha(palette.primary.main, 0.24)}`
  const border = `1px solid ${palette.divider}`

  return {
    MuiListItem: {
      styleOverrides: { root: { transition: listItemTransition } },
    },
    MuiListItemButton: {
      styleOverrides: { root: { transition: listItemTransition } },
    },
    MuiTableRow: {
      styleOverrides: { root: { transition: listItemTransition } },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: `2px solid ${palette.primary.main}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, size: 'small' },
      styleOverrides: {
        root: {
          minHeight: 36,
          height: 36,
          boxSizing: 'border-box',
          padding: '5px 12px',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'none',
          whiteSpace: 'nowrap',
        },
        outlined: { borderColor: palette.divider },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          aspectRatio: '1 / 1',
          width: 36,
          height: 36,
          boxSizing: 'border-box',
          borderRadius: 6,
          padding: 7,
          '&.MuiIconButton-colorDefault': { color: palette.text.secondary },
          '& .MuiSvgIcon-root': { fontSize: 20 },
        },
        sizeSmall: { padding: 6, '& .MuiSvgIcon-root': { fontSize: 18 } },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: palette.background.paper,
          transition: 'box-shadow 150ms ease, border-color 150ms ease',
          '&.Mui-focused': { boxShadow: focusRing },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1 },
        },
        notchedOutline: { borderColor: palette.divider },
        input: { padding: '9px 12px' },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: { root: { minWidth: 0 } },
    },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiCheckbox: {
      defaultProps: { size: 'small' },
      styleOverrides: { root: { padding: 7 } },
    },
    MuiRadio: { defaultProps: { size: 'small' } },
    MuiChip: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { borderRadius: 5, fontWeight: 500, height: 24 },
        label: { paddingLeft: 7, paddingRight: 7 },
      },
    },
    MuiToggleButtonGroup: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          padding: 3,
          backgroundColor: palette.action.hover,
          borderRadius: 7,
        },
        grouped: { border: 0, borderRadius: '5px !important', margin: 0 },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          padding: '4px 12px',
          fontSize: 14,
          textTransform: 'none',
          color: palette.text.secondary,
          '&.Mui-selected': {
            backgroundColor: palette.background.paper,
            color: palette.text.primary,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            '&:hover': { backgroundColor: palette.background.paper },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: { root: { minHeight: 42 }, indicator: { height: 2 } },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 42,
          textTransform: 'none',
          fontSize: 14,
          fontWeight: 500,
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: palette.divider } } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border,
          borderRadius: 8,
          backgroundColor: alpha(
            palette.mode === 'light'
              ? palette.background.default
              : palette.background.paper,
            0.7,
          ),
          backdropFilter: 'blur(12px) saturate(200%)',
          WebkitBackdropFilter: 'blur(12px) saturate(200%)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
        },
        list: { padding: 5 },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          border,
          borderRadius: 8,
          '&:not(.MuiMenu-paper)': {
            backgroundColor:
              palette.mode === 'light' ? '#ffffff' : palette.background.paper,
          },
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
          backgroundImage: 'none',
        },
      },
    },
    MuiPopper: {
      styleOverrides: {
        root: {
          '& > .MuiPaper-root': {
            border,
            borderRadius: 8,
            boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: 4,
          transition: listItemTransition,
        },
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: false, placement: 'top' },
      styleOverrides: {
        tooltip: {
          fontSize: 12,
          borderRadius: 5,
          padding: '6px 9px',
          color: palette.text.primary,
          border,
          backgroundColor: alpha(
            palette.mode === 'light'
              ? palette.background.default
              : palette.background.paper,
            0.7,
          ),
          backdropFilter: 'blur(2px) saturate(200%)',
          WebkitBackdropFilter: 'blur(2px) saturate(200%)',
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.14)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border,
          borderRadius: 8,
          backgroundColor:
            palette.mode === 'light' ? '#ffffff' : palette.background.paper,
          backgroundImage: 'none',
          boxShadow: '0 20px 64px rgba(0, 0, 0, 0.2)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { padding: '20px 24px 16px', fontSize: 18, fontWeight: 600 },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '20px 24px 24px',
          '.MuiDialogTitle-root + &': { paddingTop: 20 },
          '@media (max-width: 600px)': {
            padding: 16,
            '.MuiDialogTitle-root + &': { paddingTop: 16 },
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '12px 24px', gap: 4 },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.32)',
          '&.MuiBackdrop-invisible': { backgroundColor: 'transparent' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: border, fontSize: 14, padding: '10px 14px' },
        head: {
          color: palette.text.secondary,
          fontWeight: 500,
          backgroundColor: palette.background.default,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: 16 },
        secondary: { fontSize: 14 },
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 32 } } },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 6, fontSize: 14 },
        icon: { fontSize: 20 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 3, height: 3 } },
    },
    MuiSkeleton: { styleOverrides: { root: { borderRadius: 6 } } },
  }
}
