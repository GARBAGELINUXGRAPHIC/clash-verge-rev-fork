import { InboxRounded } from '@mui/icons-material'
import { alpha, Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { TranslationKey } from '@/types/generated/i18n-keys'

interface Props {
  text?: ReactNode
  textKey?: TranslationKey
  extra?: ReactNode
}

export const BaseEmpty = ({
  text,
  textKey = 'shared.statuses.empty',
  extra,
}: Props) => {
  const { t } = useTranslation()

  const resolvedText: ReactNode = text !== undefined ? text : t(textKey)

  return (
    <Box
      sx={({ palette }) => ({
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        padding: 3,
        boxSizing: 'border-box',
        textAlign: 'center',
        color: alpha(palette.text.secondary, 0.75),
      })}
    >
      <InboxRounded sx={{ fontSize: 36, color: 'text.disabled' }} />
      <Typography variant="body1">{resolvedText}</Typography>
      {extra}
    </Box>
  )
}
