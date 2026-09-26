import { Box } from '@mui/material'
import type { ReactNode } from 'react'

type Props = {
  label: string
  fontSize?: string
  width?: string
  padding?: string
  children?: ReactNode
}

export const BaseFieldset: React.FC<Props> = ({
  label,
  fontSize,
  width,
  padding,
  children,
}: Props) => {
  const fieldsetPadding = padding ?? '15px'

  return (
    <Box
      component="fieldset"
      sx={{
        position: 'relative',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px',
        minWidth: 0,
        width: width ?? 'auto',
        padding: fieldsetPadding,
      }}
    >
      <Box
        component="legend"
        sx={{
          px: 0.75,
          color: 'text.secondary',
          fontSize: fontSize ?? '12px',
        }}
      >
        {label}
      </Box>
      {children}
    </Box>
  )
}
