import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import { useTranslation } from 'react-i18next'

import { AppleButton as Button } from '@/components/base/apple-button'

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
      <DialogTitle>{title ?? t('profiles.modals.qrViewer.title')}</DialogTitle>
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
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t('shared.actions.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
