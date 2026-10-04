import { InfoRounded } from '@mui/icons-material'
import { Tooltip, IconButtonProps, SvgIconProps } from '@mui/material'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'

interface Props extends IconButtonProps {
  title?: string
  icon?: React.ElementType<SvgIconProps>
}

export const TooltipIcon: React.FC<Props> = (props: Props) => {
  const { title = '', icon: Icon = InfoRounded, ...restProps } = props

  return (
    <Tooltip title={title} placement="top">
      <IconButton
        color="inherit"
        size="small"
        aria-label={title || undefined}
        {...restProps}
      >
        <Icon fontSize="inherit" style={{ cursor: 'pointer', opacity: 0.75 }} />
      </IconButton>
    </Tooltip>
  )
}
