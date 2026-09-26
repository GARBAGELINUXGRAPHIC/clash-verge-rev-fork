import {
  DeleteForeverRounded,
  PauseCircleOutlineRounded,
  PlayCircleOutlineRounded,
  SettingsRounded,
  WarningRounded,
} from '@mui/icons-material'
import { Box, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { type DialogRef, Switch, TooltipIcon } from '@/components/base'
import { SysproxyViewer } from '@/components/setting/mods/sysproxy-viewer'
import { TunViewer } from '@/components/setting/mods/tun-viewer'
import { useServiceUninstaller } from '@/hooks/use-service-uninstaller'
import { useSystemProxyState } from '@/hooks/use-system-proxy-state'
import { useSystemState } from '@/hooks/use-system-state'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'
import { requestService } from '@/services/service-request'

interface ProxySwitchProps {
  label?: string
  onError?: (err: Error) => void
  noRightPadding?: boolean
}

interface SwitchRowProps {
  label: string
  active: boolean
  disabled?: boolean
  infoTitle: string
  onInfoClick?: () => void
  extraIcons?: React.ReactNode
  /** Return false to roll back without reporting an error. */
  onToggle: (value: boolean) => Promise<boolean | void>
  onError?: (err: Error) => void
}

/**
 * 抽取的子组件：统一的开关 UI
 * active = 真实状态OS/配置 乐观更新
 */
const SwitchRow = ({
  label,
  active,
  disabled,
  infoTitle,
  onInfoClick,
  extraIcons,
  onToggle,
  onError,
}: SwitchRowProps) => {
  const [checked, setChecked] = useState(active)
  const pendingRef = useRef(false)

  if (pendingRef.current) {
    if (active === checked) pendingRef.current = false
  } else if (checked !== active) {
    setChecked(active)
  }

  const handleChange = (_: React.ChangeEvent, value: boolean) => {
    pendingRef.current = true
    setChecked(value)
    onToggle(value)
      .then((applied) => {
        if (applied === false) setChecked(active)
      })
      .catch((err: any) => {
        setChecked(active)
        onError?.(err)
      })
      .finally(() => {
        pendingRef.current = false
      })
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 52,
        py: 1,
        px: 0.5,
        gap: 2,
        borderBottom: 1,
        borderColor: 'divider',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.3s',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          minWidth: 0,
        }}
      >
        {active ? (
          <PlayCircleOutlineRounded sx={{ color: 'success.main', mr: 1 }} />
        ) : (
          <PauseCircleOutlineRounded sx={{ color: 'text.disabled', mr: 1 }} />
        )}
        <Typography variant="subtitle1" sx={{ fontWeight: 400, fontSize: 13 }}>
          {label}
        </Typography>
        <TooltipIcon
          title={infoTitle}
          icon={SettingsRounded}
          onClick={onInfoClick}
          sx={{ ml: 1 }}
        />
        {extraIcons}
      </Box>

      <Switch
        edge="end"
        disabled={disabled}
        checked={checked}
        slotProps={{ input: { 'aria-label': label } }}
        onChange={handleChange}
      />
    </Box>
  )
}

const ProxyControlSwitches = ({
  label,
  onError,
  noRightPadding = false,
}: ProxySwitchProps) => {
  const { t } = useTranslation()
  const { verge, mutateVerge, patchVerge } = useVerge()
  const { uninstallServiceAndStartSidecar } = useServiceUninstaller()
  const { indicator: systemProxyIndicator, toggleSystemProxy } =
    useSystemProxyState()
  const { runState, isTunModeAvailable, isLoading } = useSystemState()
  // Offer to uninstall only a service that is actually there and working.
  const isServiceInstallReady = runState.serviceUsable

  const sysproxyRef = useRef<DialogRef>(null)
  const tunRef = useRef<DialogRef>(null)

  const { enable_tun_mode } = verge ?? {}

  // Enabling needs a running core; disabling only writes OS state and must stay available.
  const handleSystemProxyToggle = async (value: boolean) => {
    if (value && !isLoading && runState.mode === 'NotRunning') {
      showNotice.error('settings.feedback.errors.sysproxy.coreNotReady')
      return false
    }
    await toggleSystemProxy(value)
  }

  const handleTunToggle = async (value: boolean) => {
    if (value && !isTunModeAvailable) {
      requestService({
        reason: 'tunNeedsService',
        restore: { enable_tun_mode: value },
      })
      return false
    }
    mutateVerge({ ...verge, enable_tun_mode: value }, false)
    await patchVerge({ enable_tun_mode: value })
  }

  const onUninstallService = useLockFn(async () => {
    try {
      await uninstallServiceAndStartSidecar()
    } catch (err) {
      showNotice.error(err)
    }
  })

  const isSystemProxyMode =
    label === t('settings.sections.system.toggles.systemProxy') || !label
  const isTunMode = label === t('settings.sections.system.toggles.tunMode')

  return (
    <Box
      sx={{
        width: '100%',
        boxSizing: 'border-box',
        pr: noRightPadding ? 0 : 0.5,
      }}
    >
      {isSystemProxyMode && (
        <SwitchRow
          label={t('settings.sections.proxyControl.fields.systemProxy')}
          active={systemProxyIndicator}
          infoTitle={t('settings.sections.proxyControl.tooltips.systemProxy')}
          onInfoClick={() => sysproxyRef.current?.open()}
          onToggle={handleSystemProxyToggle}
          onError={onError}
        />
      )}

      {isTunMode && (
        <SwitchRow
          label={t('settings.sections.proxyControl.fields.tunMode')}
          active={(enable_tun_mode && isTunModeAvailable) || false}
          infoTitle={t('settings.sections.proxyControl.tooltips.tunMode')}
          onInfoClick={() => tunRef.current?.open()}
          onToggle={handleTunToggle}
          onError={onError}
          extraIcons={
            <>
              {!isTunModeAvailable && (
                <TooltipIcon
                  title={t(
                    'settings.sections.proxyControl.tooltips.tunUnavailable',
                  )}
                  icon={WarningRounded}
                  sx={{ color: 'warning.main', ml: 1 }}
                />
              )}
              {isServiceInstallReady && (
                <TooltipIcon
                  title={t(
                    'settings.sections.proxyControl.actions.uninstallService',
                  )}
                  icon={DeleteForeverRounded}
                  color="secondary"
                  onClick={onUninstallService}
                  sx={{ ml: 1 }}
                />
              )}
            </>
          }
        />
      )}

      <SysproxyViewer ref={sysproxyRef} />
      <TunViewer ref={tunRef} />
    </Box>
  )
}

export default ProxyControlSwitches
