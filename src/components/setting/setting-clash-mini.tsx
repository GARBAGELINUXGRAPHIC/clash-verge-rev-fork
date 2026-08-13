import { LanRounded, SettingsRounded } from '@mui/icons-material'
import { invoke } from '@tauri-apps/api/core'
import { useLockFn } from 'ahooks'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogRef, Switch, TooltipIcon } from '@/components/base'
import { useClash } from '@/hooks/use-clash'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'

import { DnsViewer } from './mods/dns-viewer'
import { GuardState } from './mods/guard-state'
import { NetworkInterfaceViewer } from './mods/network-interface-viewer'
import { SettingItem, SettingList } from './mods/setting-comp'

interface Props {
  onError: (err: Error) => void
}

const SettingClashMini = ({ onError }: Props) => {
  const { t } = useTranslation()
  const { clash, mutateClash, patchClash } = useClash()
  const { verge, mutateVerge, patchVerge } = useVerge()
  const networkRef = useRef<DialogRef>(null)
  const dnsRef = useRef<DialogRef>(null)

  const { ipv6, 'allow-lan': allowLan } = clash ?? {}
  const dnsSettingsEnabled = verge?.enable_dns_settings ?? false

  const onSwitchFormat = (_event: unknown, value: boolean) => value
  const onChangeData = (patch: Partial<IConfigData>) => {
    mutateClash((old) => ({ ...old!, ...patch }), false)
  }

  const handleDnsToggle = useLockFn(async (enable: boolean) => {
    mutateVerge(
      (current) =>
        current ? { ...current, enable_dns_settings: enable } : current,
      false,
    )

    try {
      await patchVerge({ enable_dns_settings: enable })
      await invoke('apply_dns_config', { apply: enable })
      setTimeout(() => mutateClash(), 500)
    } catch (error) {
      mutateVerge(
        (current) =>
          current ? { ...current, enable_dns_settings: !enable } : current,
        false,
      )
      await patchVerge({ enable_dns_settings: !enable }).catch(() => {})
      showNotice.error(error)
      throw error
    }
  })

  return (
    <SettingList title={t('settings.sections.clash.title')}>
      <NetworkInterfaceViewer ref={networkRef} />
      <DnsViewer ref={dnsRef} />

      <SettingItem
        label={t('settings.sections.clash.form.fields.allowLan')}
        extra={
          <TooltipIcon
            title={t('settings.sections.clash.form.tooltips.networkInterface')}
            color="inherit"
            icon={LanRounded}
            onClick={() => networkRef.current?.open()}
          />
        }
      >
        <GuardState
          value={allowLan ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(value) => onChangeData({ 'allow-lan': value })}
          onGuard={(value) => patchClash({ 'allow-lan': value })}
        >
          <Switch edge="end" />
        </GuardState>
      </SettingItem>

      <SettingItem
        label={t('settings.sections.clash.form.fields.dnsOverwrite')}
        extra={
          <TooltipIcon
            icon={SettingsRounded}
            onClick={() => dnsRef.current?.open()}
          />
        }
      >
        <Switch
          edge="end"
          checked={dnsSettingsEnabled}
          onChange={(_, checked) => handleDnsToggle(checked)}
        />
      </SettingItem>

      <SettingItem label={t('settings.sections.clash.form.fields.ipv6')}>
        <GuardState
          value={ipv6 ?? false}
          valueProps="checked"
          onCatch={onError}
          onFormat={onSwitchFormat}
          onChange={(value) => onChangeData({ ipv6: value })}
          onGuard={(value) => patchClash({ ipv6: value })}
        >
          <Switch edge="end" />
        </GuardState>
      </SettingItem>
    </SettingList>
  )
}

export default SettingClashMini
