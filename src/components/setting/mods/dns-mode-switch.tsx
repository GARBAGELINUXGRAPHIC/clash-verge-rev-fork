import { useTranslation } from 'react-i18next'

import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'

interface Props {
  value?: string
  onChange?: (value: string) => void
}

export const DnsModeSwitch = (props: Props) => {
  const { value, onChange } = props
  const { t } = useTranslation()

  return (
    <AppleSegmentedControl
      exclusive
      size="small"
      value={value ?? ''}
      aria-label={t('settings.modals.tun.fields.dnsMode')}
      onChange={(_, next: string | null) => {
        if (next !== null) onChange?.(next)
      }}
      sx={{ my: 0.5, flexWrap: 'wrap' }}
    >
      <AppleSegment value="">Auto</AppleSegment>
      <AppleSegment value="disabled">Disabled</AppleSegment>
      <AppleSegment value="native">Native</AppleSegment>
      <AppleSegment value="hijack">Hijack</AppleSegment>
    </AppleSegmentedControl>
  )
}
