import { AddRounded, Delete as DeleteIcon } from '@mui/icons-material'
import { Box, Button, IconButton, ListItem } from '@mui/material'
import { useLockFn, useRequest } from 'ahooks'
import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, Switch } from '@/components/base'
import { AppleInput } from '@/components/base/apple-input'
import { useClash } from '@/hooks/use-clash'
import { restartCore } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'

import { SettingForm } from './setting-comp'

// Development origins must never be persisted into production configuration.
const DEV_URLS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'http://localhost:3000',
]

const getFullOrigins = (origins: string[]) => {
  const allOrigins = [...origins, ...DEV_URLS]
  const uniqueOrigins = [...new Set(allOrigins)]
  return uniqueOrigins
}

const filterBaseOriginsForUI = (origins: string[]) => {
  return origins.filter((origin: string) => !DEV_URLS.includes(origin.trim()))
}

interface ClashHeaderConfigingRef {
  open: () => void
  close: () => void
}

interface AllowOriginItem {
  key: number
  value: string
}

export const HeaderConfiguration = forwardRef<ClashHeaderConfigingRef>(
  (props, ref) => {
    const { t } = useTranslation()
    const { clash, mutateClash, patchClash } = useClash()
    const [open, setOpen] = useState(false)

    const lastKeyRef = useRef(0) // 用于生成唯一的key

    const [corsConfig, setCorsConfig] = useState<{
      allowPrivateNetwork: boolean
      allowOrigins: AllowOriginItem[]
    }>(() => {
      const cors = clash?.['external-controller-cors']
      const origins = cors?.['allow-origins'] ?? []
      return {
        allowPrivateNetwork: cors?.['allow-private-network'] ?? true,
        allowOrigins: filterBaseOriginsForUI(origins).map((origin) => {
          lastKeyRef.current += 1
          return { key: lastKeyRef.current, value: origin }
        }),
      }
    })

    const handleCorsConfigChange = (
      key: 'allowPrivateNetwork' | 'allowOrigins',
      value: boolean | AllowOriginItem[],
    ) => {
      setCorsConfig((prev) => ({
        ...prev,
        [key]: value,
      }))
    }

    const handleAddOrigin = () => {
      lastKeyRef.current += 1
      handleCorsConfigChange('allowOrigins', [
        ...corsConfig.allowOrigins,
        { key: lastKeyRef.current, value: '' },
      ])
    }

    const handleUpdateOrigin = (index: number, value: string) => {
      const newOrigins = [...corsConfig.allowOrigins]
      newOrigins[index] = { ...newOrigins[index], value }
      handleCorsConfigChange('allowOrigins', newOrigins)
    }

    const handleDeleteOrigin = (index: number) => {
      const newOrigins = [...corsConfig.allowOrigins]
      newOrigins.splice(index, 1)
      handleCorsConfigChange('allowOrigins', newOrigins)
    }

    const { loading, run: saveConfig } = useRequest(
      async () => {
        const fullOrigins = getFullOrigins(
          corsConfig.allowOrigins.map((origin) => origin.value),
        )

        await patchClash({
          'external-controller-cors': {
            'allow-private-network': corsConfig.allowPrivateNetwork,
            'allow-origins': fullOrigins.filter(
              (origin: string) => origin.trim() !== '',
            ),
          },
        })
        await restartCore()
        await mutateClash()
      },
      {
        manual: true,
        onSuccess: () => {
          setOpen(false)
          showNotice.success('shared.feedback.notifications.common.saveSuccess')
        },
        onError: () => {
          showNotice.error('shared.feedback.notifications.common.saveFailed')
        },
      },
    )

    useImperativeHandle(ref, () => ({
      open: () => {
        const cors = clash?.['external-controller-cors']
        const origins = cors?.['allow-origins'] ?? []
        lastKeyRef.current = 0
        setCorsConfig({
          allowPrivateNetwork: cors?.['allow-private-network'] ?? true,
          allowOrigins: filterBaseOriginsForUI(origins).map((origin) => {
            lastKeyRef.current += 1
            return { key: lastKeyRef.current, value: origin }
          }),
        })
        setOpen(true)
      },
      close: () => setOpen(false),
    }))

    const handleSave = useLockFn(async () => {
      await saveConfig()
    })

    return (
      <BaseDialog
        open={open}
        title={t('settings.sections.externalCors.title')}
        contentSx={{ width: 520, maxWidth: '100%' }}
        okBtn={loading ? t('shared.statuses.saving') : t('shared.actions.save')}
        cancelBtn={t('shared.actions.cancel')}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
      >
        <SettingForm>
          <ListItem sx={{ padding: '8px 0' }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                gap: 2,
              }}
            >
              <span style={{ fontWeight: 'normal' }}>
                {t('settings.sections.externalCors.fields.allowPrivateNetwork')}
              </span>
              <Switch
                edge="end"
                checked={corsConfig.allowPrivateNetwork}
                onChange={(e) =>
                  handleCorsConfigChange(
                    'allowPrivateNetwork',
                    e.target.checked,
                  )
                }
              />
            </Box>
          </ListItem>

          <ListItem sx={{ padding: '8px 0' }}>
            <div style={{ width: '100%' }}>
              <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                {t('settings.sections.externalCors.fields.allowedOrigins')}
              </div>
              {corsConfig.allowOrigins.map(({ key, value: origin }, index) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <AppleInput
                    fullWidth
                    size="small"
                    sx={{ marginRight: 1 }}
                    value={origin}
                    onChange={(e) => handleUpdateOrigin(index, e.target.value)}
                    placeholder={t(
                      'settings.sections.externalCors.placeholders.origin',
                    )}
                    slotProps={{
                      htmlInput: {
                        'aria-label': t(
                          'settings.sections.externalCors.fields.allowedOrigins',
                        ),
                      },
                    }}
                  />
                  <IconButton
                    size="small"
                    title={t('shared.actions.delete')}
                    aria-label={t('shared.actions.delete')}
                    onClick={() => handleDeleteOrigin(index)}
                    disabled={corsConfig.allowOrigins.length <= 0}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddRounded />}
                onClick={handleAddOrigin}
              >
                {t('settings.sections.externalCors.actions.add')}
              </Button>

              <Box
                sx={{
                  mt: 1.5,
                  color: 'text.secondary',
                  fontSize: 12,
                  overflowWrap: 'anywhere',
                }}
              >
                {t('settings.sections.externalCors.messages.alwaysIncluded', {
                  urls: DEV_URLS.join(', '),
                })}
              </Box>
            </div>
          </ListItem>
        </SettingForm>
      </BaseDialog>
    )
  },
)
