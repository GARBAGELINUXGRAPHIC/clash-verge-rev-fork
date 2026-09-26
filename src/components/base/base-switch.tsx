import { styled } from '@mui/material/styles'
import { default as MuiSwitch, SwitchProps } from '@mui/material/Switch'

export const Switch = styled((props: SwitchProps) => (
  <MuiSwitch
    focusVisibleClassName="Mui-focusVisible"
    disableRipple
    {...props}
  />
))(({ theme }) => ({
  width: 38,
  height: 22,
  flexShrink: 0,
  padding: 0,
  marginRight: 1,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '150ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.palette.primary.main,
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 3,
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color:
        theme.palette.mode === 'light'
          ? theme.palette.grey[100]
          : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 18,
    height: 18,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#BBBBBB' : '#39393D',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 150,
    }),
  },
}))
