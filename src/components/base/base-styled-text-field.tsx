import { type TextFieldProps, styled } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppleInput } from './apple-input'

export const BaseStyledTextField = styled((props: TextFieldProps) => {
  const { t } = useTranslation()

  return (
    <AppleInput
      autoComplete="new-password"
      hiddenLabel
      fullWidth
      size="small"
      variant="outlined"
      spellCheck="false"
      placeholder={t('shared.placeholders.filter')}
      sx={{ input: { py: 0.65, px: 1.25 } }}
      {...props}
    />
  )
})(({ theme }) => ({
  '& .MuiInputBase-root': {
    background: theme.palette.background.paper,
  },
}))
