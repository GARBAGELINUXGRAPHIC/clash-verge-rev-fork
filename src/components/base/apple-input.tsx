import { alpha, styled, TextField } from '@mui/material'

export const AppleInput = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 8,
    backgroundColor: theme.palette.background.paper,
    transition: 'box-shadow 120ms ease, background-color 120ms ease',
    '& fieldset': {
      borderColor: '#bbbbbbbb',
      transition: 'border-color 120ms ease',
    },
    '&:hover:not(.Mui-disabled) fieldset': {
      borderColor: alpha(theme.palette.text.secondary, 0.6),
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
      '& fieldset': { borderWidth: 1, borderColor: theme.palette.primary.main },
    },
    '&.Mui-error': {
      '& fieldset': { borderColor: theme.palette.error.main },
      '&.Mui-focused': {
        boxShadow: `0 0 0 3px ${alpha(theme.palette.error.main, 0.2)}`,
      },
    },
    '&.Mui-disabled': { backgroundColor: theme.palette.action.hover },
  },
}))
