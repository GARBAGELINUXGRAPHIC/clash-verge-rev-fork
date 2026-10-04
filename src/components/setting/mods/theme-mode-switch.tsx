import { ToggleButton } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { AppleSegmentedControl } from '@/components/base/apple-segmented-control'

type ThemeValue = IVergeConfig['theme_mode']

interface Props {
  value?: ThemeValue
  onChange?: (value: ThemeValue) => void
}

export const ThemeModeSwitch = (props: Props) => {
  const { value, onChange } = props
  const { t } = useTranslation()

  const modes = ['light', 'dark', 'system'] as const

  return (
    <AppleSegmentedControl
      exclusive
      size="small"
      value={value}
      onChange={(_, next: ThemeValue | null) => next && onChange?.(next)}
      sx={{ my: 0.5 }}
    >
      {modes.map((mode) => (
        <ToggleButton key={mode} value={mode}>
          {t(`settings.sections.appearance.${mode}`)}
        </ToggleButton>
      ))}
    </AppleSegmentedControl>
  )
}
