import { ButtonBase, styled } from '@mui/material'

import { appleCardSurface } from './apple-card-style'

// Apptify AppleCard's default surface: normal shadow, no hover zoom.
export const AppleCard = styled(ButtonBase)<{ component?: 'div' }>(
  ({ theme }) => appleCardSurface(theme),
)
