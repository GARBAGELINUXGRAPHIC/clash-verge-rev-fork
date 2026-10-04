import { styled, ToggleButtonGroup } from '@mui/material'

// Keep the existing ToggleButton API and selection semantics.
export const AppleSegmentedControl = styled(ToggleButtonGroup)(({ theme }) => ({
  gap: 3,
  padding: 3,
  borderRadius: 8,
  backgroundColor: theme.palette.mode === 'dark' ? '#36363a' : '#f0f0f2',
  '& .MuiToggleButtonGroup-grouped': {
    margin: 0,
    border: 0,
    borderRadius: '6px !important',
    color:
      theme.palette.mode === 'dark' ? '#a6a5a9' : theme.palette.text.secondary,
    transition:
      'color 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
    '&.Mui-selected, &.Mui-selected:hover': {
      backgroundColor:
        theme.palette.mode === 'dark'
          ? '#515055'
          : theme.palette.background.paper,
      color:
        theme.palette.mode === 'dark' ? '#f5f4f5' : theme.palette.text.primary,
      boxShadow: '0 1px 5px #0002',
    },
    '&.Mui-focusVisible': {
      outline: `3px solid ${theme.palette.primary.main}`,
      outlineOffset: 1,
    },
  },
}))
