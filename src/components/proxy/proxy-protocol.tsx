import { CloseRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getHy2Settings,
  setHy2Settings,
  type Hy2Congestion,
  type Hy2SettingsResponse,
} from '@/services/hy2'
import { errorDetail } from '@/services/notice-service'
import {
  memberDetails,
  type ProxyNodeView,
  type ResolvedProxyMember,
} from '@/types/proxy-view'

type Mode = 'original' | Hy2Congestion['mode']

function localDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nextMidnight() {
  const date = new Date()
  date.setHours(24, 0, 0, 0)
  return date
}

export function ProxyProtocol({
  member,
  children,
}: {
  member: ResolvedProxyMember
  children: (props: HTMLAttributes<HTMLElement>) => ReactNode
}) {
  const { t } = useTranslation()
  const [node, setNode] = useState<ProxyNodeView | null>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const type =
    member.kind === 'unresolved'
      ? member.ref.reason
      : memberDetails(member)?.type

  const open = (element: HTMLElement) => {
    if (
      member.kind === 'node' &&
      member.node.type.toLowerCase() === 'hysteria2'
    ) {
      setNode(member.node)
    } else {
      setAnchor(element)
    }
  }

  return (
    <Box
      component="span"
      sx={{ display: 'contents' }}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children({
        role: 'button',
        tabIndex: member.kind === 'unresolved' ? -1 : 0,
        'aria-label': t('proxies.protocol.settings', { protocol: type }),
        style: { cursor: 'pointer' },
        onClick: (event) => {
          event.preventDefault()
          open(event.currentTarget)
        },
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open(event.currentTarget)
          }
        },
      })}
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { maxWidth: 'min(320px, calc(100vw - 32px))' } },
        }}
      >
        <Typography
          variant="body2"
          sx={{ px: 2, py: 1.5, overflowWrap: 'anywhere' }}
        >
          {t('proxies.protocol.unavailable')}
        </Typography>
      </Popover>
      {node && <Hy2Dialog node={node} onClose={() => setNode(null)} />}
    </Box>
  )
}

function Hy2Dialog({
  node,
  onClose,
}: {
  node: ProxyNodeView
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [data, setData] = useState<Hy2SettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('original')
  const [up, setUp] = useState('')
  const [down, setDown] = useState('')
  const [duration, setDuration] = useState('midnight')
  const [custom, setCustom] = useState(() => localDateTime(nextMidnight()))

  useEffect(() => {
    let cancelled = false
    getHy2Settings(node.source)
      .then((result) => {
        if (cancelled) return
        setData(result)
        if (result.settings) {
          const { congestion, expiresAt } = result.settings
          setMode(congestion.mode)
          if (congestion.mode === 'brutal') {
            setUp(String(congestion.up))
            setDown(String(congestion.down))
          }
          setDuration('keep')
          setCustom(localDateTime(new Date(expiresAt * 1000)))
        }
      })
      .catch((failure) => {
        if (!cancelled) setError(errorDetail(failure))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [node.source])

  const bandwidthValid = (value: string) =>
    Number.isFinite(Number(value)) &&
    Number(value) >= 0.01 &&
    Number(value) <= 1_000_000
  const upInvalid = mode === 'brutal' && !bandwidthValid(up)
  const downInvalid = mode === 'brutal' && !bandwidthValid(down)
  const expiry = () => {
    if (duration === 'keep') return data?.settings?.expiresAt ?? 0
    if (duration === 'midnight')
      return Math.floor(nextMidnight().getTime() / 1000)
    if (duration === 'custom')
      return Math.floor(new Date(custom).getTime() / 1000)
    return Math.floor(Date.now() / 1000) + Number(duration) * 3600
  }
  const save = async () => {
    if (!data || busy) return
    const expiresAt = expiry()
    if (
      mode !== 'original' &&
      (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000)
    ) {
      setError(t('proxies.protocol.invalidExpiry'))
      return
    }
    setBusy(true)
    setError('')
    try {
      await setHy2Settings(
        data.target,
        mode === 'original'
          ? null
          : {
              congestion:
                mode === 'brutal'
                  ? { mode, up: Number(up), down: Number(down) }
                  : { mode },
              expiresAt,
            },
      )
      onClose()
    } catch (failure) {
      setError(errorDetail(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="hy2-settings-title"
    >
      <DialogTitle id="hy2-settings-title" sx={{ pr: 6, position: 'relative' }}>
        {t('proxies.protocol.title')}
        <IconButton
          aria-label={t('shared.actions.close')}
          onClick={onClose}
          disabled={busy}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 600,
            overflowWrap: 'anywhere',
          }}
        >
          {node.name}
        </Typography>
        <Chip
          label="Hysteria2"
          variant="outlined"
          size="small"
          sx={{ flexShrink: 0 }}
        />
      </Box>
      <DialogContent sx={{ py: 2.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {error && (
              <Alert severity="error" sx={{ overflowWrap: 'anywhere' }}>
                {error}
              </Alert>
            )}
            <TextField
              select
              label={t('proxies.protocol.congestion')}
              value={mode}
              disabled={busy || !data}
              onChange={(event) => setMode(event.target.value as Mode)}
              fullWidth
              size="small"
            >
              <MenuItem value="original">
                {t('proxies.protocol.original')}
              </MenuItem>
              <MenuItem value="standard">
                {t('proxies.protocol.standard')}
              </MenuItem>
              <MenuItem value="conservative">
                {t('proxies.protocol.conservative')}
              </MenuItem>
              <MenuItem value="aggressive">
                {t('proxies.protocol.aggressive')}
              </MenuItem>
              <MenuItem value="brutal">Brutal</MenuItem>
            </TextField>
            {mode === 'brutal' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label={t('proxies.protocol.upload')}
                  type="number"
                  size="small"
                  value={up}
                  onChange={(event) => setUp(event.target.value)}
                  disabled={busy}
                  error={Boolean(up) && upInvalid}
                  slotProps={{
                    htmlInput: { min: 0.01, max: 1000000, step: 'any' },
                  }}
                />
                <TextField
                  label={t('proxies.protocol.download')}
                  type="number"
                  size="small"
                  value={down}
                  onChange={(event) => setDown(event.target.value)}
                  disabled={busy}
                  error={Boolean(down) && downInvalid}
                  slotProps={{
                    htmlInput: { min: 0.01, max: 1000000, step: 'any' },
                  }}
                />
              </Box>
            )}
            {mode !== 'original' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <TextField
                  select
                  label={t('proxies.protocol.duration')}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  size="small"
                  disabled={busy}
                  fullWidth
                >
                  {data?.settings && (
                    <MenuItem value="keep">
                      {t('proxies.protocol.keepExpiry', {
                        time: new Date(
                          data.settings.expiresAt * 1000,
                        ).toLocaleString(),
                      })}
                    </MenuItem>
                  )}
                  <MenuItem value="midnight">
                    {t('proxies.protocol.midnight')}
                  </MenuItem>
                  <MenuItem value="0.5">
                    {t('proxies.protocol.halfHour')}
                  </MenuItem>
                  <MenuItem value="1">{t('proxies.protocol.oneHour')}</MenuItem>
                  <MenuItem value="6">
                    {t('proxies.protocol.sixHours')}
                  </MenuItem>
                  <MenuItem value="24">{t('proxies.protocol.oneDay')}</MenuItem>
                  <MenuItem value="custom">
                    {t('proxies.protocol.custom')}
                  </MenuItem>
                </TextField>
                {duration === 'custom' && (
                  <TextField
                    label={t('proxies.protocol.expiresAt')}
                    type="datetime-local"
                    value={custom}
                    onChange={(event) => setCustom(event.target.value)}
                    size="small"
                    disabled={busy}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ '& input': { fontSize: 14, minWidth: 0 } }}
                    fullWidth
                  />
                )}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {t('shared.actions.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => void save()}
          disabled={loading || busy || !data || upInvalid || downInvalid}
        >
          {busy ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            t('shared.actions.save')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
