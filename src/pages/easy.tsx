import { BoltRounded } from '@mui/icons-material'
import { Box, Button, Grid } from '@mui/material'
import { invoke } from '@tauri-apps/api/core'
import { useLockFn } from 'ahooks'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { closeAllConnections } from 'tauri-plugin-mihomo-api'

import { BasePage } from '@/components/base'
import SettingClashMini from '@/components/setting/setting-clash-mini'
import SettingSystem from '@/components/setting/setting-system'
import SettingVergeBasicMini from '@/components/setting/setting-verge-basic-mini'
import { useClash } from '@/hooks/use-clash'
import { useServiceInstaller } from '@/hooks/use-service-installer'
import { useSystemProxyState } from '@/hooks/use-system-proxy-state'
import { useSystemState } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'
import { useThemeMode } from '@/services/states'

const EasyPage = () => {
  const { t } = useTranslation()
  const mode = useThemeMode()
  const isDark = mode !== 'light'
  const [isSettingUp, setIsSettingUp] = useState(false)

  const { clash, patchClash } = useClash()
  const { verge, patchVerge } = useVerge()
  const { installServiceAndRestartCore } = useServiceInstaller()
  const { runState, mutateSystemState } = useSystemState()
  const { indicator: systemProxyEnabled, toggleSystemProxy } =
    useSystemProxyState()

  const onError = (error: Error) => showNotice.error(error)

  const setup = useLockFn(async () => {
    setIsSettingUp(true)
    showNotice.info('settings.easy.feedback.notifications.setupInProgress')

    try {
      let tunCapable = runState.tunCapable
      if (!tunCapable) {
        await installServiceAndRestartCore()
        const refreshedState = await mutateSystemState()
        tunCapable = refreshedState.data?.tunCapable ?? false
      }

      if (!tunCapable) {
        throw new Error(
          t('settings.sections.proxyControl.tooltips.tunUnavailable'),
        )
      }

      if (!systemProxyEnabled) {
        await closeAllConnections()
        await toggleSystemProxy(true)
      }

      const vergePatch: Partial<IVergeConfig> = {}
      if (!verge?.enable_tun_mode) vergePatch.enable_tun_mode = true
      if (!verge?.enable_auto_launch) vergePatch.enable_auto_launch = true
      if (!verge?.enable_silent_start) vergePatch.enable_silent_start = true
      if (verge?.start_page !== '/easy') vergePatch.start_page = '/easy'
      if (verge?.enable_dns_settings) vergePatch.enable_dns_settings = false

      if (Object.keys(vergePatch).length > 0) {
        await patchVerge(vergePatch)
      }
      if (verge?.enable_dns_settings) {
        await invoke('apply_dns_config', { apply: false })
      }

      const clashPatch: Partial<IConfigData> = {}
      if (!clash?.['allow-lan']) clashPatch['allow-lan'] = true
      if (!clash?.ipv6) clashPatch.ipv6 = true
      if (Object.keys(clashPatch).length > 0) {
        await patchClash(clashPatch)
      }

      showNotice.success('settings.easy.feedback.notifications.setupSuccess')
    } catch (error) {
      showNotice.error(error)
    } finally {
      setIsSettingUp(false)
    }
  })

  const sectionSx = {
    borderRadius: 2,
    marginBottom: 1.5,
    backgroundColor: isDark ? '#282a36' : '#ffffff',
  }

  return (
    <BasePage title={t('settings.easy.title')}>
      <Box sx={{ ...sectionSx, p: 2 }}>
        <Button
          variant="contained"
          startIcon={<BoltRounded />}
          disabled={isSettingUp}
          onClick={setup}
        >
          {t(
            isSettingUp
              ? 'settings.easy.actions.settingUp'
              : 'settings.easy.actions.setup',
          )}
        </Button>
      </Box>

      <Grid container spacing={1.5} columns={{ xs: 6, sm: 6, md: 12 }}>
        <Grid size={6}>
          <Box sx={sectionSx}>
            <SettingSystem onError={onError} />
          </Box>
        </Grid>
        <Grid size={6}>
          <Box sx={sectionSx}>
            <SettingClashMini onError={onError} />
          </Box>
          <Box sx={{ ...sectionSx, mb: 0 }}>
            <SettingVergeBasicMini onError={onError} />
          </Box>
        </Grid>
      </Grid>
    </BasePage>
  )
}

export default EasyPage
