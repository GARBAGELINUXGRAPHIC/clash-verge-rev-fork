import { CloseRounded } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
} from '@mui/material'
import { ReactNode, useId } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  title: ReactNode
  open: boolean
  okBtn?: ReactNode
  cancelBtn?: ReactNode
  disableEnforceFocus?: boolean
  disableOk?: boolean
  disableCancel?: boolean
  disableFooter?: boolean
  contentSx?: SxProps<Theme>
  children?: ReactNode
  loading?: boolean
  onOk?: () => void
  onCancel?: () => void
  onClose?: () => void
}

export interface DialogRef {
  open: () => void
  close: () => void
}

export const BaseDialog: React.FC<Props> = ({
  open,
  title,
  children,
  okBtn,
  cancelBtn,
  disableEnforceFocus,
  contentSx,
  disableCancel,
  disableOk,
  disableFooter,
  loading,
  onOk,
  onCancel,
  onClose,
}) => {
  const { t } = useTranslation()
  const titleId = useId()

  return (
    <Dialog
      open={open}
      maxWidth={false}
      onClose={onClose}
      aria-labelledby={titleId}
      disableEnforceFocus={disableEnforceFocus}
      slotProps={{
        paper: {
          sx: {
            m: 2,
            maxWidth: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
            minWidth: 0,
          },
        },
      }}
    >
      <DialogTitle
        component="div"
        id={titleId}
        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
      >
        <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
          {typeof title === 'string' ? (
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
              {title}
            </Typography>
          ) : (
            title
          )}
        </Box>
        {onClose && (
          <Tooltip title={t('shared.actions.close')}>
            <IconButton
              size="small"
              aria-label={t('shared.actions.close')}
              disabled={loading}
              onClick={onClose}
            >
              <CloseRounded />
            </IconButton>
          </Tooltip>
        )}
      </DialogTitle>

      <DialogContent
        sx={[
          { maxWidth: '100%', boxSizing: 'border-box', overflowX: 'auto' },
          ...(Array.isArray(contentSx) ? contentSx : [contentSx ?? {}]),
        ]}
      >
        {children}
      </DialogContent>

      {!disableFooter && (
        <DialogActions
          sx={{
            flexWrap: 'wrap',
            '& .MuiButton-root': { whiteSpace: 'normal', minWidth: 72 },
          }}
        >
          {!disableCancel && (
            <Button variant="outlined" onClick={onCancel}>
              {cancelBtn}
            </Button>
          )}
          {!disableOk && (
            <Button loading={loading} variant="contained" onClick={onOk}>
              {okBtn}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  )
}
