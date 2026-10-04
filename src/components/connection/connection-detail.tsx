import { CloseRounded } from '@mui/icons-material'
import { Box, Chip, Drawer, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import dayjs from 'dayjs'
import { useCallback, useImperativeHandle, useState, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { closeConnection } from 'tauri-plugin-mihomo-api'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import { AppleButton as Button } from '@/components/base/apple-button'
import parseTraffic from '@/utils/parse-traffic'

export interface ConnectionDetailRef {
  open: (detail: IConnectionsItem, closed: boolean) => void
  close: () => void
}

export function ConnectionDetail({ ref }: { ref?: Ref<ConnectionDetailRef> }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<IConnectionsItem | null>(null)
  const [closed, setClosed] = useState(false)
  const { t } = useTranslation()

  const onClose = useCallback(() => {
    setOpen(false)
    setDetail(null)
    setClosed(false)
  }, [])

  useImperativeHandle(ref, () => ({
    open: (detail: IConnectionsItem, closed: boolean) => {
      if (open) return
      setOpen(true)
      setDetail(detail)
      setClosed(closed)
    },
    close: onClose,
  }))

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 460,
            maxWidth: '100vw',
            borderRadius: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {t('connections.page.title')}
        </Typography>
        <Chip
          size="small"
          label={t(
            closed
              ? 'connections.components.actions.closed'
              : 'connections.components.actions.active',
          )}
          variant="outlined"
        />
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t('shared.actions.close')}
        >
          <CloseRounded fontSize="small" />
        </IconButton>
      </Box>
      {detail && (
        <InnerConnectionDetail
          data={detail}
          closed={closed}
          onClose={onClose}
        />
      )}
    </Drawer>
  )
}

interface InnerProps {
  data: IConnectionsItem
  closed: boolean
  onClose?: () => void
}

const InnerConnectionDetail = ({ data, closed, onClose }: InnerProps) => {
  const { t } = useTranslation()
  const { metadata, rulePayload } = data
  const chains = [...data.chains].reverse().join(' / ')
  const rule = rulePayload ? `${data.rule}(${rulePayload})` : data.rule
  const hostAddress =
    metadata.host || metadata.destinationIP || metadata.remoteDestination
  const host = `${hostAddress}:${metadata.destinationPort}`
  const Destination = metadata.destinationIP
    ? metadata.destinationIP
    : metadata.remoteDestination

  const information = [
    { label: t('connections.components.fields.host'), value: host },
    {
      label: t('shared.labels.downloaded'),
      value: parseTraffic(data.download).join(' '),
    },
    {
      label: t('shared.labels.uploaded'),
      value: parseTraffic(data.upload).join(' '),
    },
    {
      label: t('connections.components.fields.dlSpeed'),
      value: parseTraffic(data.curDownload ?? -1).join(' ') + '/s',
    },
    {
      label: t('connections.components.fields.ulSpeed'),
      value: parseTraffic(data.curUpload ?? -1).join(' ') + '/s',
    },
    {
      label: t('connections.components.fields.chains'),
      value: chains,
    },
    { label: t('connections.components.fields.rule'), value: rule },
    {
      label: t('connections.components.fields.process'),
      value: `${metadata.process}${metadata.processPath ? `(${metadata.processPath})` : ''}`,
    },
    {
      label: t('connections.components.fields.time'),
      value: dayjs(data.start).fromNow(),
    },
    {
      label: t('connections.components.fields.source'),
      value: `${metadata.sourceIP}:${metadata.sourcePort}`,
    },
    {
      label: t('connections.components.fields.destination'),
      value: Destination,
    },
    {
      label: t('connections.components.fields.destinationPort'),
      value: `${metadata.destinationPort}`,
    },
    {
      label: t('connections.components.fields.type'),
      value: `${metadata.type}(${metadata.network})`,
    },
  ]

  const onDelete = useLockFn(async () => closeConnection(data.id))

  return (
    <Box
      sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      <Box
        component="dl"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          m: 0,
          px: 2.5,
          userSelect: 'text',
        }}
      >
        {information.map((each) => (
          <Box
            key={each.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: '100px minmax(0, 1fr)',
              gap: 2,
              py: 1.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              {each.label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{
                m: 0,
                overflowWrap: 'anywhere',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {each.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {!closed && (
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <Button
            variant="contained"
            color="error"
            title={t('connections.components.actions.closeConnection')}
            onClick={() => {
              onDelete()
              onClose?.()
            }}
          >
            {t('connections.components.actions.closeConnection')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
