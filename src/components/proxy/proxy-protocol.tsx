import { CloseRounded } from '@mui/icons-material'
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from '@mui/material'
import {
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from 'react-i18next'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import { AppleButton as Button } from '@/components/base/apple-button'
import { AppleDatePicker } from '@/components/base/apple-date-picker'
import { AppleInput } from '@/components/base/apple-input'
import { AppleOption, AppleSelect } from '@/components/base/apple-select'
import { AppleSlider } from '@/components/base/apple-slider'
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

const BANDWIDTH_MAX = 2000
const bandwidthStops = [1, 5, 10, 30, 50, 100, 200, 300, 500, 1000, 2000]
const bandwidthIndex = (value: number) =>
  bandwidthStops.reduce(
    (nearest, stop, index) =>
      Math.abs(stop - value) < Math.abs(bandwidthStops[nearest] - value)
        ? index
        : nearest,
    0,
  )
const formatBandwidth = (index: number) => `${bandwidthStops[index]} Mbps`
const bandwidthValid = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0

const fieldRowSx = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 240px)',
  alignItems: 'center',
  gap: 2,
  '@media (max-width: 420px)': { gridTemplateColumns: '1fr', gap: 1 },
}

function BandwidthControl({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const { t } = useTranslation()
  const invalid = value !== '' && !bandwidthValid(value)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {label}
        </Typography>
        <AppleInput
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          error={invalid}
          placeholder="—"
          suffix="Mbps"
          slotProps={{
            htmlInput: {
              'aria-label': `${label} (Mbps)`,
              min: 0,
              step: 'any',
              onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
                if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
                event.preventDefault()
                const current = Number(value) || 0
                const next =
                  event.key === 'ArrowUp'
                    ? (bandwidthStops.find((stop) => stop > current) ??
                      current + 100)
                    : current > BANDWIDTH_MAX
                      ? Math.max(BANDWIDTH_MAX, current - 100)
                      : (bandwidthStops
                          .filter((stop) => stop < current)
                          .at(-1) ?? 1)
                onChange(String(next))
              },
            },
          }}
          sx={{
            width: 136,
            '& .apple-input-wrap': {
              borderColor: 'transparent',
              bgcolor: 'transparent',
              '&:hover': { borderColor: 'divider' },
              '&:focus-within': { borderColor: 'primary.main' },
            },
            '& .apple-control': {
              textAlign: 'right',
              fontSize: 14,
              fontVariantNumeric: 'tabular-nums',
              px: 0.75,
            },
            '& .apple-input__affix': {
              pl: 0,
              pr: 0.75,
              maxWidth: 'none',
              fontSize: 14,
            },
          }}
        />
      </Box>
      <AppleSlider
        aria-label={label}
        min={0}
        max={bandwidthStops.length - 1}
        step={1}
        value={bandwidthIndex(Number(value) || 1)}
        formatValue={formatBandwidth}
        onChange={(next) => onChange(String(bandwidthStops[next]))}
        disabled={disabled}
      />
      {invalid && (
        <Typography variant="caption" color="error" role="alert">
          {t('proxies.protocol.bandwidthRange')}
        </Typography>
      )}
    </Box>
  )
}

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
              expiresAt: Math.floor(nextMidnight().getTime() / 1000),
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
        onKeyDown={(event) => event.stopPropagation()}
      >
        {(['original', 'standard', 'conservative', 'aggressive'] as const).map(
          (mode) => (
            <MenuItem
              key={mode}
              disabled={!data || busy}
              onClick={() => void selectMode(mode)}
            >
              {t(
                mode === 'original'
                  ? 'proxies.protocol.original'
                  : `proxies.protocol.${mode}UntilMidnight`,
              )}
            </MenuItem>
          ),
        )}
        <MenuItem
          disabled={busy}
          onClick={() => {
            if (member.kind !== 'node') return
            setPosition(null)
            setNode(member.node)
          }}
        >
          {t('proxies.protocol.brutalAndMore')}
        </MenuItem>
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
          setMode(congestion.mode)
          if (congestion.mode === 'brutal') {
            setUp(congestion.up === null ? '' : String(congestion.up))
            setDown(congestion.down === null ? '' : String(congestion.down))
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

  const upInvalid = mode === 'brutal' && !bandwidthValid(up)
  const downInvalid = mode === 'brutal' && !bandwidthValid(down)
  const applied = data?.settings
  const currentStatus = !data
    ? t('proxies.protocol.unavailable')
    : !applied
      ? t('proxies.protocol.original')
      : [
          applied.congestion.mode === 'brutal'
            ? `Brutal · ↑${applied.congestion.up ?? '—'} / ↓${applied.congestion.down ?? '—'} Mbps`
            : t(`proxies.protocol.${applied.congestion.mode}`),
          t('proxies.protocol.keepExpiry', {
            time: new Date(applied.expiresAt * 1000).toLocaleString(undefined, {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          }),
        ].join(' · ')
  const expiry = () => {
    if (duration === 'keep') return data?.settings?.expiresAt ?? 0
    if (duration === 'midnight')
      return Math.floor(nextMidnight().getTime() / 1000)
    if (duration === 'custom')
      return Math.floor(new Date(custom).getTime() / 1000)
    return Math.floor(Date.now() / 1000) + Number(duration) * 3600
  }
  const save = async () => {
    if (!data || busy || upInvalid || downInvalid) return
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
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: { sx: { width: 500, maxWidth: 'calc(100% - 32px)' } },
      }}
      aria-labelledby="hy2-settings-title"
    >
      <DialogTitle
        id="hy2-settings-title"
        sx={{ pl: 4, pr: 8, pt: 3, pb: 1, position: 'relative' }}
      >
        {t('proxies.protocol.title')}
        <IconButton
          aria-label={t('shared.actions.close')}
          onClick={onClose}
          disabled={busy}
          size="small"
          sx={{ position: 'absolute', right: 24, top: 20 }}
        >
          <CloseRounded />
        </IconButton>
      </DialogTitle>
      <Box sx={{ px: 4, pt: 2, pb: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, overflowWrap: 'anywhere' }}
        >
          {node.name}
        </Typography>
        {!loading && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5, overflowWrap: 'anywhere' }}
          >
            {t('proxies.protocol.current', { value: currentStatus })}
          </Typography>
        )}
      </Box>
      <DialogContent sx={{ px: 4, pt: 3, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Stack spacing={3.5}>
            {error && (
              <Alert severity="error" sx={{ overflowWrap: 'anywhere' }}>
                {error}
              </Alert>
            )}
            <Box sx={fieldRowSx}>
              <Typography variant="body2">
                {t('proxies.protocol.congestion')}
              </Typography>
              <AppleSelect
                aria-label={t('proxies.protocol.congestion')}
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
              </AppleSelect>
            </Box>
            {mode === 'brutal' && (
              <Stack spacing={3}>
                <BandwidthControl
                  label={t('proxies.protocol.uploadLabel')}
                  value={up}
                  onChange={setUp}
                  disabled={busy}
                />
                <BandwidthControl
                  label={t('proxies.protocol.downloadLabel')}
                  value={down}
                  onChange={setDown}
                  disabled={busy}
                />
              </Stack>
            )}
            {mode !== 'original' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Box sx={fieldRowSx}>
                  <Typography variant="body2">
                    {t('proxies.protocol.duration')}
                  </Typography>
                  <AppleSelect
                    aria-label={t('proxies.protocol.duration')}
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
                      {t('proxies.protocol.midnightShort')}
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
                  </AppleSelect>
                </Box>
                {duration === 'custom' && (
                  <AppleDatePicker
                    label={t('proxies.protocol.expiresAt')}
                    type="datetime-local"
                    value={custom}
                    onChange={setCustom}
                    disabled={busy}
                  />
                )}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 4, pt: 2, pb: 3, gap: 1.5 }}>
        <Button
          variant="text"
          color="inherit"
          onClick={onClose}
          disabled={busy}
        >
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
