import { isTouchDevice, syncTouchDevice } from './device'
import {
  inject,
  markRaw,
  ref,
  type Component,
  type InjectionKey,
  type PropType,
  type Ref,
} from 'vue'

export type Motion = 'auto' | 'full' | 'reduced' | 'none'
export type ComponentMotion = Motion | 'inherit'
export type ThemeTokens = Record<string, string>
export interface AppleTheme {
  scheme: 'light' | 'dark'
  tokens: ThemeTokens
}
export interface AppleGlassSettings {
  opacity: number
  blur: number
}
export const defaultGlassSettings: Readonly<AppleGlassSettings> = Object.freeze(
  { opacity: 30, blur: 12 },
)

function glassSettings(
  value: unknown,
  fallback: AppleGlassSettings,
): AppleGlassSettings {
  const settings =
    value && typeof value === 'object'
      ? (value as Partial<AppleGlassSettings>)
      : {}
  return {
    opacity:
      typeof settings.opacity === 'number' && Number.isFinite(settings.opacity)
        ? Math.min(100, Math.max(0, settings.opacity))
        : fallback.opacity,
    blur:
      typeof settings.blur === 'number' && Number.isFinite(settings.blur)
        ? Math.min(22, Math.max(2, Math.round(settings.blur)))
        : fallback.blur,
  }
}

const light: ThemeTokens = {
  bg: '#f5f5f7',
  surface: '#ffffff',
  'surface-alt': '#f0f0f2',
  text: '#1d1d1f',
  secondary: '#6e6e73',
  border: '#d2d2d7',
  accent: '#0071e3',
  'accent-text': '#ffffff',
  danger: '#c93830',
  success: '#34c759',
  warning: '#ffaa00',
  shadow: '0 8px 28px rgb(0 0 0 / 0.07)',
  radius: '8px',
}
export const builtInThemes: Record<string, AppleTheme> = {
  light: { scheme: 'light', tokens: light },
  dark: {
    scheme: 'dark',
    tokens: {
      ...light,
      bg: '#161617',
      surface: '#222224',
      'surface-alt': '#2b2b2e',
      text: '#eeeeef',
      secondary: '#aaaab0',
      border: '#424246',
      shadow: '0 8px 28px rgb(0 0 0 / 0.22)',
    },
  },
  graphite: {
    scheme: 'light',
    tokens: {
      ...light,
      bg: '#f3f4f4',
      'surface-alt': '#e9eceb',
      accent: '#3f5152',
      'accent-text': '#ffffff',
    },
  },
  rose: {
    scheme: 'light',
    tokens: {
      ...light,
      bg: '#faf7f8',
      'surface-alt': '#f4edf0',
      accent: '#a83b65',
      'accent-text': '#ffffff',
    },
  },
}

export function resolveMotion(
  value: ComponentMotion = 'inherit',
  global: Motion = 'auto',
  reduced = false,
): Exclude<Motion, 'auto'> {
  const mode = value === 'inherit' ? global : value
  if (mode === 'none' || global === 'none') return 'none'
  if (reduced || mode === 'reduced' || global === 'reduced') return 'reduced'
  return 'full'
}
export const motionProps = {
  motion: { type: String as PropType<ComponentMotion>, default: 'inherit' },
}

export function createMessageBus() {
  const listeners = new Map<string, Set<(payload: unknown) => unknown>>()
  return {
    onMessage<T = unknown>(channel: string, listener: (payload: T) => unknown) {
      const bucket = listeners.get(channel) ?? new Set()
      bucket.add(listener as (payload: unknown) => unknown)
      listeners.set(channel, bucket)
      return () => {
        bucket.delete(listener as (payload: unknown) => unknown)
        if (!bucket.size) listeners.delete(channel)
      }
    },
    sendMessage<T = unknown>(channel: string, payload?: T): unknown[] {
      return [...(listeners.get(channel) ?? [])].map((listener) =>
        listener(payload),
      )
    },
    clear() {
      listeners.clear()
    },
  }
}

export interface OverlayOptions {
  kind?: 'dialog' | 'drawer' | 'sheet' | 'snackbar'
  title?: string
  message?: string
  component?: Component
  props?: Record<string, unknown>
  onMessage?: (channel: string, payload: unknown) => unknown
  persistent?: boolean
  confirmText?: string
  cancelText?: string
  tone?: string
  duration?: number
}
export interface OverlayEntry extends OverlayOptions {
  id: string
  kind: NonNullable<OverlayOptions['kind']>
}
export interface OverlayHandle<T = unknown> {
  id: string
  close(value?: T): void
  update(patch: Partial<OverlayOptions>): void
  result: Promise<T | undefined>
}

export function createOverlayService() {
  const entries = ref<OverlayEntry[]>([])
  const resolvers = new Map<string, (value: unknown) => void>()
  let nextId = 0
  const close = (id: string, value?: unknown) => {
    const index = entries.value.findIndex((entry) => entry.id === id)
    if (index < 0) return
    entries.value.splice(index, 1)
    resolvers.get(id)?.(value)
    resolvers.delete(id)
  }
  return {
    entries,
    open<T = unknown>(options: OverlayOptions): OverlayHandle<T> {
      const id = `apple-overlay-${++nextId}`
      const entry = {
        ...options,
        id,
        kind: options.kind ?? 'dialog',
        component: options.component ? markRaw(options.component) : undefined,
      }
      const result = new Promise<T | undefined>((resolve) =>
        resolvers.set(id, resolve as (value: unknown) => void),
      )
      entries.value.push(entry)
      return {
        id,
        result,
        close: (value?: T) => close(id, value),
        update: (patch) => {
          const active = entries.value.find((item) => item.id === id)
          if (active)
            Object.assign(active, {
              ...patch,
              ...(patch.component
                ? { component: markRaw(patch.component) }
                : {}),
            })
        },
      }
    },
    close,
    closeTop(value?: unknown) {
      const entry = [...entries.value]
        .reverse()
        .find((item) => item.kind !== 'snackbar')
      if (entry) close(entry.id, value)
    },
    clear() {
      ;[...entries.value].forEach((entry) => close(entry.id))
    },
  }
}

export interface AppleOptions {
  theme?: string
  themes?: Record<string, AppleTheme>
  motion?: Motion
  ripple?: boolean
  glass?: Partial<AppleGlassSettings>
  persist?: boolean
  storageKey?: string
}

export function createApple(options: AppleOptions = {}) {
  const themes = ref<Record<string, AppleTheme>>(
    Object.fromEntries(
      Object.entries({ ...builtInThemes, ...options.themes }).map(
        ([name, theme]) => [name, { ...theme, tokens: { ...theme.tokens } }],
      ),
    ),
  )
  const systemDark = ref(false)
  const storageKey = options.storageKey ?? 'apptify:preferences'
  const persist = () => {
    if (!options.persist || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          theme: theme.value.name,
          motion: motion.value.mode,
          ripple: ripple.value.enabled,
          glass: { opacity: glass.value.opacity, blur: glass.value.blur },
        }),
      )
    } catch {
      /* Storage may be disabled. */
    }
  }
  const theme = ref({
    name: options.theme ?? 'system',
    get themes(): Record<string, AppleTheme> {
      return themes.value
    },
    get resolved(): string {
      return theme.value.name === 'system'
        ? systemDark.value
          ? 'dark'
          : 'light'
        : theme.value.name
    },
    get current(): AppleTheme {
      return themes.value[theme.value.resolved] ?? themes.value.light
    },
    set(name: string) {
      if (name !== 'system' && !themes.value[name])
        throw new Error(`Unknown Apple theme: ${name}`)
      theme.value.name = name
      persist()
    },
    register(
      name: string,
      tokens: ThemeTokens,
      scheme: 'light' | 'dark' = 'light',
    ) {
      if (name === 'system')
        throw new Error('The theme name "system" is reserved')
      themes.value[name] = {
        scheme,
        tokens: { ...builtInThemes[scheme].tokens, ...tokens },
      }
    },
  })
  if (theme.value.name !== 'system' && !themes.value[theme.value.name])
    throw new Error(`Unknown Apple theme: ${theme.value.name}`)
  const motion = ref({
    mode: options.motion ?? 'auto',
    reduced: false,
    set(mode: Motion) {
      if (mode !== motion.value.mode && (mode === 'reduced' || mode === 'none'))
        ripple.value.enabled = false
      motion.value.mode = mode
      persist()
    },
  })
  const ripple = ref({
    enabled:
      options.motion === 'none'
        ? false
        : (options.ripple ?? options.motion !== 'reduced'),
    set(enabled: boolean) {
      ripple.value.enabled = enabled && motion.value.mode !== 'none'
      persist()
    },
  })
  const glass = ref({
    ...glassSettings(options.glass, defaultGlassSettings),
    set(value: Partial<AppleGlassSettings>) {
      Object.assign(glass.value, glassSettings(value, glass.value))
      persist()
    },
    reset() {
      glass.value.set(defaultGlassSettings)
    },
  })
  const messages = createMessageBus()
  const overlays = createOverlayService()
  const portalTarget: Ref<HTMLElement | undefined> = ref()
  let attached = 0
  let detachMedia = () => {}
  const context = {
    theme,
    motion,
    ripple,
    glass,
    messages,
    overlays,
    portalTarget,
    isTouchDevice,
    dialog: <T = unknown>(settings: Omit<OverlayOptions, 'kind'>) =>
      overlays.open<T>({ ...settings, kind: 'dialog' }),
    notify: (
      message: string,
      settings: Omit<OverlayOptions, 'kind' | 'message'> = {},
    ) =>
      overlays.open({ duration: 4000, ...settings, message, kind: 'snackbar' }),
    sendMessage: messages.sendMessage,
    onMessage: messages.onMessage,
    attach() {
      attached++
      if (attached > 1 || typeof window === 'undefined') return
      syncTouchDevice()
      let hasRipplePreference = typeof options.ripple === 'boolean'
      if (options.persist) {
        try {
          const stored = JSON.parse(
            window.localStorage.getItem(storageKey) ?? '{}',
          )
          if (stored.theme === 'system' || themes.value[stored.theme])
            theme.value.name = stored.theme
          if (['auto', 'full', 'reduced', 'none'].includes(stored.motion))
            motion.value.mode = stored.motion
          if (typeof stored.ripple === 'boolean') {
            ripple.value.enabled = stored.ripple
            hasRipplePreference = true
          } else if (stored.motion === 'reduced') ripple.value.enabled = false
          if (motion.value.mode === 'none') ripple.value.enabled = false
          Object.assign(glass.value, glassSettings(stored.glass, glass.value))
        } catch {
          /* Ignore invalid preferences, not application state. */
        }
      }
      if (!window.matchMedia) return
      const dark = window.matchMedia('(prefers-color-scheme: dark)')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
      let mediaInitialized = false
      const sync = () => {
        systemDark.value = dark.matches
        if (
          reduce.matches &&
          !motion.value.reduced &&
          (mediaInitialized || !hasRipplePreference)
        ) {
          ripple.value.enabled = false
          persist()
        }
        motion.value.reduced = reduce.matches
        mediaInitialized = true
      }
      const storage = (event: StorageEvent) => {
        if (!options.persist || event.key !== storageKey || !event.newValue)
          return
        try {
          const value = JSON.parse(event.newValue)
          if (value.theme === 'system' || themes.value[value.theme])
            theme.value.name = value.theme
          if (['auto', 'full', 'reduced', 'none'].includes(value.motion))
            motion.value.mode = value.motion
          if (typeof value.ripple === 'boolean')
            ripple.value.enabled = value.ripple
          else if (value.motion === 'reduced') ripple.value.enabled = false
          if (motion.value.mode === 'none') ripple.value.enabled = false
          Object.assign(glass.value, glassSettings(value.glass, glass.value))
        } catch {
          /* Other tabs may contain invalid preferences. */
        }
      }
      sync()
      dark.addEventListener('change', sync)
      reduce.addEventListener('change', sync)
      window.addEventListener('storage', storage)
      detachMedia = () => {
        dark.removeEventListener('change', sync)
        reduce.removeEventListener('change', sync)
        window.removeEventListener('storage', storage)
      }
    },
    detach() {
      attached = Math.max(0, attached - 1)
      if (!attached) detachMedia()
    },
    dispose() {
      detachMedia()
      attached = 0
      overlays.clear()
      messages.clear()
    },
  }
  // Keep the old event entry points while giving every app its own channel map.
  for (const channel of ['showSnackbar', 'showSnackBar', 'showMessage']) {
    messages.onMessage<{ text: string; type?: string }>(channel, (value) =>
      context.notify(value.text, { tone: value.type }),
    )
  }
  messages.onMessage<OverlayOptions>('showDiag', (value) =>
    context.dialog(value),
  )
  messages.onMessage('closeDiag', () => overlays.closeTop())
  return markRaw(context)
}
export type AppleContext = ReturnType<typeof createApple>
export const appleKey: InjectionKey<AppleContext> = Symbol('apptify')
export function useApple(): AppleContext {
  const context = inject(appleKey)
  if (!context)
    throw new Error(
      'Install createAppleUI() or wrap components in <apple-provider>.',
    )
  return context
}

export function themeStyle(context: AppleContext): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(context.theme.value.current.tokens).map(([key, value]) => [
        `--apple-${key}`,
        value,
      ]),
    ),
    '--apple-glass-rgb':
      context.theme.value.current.scheme === 'dark' ? '0 0 0' : '255 255 255',
    '--apple-glass-opacity': String(context.glass.value.opacity / 100),
    '--apple-glass-blur': `${context.glass.value.blur}px`,
  }
}
