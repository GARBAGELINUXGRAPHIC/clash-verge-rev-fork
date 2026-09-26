import { alpha, Box, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'

interface BaseLoadingOverlayProps {
  isLoading: boolean
}

export const BaseLoadingOverlay: React.FC<BaseLoadingOverlayProps> = ({
  isLoading,
}) => {
  const { t } = useTranslation()
  if (!isLoading) return null

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.8),
        zIndex: 1000,
      }}
    >
      <CircularProgress size={24} aria-label={t('shared.statuses.loading')} />
    </Box>
  )
}
