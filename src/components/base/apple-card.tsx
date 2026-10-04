import { ButtonBase, styled } from '@mui/material'

// Apptify AppleCard's default surface: normal shadow, no hover zoom.
export const AppleCard = styled(ButtonBase)<{ component?: 'div' }>(
  ({ theme }) => ({
    position: 'relative',
    minWidth: 0,
    borderRadius: 18,
    backgroundColor: theme.palette.background.paper,
    boxShadow:
      theme.palette.mode === 'light'
        ? '2px 4px 12px #00000014'
        : '2px 4px 12px #00000040',
    transition: 'box-shadow 300ms cubic-bezier(0,0,.5,1)',
    '&:hover': {
      boxShadow:
        theme.palette.mode === 'light'
          ? '2px 4px 16px #00000029'
          : '2px 4px 16px #00000066',
    },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '80ms' },
  }),
)
