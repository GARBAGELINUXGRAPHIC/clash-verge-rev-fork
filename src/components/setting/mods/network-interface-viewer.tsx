import { ContentCopyRounded } from '@mui/icons-material'
import { Box, CircularProgress, Typography } from '@mui/material'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import type { Ref } from 'react'
import { useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, BaseEmpty, DialogRef } from '@/components/base'
import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'
import { useNetworkInterfaces } from '@/hooks/use-network'
import { showNotice } from '@/services/notice-service'

export function NetworkInterfaceViewer({ ref }: { ref?: Ref<DialogRef> }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isV4, setIsV4] = useState(true)

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true)
    },
    close: () => setOpen(false),
  }))

  const { networkInterfaces, loading } = useNetworkInterfaces()
  const isEmpty = networkInterfaces.length === 0
  const getAddressIp = (address: IAddress) =>
    isV4 ? address.V4?.ip : address.V6?.ip

  return (
    <BaseDialog
      open={open}
      title={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {t('settings.modals.networkInterface.title')}
          <AppleSegmentedControl
            exclusive
            value={isV4 ? 'v4' : 'v6'}
            onChange={(_, value: string | null) =>
              value && setIsV4(value === 'v4')
            }
          >
            <AppleSegment value="v4">IPv4</AppleSegment>
            <AppleSegment value="v6">IPv6</AppleSegment>
          </AppleSegmentedControl>
        </Box>
      }
      contentSx={{ width: 560, maxWidth: '100%' }}
      disableOk
      cancelBtn={t('shared.actions.close')}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    >
      {loading && isEmpty ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : isEmpty ? (
        <Box sx={{ minHeight: 160 }}>
          <BaseEmpty />
        </Box>
      ) : (
        networkInterfaces.map((item) => (
          <Box
            key={item.name}
            sx={{
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-child': { borderBottom: 0 },
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {item.name}
            </Typography>
            <Box>
              {item.addr.map((address) => {
                const ip = getAddressIp(address)
                return (
                  ip && (
                    <AddressDisplay
                      key={ip}
                      label={t(
                        'settings.modals.networkInterface.fields.ipAddress',
                      )}
                      content={ip}
                    />
                  )
                )
              })}
              <AddressDisplay
                label={t('settings.modals.networkInterface.fields.macAddress')}
                content={item.mac_addr ?? ''}
              />
            </Box>
          </Box>
        ))
      )}
    </BaseDialog>
  )
}

const AddressDisplay = ({
  label,
  content,
}: {
  label: string
  content: string
}) => {
  const { t } = useTranslation()
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        margin: '8px 0',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Box
        sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.5 }}
      >
        <Typography
          variant="body2"
          sx={{
            minWidth: 0,
            overflowWrap: 'anywhere',
            userSelect: 'text',
            fontFamily: 'monospace',
          }}
        >
          {content}
        </Typography>
        <IconButton
          size="small"
          aria-label={t('settings.sections.externalController.tooltips.copy')}
          title={t('settings.sections.externalController.tooltips.copy')}
          onClick={async () => {
            await writeText(content)
            showNotice.success(
              'shared.feedback.notifications.common.copySuccess',
            )
          }}
        >
          <ContentCopyRounded sx={{ fontSize: '18px' }} />
        </IconButton>
      </Box>
    </Box>
  )
}
