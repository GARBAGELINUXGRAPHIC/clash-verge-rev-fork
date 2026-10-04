import type { SelectProps } from '@mui/material'

import { AppleSelect } from './apple-select'

export const BaseStyledSelect = (props: SelectProps<string>) => (
  <AppleSelect
    autoComplete="new-password"
    sx={{ width: 120, mr: 1 }}
    {...props}
  />
)
