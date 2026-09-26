import { styled, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { forwardRef, useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, DialogRef, Switch } from '@/components/base'
import { useVerge } from '@/hooks/use-verge'
import { showNotice } from '@/services/notice-service'

import { HotkeyInput } from './hotkey-input'

const ItemWrapper = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 270px)',
  alignItems: 'center',
  gap: 16,
  padding: '12px 0',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': { borderBottom: 0 },
  '& > .MuiTypography-root': { minWidth: 0, overflowWrap: 'anywhere' },
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 8,
  },
}))

const HOTKEY_FUNC = [
  'open_or_close_dashboard',
  'clash_mode_rule',
  'clash_mode_global',
  'clash_mode_direct',
  'toggle_system_proxy',
  'toggle_tun_mode',
  'entry_lightweight_mode',
  'reactivate_profiles',
] as const

const HOTKEY_FUNC_LABELS: Record<(typeof HOTKEY_FUNC)[number], string> = {
  open_or_close_dashboard:
    'settings.modals.hotkey.functions.openOrCloseDashboard',
  clash_mode_rule: 'settings.modals.hotkey.functions.rule',
  clash_mode_global: 'settings.modals.hotkey.functions.global',
  clash_mode_direct: 'settings.modals.hotkey.functions.direct',
  toggle_system_proxy: 'settings.modals.hotkey.functions.toggleSystemProxy',
  toggle_tun_mode: 'settings.modals.hotkey.functions.toggleTunMode',
  entry_lightweight_mode:
    'settings.modals.hotkey.functions.entryLightweightMode',
  reactivate_profiles: 'settings.modals.hotkey.functions.reactivateProfiles',
}

export const HotkeyViewer = forwardRef<DialogRef>((props, ref) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { verge, patchVerge } = useVerge()

  const [hotkeyMap, setHotkeyMap] = useState<Record<string, string[]>>({})
  const [enableGlobalHotkey, setEnableGlobalHotkey] = useState(
    verge?.enable_global_hotkey ?? true,
  )

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true)

      const map = {} as typeof hotkeyMap

      verge?.hotkeys?.forEach((text) => {
        const [func, key] = text.split(',').map((e) => e.trim())

        if (!func || !key) return

        map[func] = key
          .split('+')
          .map((e) => e.trim())
          .map((k) => (k === 'PLUS' ? '+' : k))
      })

      setHotkeyMap(map)
    },
    close: () => setOpen(false),
  }))

  const onSave = useLockFn(async () => {
    const hotkeys = Object.entries(hotkeyMap)
      .map(([func, keys]) => {
        if (!func || !keys?.length) return ''

        const key = keys
          .map((k) => k.trim())
          .filter(Boolean)
          .map((k) => (k === '+' ? 'PLUS' : k))
          .join('+')

        if (!key) return ''
        return `${func},${key}`
      })
      .filter(Boolean)

    try {
      await patchVerge({
        hotkeys,
        enable_global_hotkey: enableGlobalHotkey,
      })
      setOpen(false)
    } catch (err) {
      showNotice.error(err)
    }
  })

  return (
    <BaseDialog
      open={open}
      title={t('settings.modals.hotkey.title')}
      contentSx={{ width: 560, maxWidth: '100%' }}
      okBtn={t('shared.actions.save')}
      cancelBtn={t('shared.actions.cancel')}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <ItemWrapper
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Typography>
          {t('settings.modals.hotkey.toggles.enableGlobal')}
        </Typography>
        <Switch
          edge="end"
          checked={enableGlobalHotkey}
          onChange={(e) => setEnableGlobalHotkey(e.target.checked)}
        />
      </ItemWrapper>

      {HOTKEY_FUNC.map((func) => (
        <ItemWrapper key={func}>
          <Typography>{t(HOTKEY_FUNC_LABELS[func])}</Typography>
          <HotkeyInput
            ariaLabel={t(HOTKEY_FUNC_LABELS[func])}
            value={hotkeyMap[func] ?? []}
            onChange={(v) => setHotkeyMap((m) => ({ ...m, [func]: v }))}
          />
        </ItemWrapper>
      ))}
    </BaseDialog>
  )
})
