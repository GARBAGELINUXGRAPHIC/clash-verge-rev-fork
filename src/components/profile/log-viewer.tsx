import { CloseRounded } from '@mui/icons-material'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'

import { BaseEmpty } from '@/components/base'
import { AppleIconButton as IconButton } from '@/components/base/apple-button'

interface Props {
  open: boolean
  logInfo: [string, string][]
  onClose: () => void
}

export const LogViewer = (props: Props) => {
  const { open, logInfo, onClose } = props

  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 8, position: 'relative' }}>
        {t('profiles.modals.logViewer.title')}
        <IconButton
          size="small"
          aria-label={t('shared.actions.close')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 24, top: 20 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          height: 'min(420px, 60vh)',
          overflowX: 'hidden',
          userSelect: 'text',
          p: 0,
        }}
      >
        {logInfo.map(([level, log]) => (
          <Box
            key={`${level}-${log}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: '90px minmax(0, 1fr)',
              gap: 1.5,
              px: 2.5,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              alignItems: 'start',
            }}
          >
            <Chip
              label={level}
              size="small"
              variant="outlined"
              color={
                level === 'error' || level === 'exception' ? 'error' : 'default'
              }
              sx={{ justifySelf: 'start', maxWidth: '100%', fontSize: 11 }}
            />
            <Typography
              variant="body2"
              sx={{
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                fontSize: 12,
                overflowWrap: 'anywhere',
              }}
            >
              {log}
            </Typography>
          </Box>
        ))}

        {logInfo.length === 0 && <BaseEmpty />}
      </DialogContent>
    </Dialog>
  )
}
