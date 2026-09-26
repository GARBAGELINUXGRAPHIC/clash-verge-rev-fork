import { alpha, Box, styled } from '@mui/material'

export const ProfileBox = styled(Box)(
  ({ theme, 'aria-selected': selected }) => {
    const { primary, text, background, divider } = theme.palette

    return {
      position: 'relative',
      display: 'block',
      cursor: 'pointer',
      textAlign: 'left',
      padding: '14px 16px',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      backgroundColor: background.paper,
      border: `1px solid ${selected ? primary.main : divider}`,
      boxShadow: selected ? `inset 0 0 0 1px ${primary.main}` : 'none',
      borderRadius: '8px',
      color: text.secondary,
      transition: 'border-color 160ms ease, background-color 160ms ease',
      '&:hover': { backgroundColor: alpha(primary.main, 0.025) },
      '& h2': { color: text.primary, fontWeight: 600 },
    }
  },
)
