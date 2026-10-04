import { DeleteRounded } from '@mui/icons-material'
import { alpha, Box, IconButton, styled } from '@mui/material'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { appleFieldSurface } from '@/components/base/apple-style'
import { parseHotkey } from '@/utils/parse-hotkey'

const KeyWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  flex: 1,
  minWidth: 0,
  minHeight: 36,

  '> input': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
    opacity: 0,
  },
  '> input:focus + .list': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
  },
  '.list': {
    ...appleFieldSurface(theme),
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    minHeight: 36,
    boxSizing: 'border-box',
    padding: '3px 4px',
    border: '1px solid',
    borderRadius: 8,
    borderColor: '#bbbbbbbb',
    '&:last-child': {
      marginRight: 0,
    },
  },
  '.item': {
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.primary,
    border: '1px solid',
    borderColor: alpha(theme.palette.text.secondary, 0.2),
    borderRadius: '2px',
    padding: '1px 5px',
    margin: '2px 0',
  },
  '.delimiter': {
    lineHeight: '25px',
    padding: '0 2px',
  },
}))

interface Props {
  ariaLabel: string
  value: string[]
  onChange: (value: string[]) => void
}

export const HotkeyInput = (props: Props) => {
  const { value, onChange, ariaLabel } = props
  const { t } = useTranslation()

  const changeRef = useRef<string[]>([])
  const [keys, setKeys] = useState(value)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.5 }}>
      <KeyWrapper>
        <input
          aria-label={ariaLabel}
          onKeyUp={() => {
            const ret = changeRef.current.slice()
            if (ret.length) {
              onChange(ret)
              changeRef.current = []
            }
          }}
          onKeyDown={(e) => {
            e.preventDefault()
            e.stopPropagation()

            const key = parseHotkey(e)
            if (key === 'UNIDENTIFIED') return

            changeRef.current = [...new Set([...changeRef.current, key])]
            setKeys(changeRef.current)
          }}
        />

        <div className="list">
          {keys.map((key, index) => (
            <Box sx={{ display: 'flex' }} key={key}>
              <span className="delimiter" hidden={index === 0}>
                +
              </span>
              <kbd className="item">{key}</kbd>
            </Box>
          ))}
        </div>
      </KeyWrapper>

      <IconButton
        size="small"
        title={t('shared.actions.delete')}
        aria-label={t('shared.actions.delete')}
        color="inherit"
        onClick={() => {
          onChange([])
          setKeys([])
        }}
      >
        <DeleteRounded fontSize="inherit" />
      </IconButton>
    </Box>
  )
}
