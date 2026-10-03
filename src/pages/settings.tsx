import { GitHub, HelpOutlineRounded, Telegram } from '@mui/icons-material'
import { Box, IconButton, Tooltip } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useTranslation } from 'react-i18next'

import { BasePage } from '@/components/base'
import SettingClash from '@/components/setting/setting-clash'
import SettingSystem from '@/components/setting/setting-system'
import SettingVergeAdvanced from '@/components/setting/setting-verge-advanced'
import SettingVergeBasic from '@/components/setting/setting-verge-basic'
import { showNotice } from '@/services/notice-service'
import { openExternalUrl } from '@/utils/open-external-url'

const SettingPage = () => {
  const { t } = useTranslation()

  const onError = (err: any) => {
    showNotice.error(err)
  }

  const toGithubRepo = useLockFn(() =>
    openExternalUrl('https://github.com/clash-verge-rev/clash-verge-rev').catch(
      onError,
    ),
  )

  const toGithubDoc = useLockFn(() =>
    openExternalUrl('https://clash-verge-rev.github.io/index.html').catch(
      onError,
    ),
  )

  const toTelegramChannel = useLockFn(() =>
    openExternalUrl('https://t.me/clash_verge_re').catch(onError),
  )

  return (
    <BasePage
      title={t('settings.page.title')}
      header={
        <Box
          sx={{ display: 'flex', gap: 0.5 }}
          aria-label={t('settings.page.actionsGroupLabel')}
        >
          <Tooltip title={t('settings.page.actions.manual')}>
            <IconButton
              size="medium"
              color="inherit"
              aria-label={t('settings.page.actions.manual')}
              onClick={toGithubDoc}
            >
              <HelpOutlineRounded fontSize="inherit" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('settings.page.actions.telegram')}>
            <IconButton
              size="medium"
              color="inherit"
              aria-label={t('settings.page.actions.telegram')}
              onClick={toTelegramChannel}
            >
              <Telegram fontSize="inherit" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('settings.page.actions.github')}>
            <IconButton
              size="medium"
              color="inherit"
              aria-label={t('settings.page.actions.github')}
              onClick={toGithubRepo}
            >
              <GitHub fontSize="inherit" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'repeat(2, minmax(0, 1fr))',
          },
          gap: { xs: 3, lg: 4 },
          maxWidth: 1200,
          mx: 'auto',
        }}
      >
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}
        >
          <SettingSystem onError={onError} />
          <SettingClash onError={onError} />
        </Box>
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}
        >
          <SettingVergeBasic onError={onError} />
          <SettingVergeAdvanced onError={onError} />
        </Box>
      </Box>
    </BasePage>
  )
}

export default SettingPage
