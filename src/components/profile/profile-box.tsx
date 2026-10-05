import { alpha, styled } from '@mui/material'

import { AppleCard } from '../base/apple-card'

export const ProfileBox = styled(AppleCard)<{ component?: 'div' }>(
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
      borderRadius: '18px',
      color: text.secondary,
      transition:
        'transform 150ms cubic-bezier(0,0,.5,1), border-color 160ms ease, background-color 160ms ease, box-shadow 300ms cubic-bezier(0,0,.5,1)',
      '&:hover': {
        transform: 'scale(1.01)',
        backgroundColor: `color-mix(in srgb, ${text.primary} 4%, ${background.paper})`,
      },
      '@media (prefers-reduced-motion: reduce)': {
        transition: 'none',
        '&:hover': { transform: 'none' },
      },
      '& h2': { color: text.primary, fontWeight: 600 },
    }
  },
)
