import { ErrorOutlineRounded } from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import { ReactNode } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { useTranslation } from 'react-i18next'

function ErrorFallback({ error }: FallbackProps) {
  const { t } = useTranslation()
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  return (
    <Box
      role="alert"
      sx={{
        p: 3,
        maxWidth: 720,
        minWidth: 0,
        mx: 'auto',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <ErrorOutlineRounded color="error" />
        <Typography component="h2" variant="h6">
          {t('shared.feedback.errors.unexpected')}
        </Typography>
      </Box>
      <Box
        component="pre"
        sx={{
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          userSelect: 'text',
          color: 'text.secondary',
        }}
      >
        {errorMessage}
      </Box>
      <Box
        component="details"
        title={t('shared.feedback.errors.stack')}
        sx={{
          mt: 3,
          fontSize: 14,
          '& summary': { cursor: 'pointer', color: 'text.secondary' },
        }}
      >
        <summary>{t('shared.feedback.errors.stack')}</summary>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'background.default',
            borderRadius: '6px',
            fontSize: 12,
            maxHeight: 320,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            userSelect: 'text',
          }}
        >
          {errorStack}
        </Box>
      </Box>
    </Box>
  )
}

interface Props {
  children?: ReactNode
}

export const BaseErrorBoundary = ({ children }: Props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>{children}</ErrorBoundary>
  )
}
