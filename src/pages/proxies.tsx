import { Box } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { BasePage } from '@/components/base'
import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'
import { ProviderButton } from '@/components/proxy/provider-button'
import { ProxyGroups } from '@/components/proxy/proxy-groups'
import {
  useAppRefreshers,
  useClashConfigData,
} from '@/providers/app-data-context'
import { patchClashMode } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'

const MODES = ['rule', 'global', 'direct'] as const
type Mode = (typeof MODES)[number]
const MODE_SET = new Set<string>(MODES)
const isMode = (value: unknown): value is Mode =>
  typeof value === 'string' && MODE_SET.has(value)

const ProxyPage = () => {
  const { t } = useTranslation()

  const { clashConfig } = useClashConfigData()
  const { refreshClashConfig } = useAppRefreshers()

  const normalizedMode = clashConfig?.mode?.toLowerCase()
  const curMode = isMode(normalizedMode) ? normalizedMode : undefined

  const onChangeMode = useLockFn(async (mode: Mode) => {
    try {
      // patchClashMode 在后端 PATCH 失败时会 reject，需提示用户而非静默失败
      await patchClashMode(mode)
      refreshClashConfig()
    } catch (error) {
      showNotice.error(error)
    }
  })

  useEffect(() => {
    if (normalizedMode && !isMode(normalizedMode)) {
      onChangeMode('rule')
    }
  }, [normalizedMode, onChangeMode])

  return (
    <BasePage
      full
      contentStyle={{ height: '100%', overflow: 'hidden', minHeight: 0 }}
      title={t('proxies.page.title.default')}
      header={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <ProviderButton />

          <AppleSegmentedControl
            size="small"
            exclusive
            value={curMode}
            onChange={(_, next) => onChangeMode(next)}
          >
            {MODES.map((mode) => (
              <AppleSegment
                key={mode}
                value={mode}
                sx={{ textTransform: 'capitalize' }}
              >
                {t(`proxies.page.modes.${mode}`)}
              </AppleSegment>
            ))}
          </AppleSegmentedControl>
        </Box>
      }
    >
      <ProxyGroups mode={curMode ?? 'rule'} />
    </BasePage>
  )
}

export default ProxyPage
