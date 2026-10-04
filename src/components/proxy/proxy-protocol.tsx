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
  Menu,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import { useEffect, useState, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppleInput } from '@/components/base/apple-input'
import { AppleOption } from '@/components/base/apple-select'
import { useHy2Override } from '@/hooks/use-hy2-override'
import {
  getHy2Settings,
  setHy2Settings,
  type Hy2Congestion,
  type Hy2SettingsResponse,
} from '@/services/hy2'
import { errorDetail } from '@/services/notice-service'
import {
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
  contextOnly = false,
}: {
  member: ResolvedProxyMember
  children: (props: HTMLAttributes<HTMLElement>) => ReactNode
  contextOnly?: boolean
}) {
  const { t } = useTranslation()
  const [node, setNode] = useState<ProxyNodeView | null>(null)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [data, setData] = useState<Hy2SettingsResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isHy2 =
    member.kind === 'node' && member.node.type.toLowerCase() === 'hysteria2'
  const theme = useTheme()
  const hasOverride = useHy2Override(
    isHy2 && !contextOnly ? member.node.source : undefined,
  )

  useEffect(() => {
    if (!position || member.kind !== 'node') return
    let cancelled = false
    getHy2Settings(member.node.source)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((failure) => {
        if (!cancelled) setError(errorDetail(failure))
      })
    return () => {
      cancelled = true
    }
  }, [position, member])

  const selectMode = async (mode: Exclude<Mode, 'brutal'>) => {
    if (!data || busy) return
    setBusy(true)
    setError('')
    try {
      await setHy2Settings(
        data.target,
        mode === 'original'
          ? null
          : {
              congestion: { mode },
              expiresAt:
                data.settings?.expiresAt ??
                Math.floor(nextMidnight().getTime() / 1000),
            },
      )
      setPosition(null)
    } catch (failure) {
      setError(errorDetail(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      component="span"
      sx={{ display: 'contents' }}
      onClick={contextOnly ? undefined : (event) => event.stopPropagation()}
      onKeyDown={contextOnly ? undefined : (event) => event.stopPropagation()}
      onContextMenu={(event) => {
        if (!isHy2) return
        event.preventDefault()
        event.stopPropagation()
        setData(null)
        setError('')
        setPosition({ top: event.clientY, left: event.clientX })
      }}
    >
      {children(
        contextOnly
          ? {}
          : {
              style: {
                ...(hasOverride && {
                  color: theme.palette.warning.main,
                  borderColor: theme.palette.warning.main,
                }),
              },
            },
      )}
      <Menu
        open={Boolean(position)}
        anchorReference="anchorPosition"
        anchorPosition={position ?? undefined}
        onClose={busy ? undefined : () => setPosition(null)}
        onClick={(event) => event.stopPropagation()}
      >
        {(['original', 'standard', 'conservative', 'aggressive'] as const).map(
          (mode) => (
            <AppleOption
              key={mode}
              disabled={!data || busy}
              selected={
                Boolean(data) &&
                (data?.settings?.congestion.mode ?? 'original') === mode
              }
              onClick={() => void selectMode(mode)}
            >
              {t(`proxies.protocol.${mode}`)}
            </AppleOption>
          ),
        )}
        <AppleOption
          disabled={busy}
          onClick={() => {
            if (member.kind !== 'node') return
            setPosition(null)
            setNode(member.node)
          }}
        >
          Brutal...
        </AppleOption>
        {error && (
          <Alert
            severity="error"
            sx={{ maxWidth: 320, overflowWrap: 'anywhere' }}
          >
            {error}
          </Alert>
        )}
      </Menu>
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
  const [mode, setMode] = useState<Mode>('brutal')
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
            <AppleInput
              select
              label={t('proxies.protocol.congestion')}
              value={mode}
              disabled={busy || !data}
              onChange={(event) => setMode(event.target.value as Mode)}
              fullWidth
              size="small"
            >
              <AppleOption value="original">
                {t('proxies.protocol.original')}
              </AppleOption>
              <AppleOption value="standard">
                {t('proxies.protocol.standard')}
              </AppleOption>
              <AppleOption value="conservative">
                {t('proxies.protocol.conservative')}
              </AppleOption>
              <AppleOption value="aggressive">
                {t('proxies.protocol.aggressive')}
              </AppleOption>
              <AppleOption value="brutal">Brutal</AppleOption>
            </AppleInput>
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
                <AppleInput
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
                <AppleInput
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
                <AppleInput
                  select
                  label={t('proxies.protocol.duration')}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  size="small"
                  disabled={busy}
                  fullWidth
                >
                  {data?.settings && (
                    <AppleOption value="keep">
                      {t('proxies.protocol.keepExpiry', {
                        time: new Date(
                          data.settings.expiresAt * 1000,
                        ).toLocaleString(),
                      })}
                    </AppleOption>
                  )}
                  <AppleOption value="midnight">
                    {t('proxies.protocol.midnight')}
                  </AppleOption>
                  <AppleOption value="0.5">
                    {t('proxies.protocol.halfHour')}
                  </AppleOption>
                  <AppleOption value="1">
                    {t('proxies.protocol.oneHour')}
                  </AppleOption>
                  <AppleOption value="6">
                    {t('proxies.protocol.sixHours')}
                  </AppleOption>
                  <AppleOption value="24">
                    {t('proxies.protocol.oneDay')}
                  </AppleOption>
                  <AppleOption value="custom">
                    {t('proxies.protocol.custom')}
                  </AppleOption>
                </AppleInput>
                {duration === 'custom' && (
                  <AppleInput
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
