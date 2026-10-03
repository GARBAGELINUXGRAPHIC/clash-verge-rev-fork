import { alpha, ButtonBase, styled } from '@mui/material'

export const ProfileBox = styled(ButtonBase)<{ component?: 'div' }>(
  ({ theme, 'aria-selected': selected }) => {
    const { primary, text, background } = theme.palette

    return {
      position: 'relative',
      display: 'block',
      cursor: 'pointer',
      textAlign: 'left',
      padding: '14px 16px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      backgroundColor: selected ? alpha(primary.main, 0.07) : background.paper,
      border: `1px solid ${selected ? alpha(primary.main, 0.45) : 'transparent'}`,
      '&::before': selected
        ? {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: `linear-gradient(to right, ${primary.main} 4px, transparent 4px)`,
            pointerEvents: 'none',
          }
        : undefined,
      borderRadius: '8px',
      color: text.secondary,
      transition: 'border-color 160ms ease, background-color 160ms ease',
      '&:hover': {
        backgroundColor: alpha(primary.main, selected ? 0.11 : 0.025),
      },
      '& h2': { color: text.primary, fontWeight: 600 },
    }
  },
)
