import { Box, type BoxProps } from '@mui/material'

import { appleCardSurface } from './apple-card-style'

export const AppleCard = ({ sx, ...props }: BoxProps) => (
  <Box
    {...props}
    sx={[appleCardSurface, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
  />
)
