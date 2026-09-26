import { RefreshRounded, StorageOutlined } from '@mui/icons-material'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
  styled,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import dayjs from 'dayjs'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateRuleProvider } from 'tauri-plugin-mihomo-api'

import { useAppRefreshers, useRulesData } from '@/providers/app-data-context'
import { syncRuntimeProviders } from '@/services/cmds'
import { showNotice } from '@/services/notice-service'

const TypeBox = styled(Box)<{ component?: React.ElementType }>(({ theme }) => ({
  display: 'inline-block',
  border: '1px solid #ccc',
  borderColor: theme.palette.divider,
  color: theme.palette.text.secondary,
  borderRadius: 4,
  fontSize: 11,
  fontFamily: theme.typography.fontFamily,
  fontWeight: 500,
  marginRight: '4px',
  padding: '0 2px',
  lineHeight: 1.25,
}))

export const ProviderButton = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { ruleProviders } = useRulesData()
  const { refreshRules, refreshRuleProviders } = useAppRefreshers()
  const [updating, setUpdating] = useState<Record<string, boolean>>({})

  const hasProviders = Object.keys(ruleProviders || {}).length > 0

  const updateProvider = useLockFn(async (name: string) => {
    try {
      setUpdating((prev) => ({ ...prev, [name]: true }))

      await updateRuleProvider(name)

      await refreshRules()
      await refreshRuleProviders()
      void syncRuntimeProviders()

      showNotice.success(
        'rules.feedback.notifications.provider.updateSuccess',
        {
          name,
        },
      )
    } catch (err) {
      showNotice.error('rules.feedback.notifications.provider.updateFailed', {
        name,
        message: String(err),
      })
    } finally {
      setUpdating((prev) => ({ ...prev, [name]: false }))
    }
  })

  const updateAllProviders = useLockFn(async () => {
    try {
      const allProviders = Object.keys(ruleProviders || {})
      if (allProviders.length === 0) {
        showNotice.info('rules.feedback.notifications.provider.none')
        return
      }

      const newUpdating = allProviders.reduce(
        (acc, key) => {
          acc[key] = true
          return acc
        },
        {} as Record<string, boolean>,
      )
      setUpdating(newUpdating)

      for (const name of allProviders) {
        try {
          await updateRuleProvider(name)
          setUpdating((prev) => ({ ...prev, [name]: false }))
        } catch (err) {
          console.error(`更新 ${name} 失败`, err)
        }
      }

      await refreshRules()
      await refreshRuleProviders()
      void syncRuntimeProviders()

      showNotice.success('rules.feedback.notifications.provider.allUpdated')
    } catch (err) {
      showNotice.error('rules.feedback.notifications.provider.genericError', {
        message: String(err),
      })
    } finally {
      setUpdating({})
    }
  })

  const handleClose = () => {
    setOpen(false)
  }

  if (!hasProviders) return null

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<StorageOutlined />}
        onClick={() => setOpen(true)}
      >
        {t('rules.page.provider.trigger')}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('rules.page.provider.dialogTitle')}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={updateAllProviders}
            >
              {t('rules.page.provider.actions.updateAll')}
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 0, py: 0 }}>
          <List sx={{ py: 0, minHeight: 250 }}>
            {Object.entries(ruleProviders || {})
              .sort()
              .map(([key, item]) => {
                const provider = item
                const time = dayjs(provider.updatedAt)
                const isUpdating = updating[key]

                return (
                  <ListItem
                    key={key}
                    sx={{
                      p: 0,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemText
                      sx={{ px: 2.5, py: 1.5, minWidth: 0 }}
                      slotProps={{
                        primary: { component: 'div' },
                        secondary: { component: 'div' },
                      }}
                      primary={
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            component="div"
                            noWrap
                            title={key}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              minWidth: 0,
                              gap: 0.5,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                mr: 0.5,
                                fontWeight: 500,
                              }}
                            >
                              {key}
                            </Box>
                            <TypeBox component="span">
                              {provider.ruleCount}
                            </TypeBox>
                          </Typography>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {t('shared.labels.updateAt')}: {time.fromNow()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex' }}>
                          <TypeBox component="span">
                            {typeof provider.vehicleType === 'string'
                              ? provider.vehicleType
                              : provider.vehicleType.Unknown}
                          </TypeBox>
                          <TypeBox component="span">
                            {typeof provider.behavior === 'string'
                              ? provider.behavior
                              : provider.behavior.Unknown}
                          </TypeBox>
                        </Box>
                      }
                    />
                    <Box
                      sx={{
                        width: 44,
                        mr: 1,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => updateProvider(key)}
                        disabled={isUpdating}
                        aria-label={t('rules.page.provider.actions.update')}
                        sx={{
                          animation: isUpdating
                            ? 'spin 1s linear infinite'
                            : 'none',
                          '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' },
                          },
                        }}
                        title={t('rules.page.provider.actions.update')}
                      >
                        <RefreshRounded />
                      </IconButton>
                    </Box>
                  </ListItem>
                )
              })}
          </List>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} variant="outlined">
            {t('shared.actions.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
