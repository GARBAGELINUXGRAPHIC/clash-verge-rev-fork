import { ToggleButton, ToggleButtonGroup } from '@mui/material'

interface Props {
  value?: string
  onChange?: (value: string) => void
}

export const StackModeSwitch = (props: Props) => {
  const { value, onChange } = props

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value?.toLowerCase()}
      onChange={(_, next: string | null) => next && onChange?.(next)}
      sx={{ my: 0.5, flexWrap: 'wrap' }}
    >
      <ToggleButton value="system">System</ToggleButton>
      <ToggleButton value="gvisor">gVisor</ToggleButton>
      <ToggleButton value="mixed">Mixed</ToggleButton>
      <ToggleButton value="mips">Mips</ToggleButton>
    </ToggleButtonGroup>
  )
}
