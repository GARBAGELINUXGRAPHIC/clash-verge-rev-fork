import { CloseRounded } from '@mui/icons-material'
import { Box, Dialog, DialogContent, DialogTitle } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'

interface Props {
  open: boolean
  value: string
  title?: string
  onClose: () => void
}

export const QrViewer = (props: Props) => {
  const { open, value, title, onClose } = props
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pr: 8, position: 'relative' }}>
        {title ?? t('profiles.modals.qrViewer.title')}
        <IconButton
          size="small"
          aria-label={t('shared.actions.close')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 24, top: 20 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 2,
            bgcolor: '#fff',
            borderRadius: '6px',
            width: '100%',
            maxWidth: 288,
            boxSizing: 'border-box',
            '& svg': { width: '100%', height: 'auto', aspectRatio: '1 / 1' },
          }}
        >
          <QRCodeSVG value={value} size={256} level="M" />
        </Box>
      </DialogContent>
    </Dialog>
  )
}
