import { Box, CircularProgress } from '@mui/material'
import { useTranslation } from 'react-i18next'

export const BaseLoading = () => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', height: 18, minWidth: 18 }}
    >
      <CircularProgress
        size={14}
        thickness={4}
        color="inherit"
        aria-label={t('shared.statuses.loading')}
      />
    </Box>
  )
}
