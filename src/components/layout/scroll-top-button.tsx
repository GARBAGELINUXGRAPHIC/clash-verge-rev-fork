import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { Fade, SxProps, Theme } from '@mui/material'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'

interface Props {
  onClick: () => void
  show: boolean
  sx?: SxProps<Theme>
}

export const ScrollTopButton = ({ onClick, show, sx }: Props) => {
  return (
    <Fade in={show}>
      <IconButton
        onClick={onClick}
        sx={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          width: 32,
          height: 32,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          visibility: show ? 'visible' : 'hidden',
          ...sx,
        }}
      >
        <KeyboardArrowUpIcon />
      </IconButton>
    </Fade>
  )
}
