import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'

interface Props {
  value?: string
  onChange?: (value: string) => void
}

export const StackModeSwitch = (props: Props) => {
  const { value, onChange } = props

  return (
    <AppleSegmentedControl
      exclusive
      size="small"
      value={value?.toLowerCase()}
      onChange={(_, next: string | null) => next && onChange?.(next)}
      sx={{ my: 0.5, flexWrap: 'wrap' }}
    >
      <AppleSegment value="system">System</AppleSegment>
      <AppleSegment value="gvisor">gVisor</AppleSegment>
      <AppleSegment value="mixed">Mixed</AppleSegment>
      <AppleSegment value="mips">Mips</AppleSegment>
    </AppleSegmentedControl>
  )
}
