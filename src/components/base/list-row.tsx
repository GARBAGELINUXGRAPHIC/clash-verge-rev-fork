import { Box, styled } from '@mui/material'

export const listItemTransition =
  'background-color 220ms ease, color 220ms ease'

export const ListRow = styled(Box)(({ theme }) => ({
  transition: listItemTransition,
  '&:hover': { backgroundColor: theme.palette.action.hover },
}))
