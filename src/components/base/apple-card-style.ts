import type { Theme } from '@mui/material'

export const appleCardSurface = ({ palette }: Theme) => ({
  borderRadius: '6px',
  border: '1px solid transparent',
  backgroundColor: palette.background.paper,
  boxShadow:
    palette.mode === 'dark'
      ? '2px 4px 12px #00000040'
      : '2px 4px 12px #00000014',
  transition:
    'transform .15s cubic-bezier(0,0,.5,1), box-shadow .3s cubic-bezier(0,0,.5,1), background-color .3s cubic-bezier(0,0,.5,1)',
  '&:hover': {
    transform: 'scale(1.01)',
    boxShadow:
      palette.mode === 'dark'
        ? '2px 4px 16px #00000066'
        : '2px 4px 16px #00000029',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:hover': { transform: 'none' },
  },
})
