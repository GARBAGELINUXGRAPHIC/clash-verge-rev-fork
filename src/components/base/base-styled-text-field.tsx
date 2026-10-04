import type { TextFieldProps } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppleInput } from './apple-input'

export const BaseStyledTextField = (props: TextFieldProps) => {
  const { t } = useTranslation()
  return (
    <AppleInput
      autoComplete="new-password"
      hiddenLabel
      fullWidth
      spellCheck={false}
      placeholder={t('shared.placeholders.filter')}
      {...props}
    />
  )
}
