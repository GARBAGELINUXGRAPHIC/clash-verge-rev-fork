import { Box } from '@mui/material'
import type { ReactNode } from 'react'

type TagColor = 'default' | 'success' | 'error' | 'warning' | 'info'

// Mirrors Apptify's AppleTag geometry and outlined tone treatment.
export const AppleTag = ({
  children,
  color = 'default',
}: {
  children: ReactNode
  color?: TagColor
}) => (
  <Box
    component="span"
    sx={(theme) => {
      const ink =
        color === 'default'
          ? theme.palette.text.secondary
          : theme.palette[color].main
      return {
        display: 'inline-flex',
        flex: '0 0 auto',
        alignSelf: 'flex-start',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        boxSizing: 'border-box',
        width: 'fit-content',
        maxWidth: '100%',
        minHeight: 26,
        padding: '3px 10px',
        border: `1px solid ${ink}`,
        borderRadius: '999px',
        background: 'transparent',
        color: `color-mix(in srgb, ${ink} 50%, ${theme.palette.text.primary} 50%)`,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.5,
        verticalAlign: 'middle',
        overflow: 'hidden',
        overflowWrap: 'anywhere',
        '& > svg': { color: ink, fontSize: 14, flexShrink: 0 },
      }
    }}
  >
    {children}
  </Box>
)
