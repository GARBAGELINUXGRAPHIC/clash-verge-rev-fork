import { Box, styled } from '@mui/material'

export const TestBox = styled(Box)(({ theme, 'aria-selected': selected }) => {
  const { primary, text, divider, background } = theme.palette

  return {
    position: 'relative',
    width: '100%',
    display: 'block',
    textAlign: 'left',
    borderRadius: 8,
    border: `1px solid ${selected ? primary.main : divider}`,
    padding: '12px',
    boxSizing: 'border-box',
    backgroundColor: background.paper,
    color: text.primary,
    '& h2': { color: text.primary },
  }
})
