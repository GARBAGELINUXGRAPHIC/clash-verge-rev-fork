// vendor/apptify/src/core/popup-motion.ts
import {
  getCurrentInstance,
  h,
  Transition,
  withDirectives as withDirectives2,
} from 'vue'

// vendor/apptify/src/core/motion.ts
import { watch, withDirectives } from 'vue'
import { Ripple } from 'vuetify/directives/ripple'

// vendor/apptify/src/core/device.ts
import { readonly, ref } from 'vue'
var touchDeviceQuery = '(any-pointer: coarse)'
var detectTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.navigator.maxTouchPoints > 0 ||
    (window.matchMedia?.(touchDeviceQuery).matches ?? false))
var touchDevice = ref(detectTouchDevice())
var isTouchDevice = readonly(touchDevice)
var media
function syncTouchDevice() {
  if (typeof window === 'undefined') return
  touchDevice.value = detectTouchDevice()
  document.documentElement.toggleAttribute(
    'data-apple-touch',
    touchDevice.value,
  )
}
if (typeof window !== 'undefined') {
  syncTouchDevice()
  media = window.matchMedia?.(touchDeviceQuery)
  media?.addEventListener?.('change', syncTouchDevice)
  window.addEventListener('pageshow', syncTouchDevice)
}
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    media?.removeEventListener?.('change', syncTouchDevice)
    window.removeEventListener('pageshow', syncTouchDevice)
  })

// vendor/apptify/src/core/context.ts
import { inject, markRaw, ref as ref2 } from 'vue'
var defaultGlassSettings = Object.freeze({ opacity: 30, blur: 12 })
function glassSettings(value, fallback) {
  const settings = value && typeof value === 'object' ? value : {}
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
var light = {
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
var builtInThemes = {
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
function resolveMotion(value = 'inherit', global = 'auto', reduced = false) {
  const mode = value === 'inherit' ? global : value
  if (mode === 'none' || global === 'none') return 'none'
  if (reduced || mode === 'reduced' || global === 'reduced') return 'reduced'
  return 'full'
}
var motionProps = { motion: { type: String, default: 'inherit' } }
function createMessageBus() {
  const listeners = /* @__PURE__ */ new Map()
  return {
    onMessage(channel, listener) {
      const bucket = listeners.get(channel) ?? /* @__PURE__ */ new Set()
      bucket.add(listener)
      listeners.set(channel, bucket)
      return () => {
        bucket.delete(listener)
        if (!bucket.size) listeners.delete(channel)
      }
    },
    sendMessage(channel, payload) {
      return [...(listeners.get(channel) ?? [])].map((listener) =>
        listener(payload),
      )
    },
    clear() {
      listeners.clear()
    },
  }
}
function createOverlayService() {
  const entries = ref2([])
  const resolvers = /* @__PURE__ */ new Map()
  let nextId = 0
  const close = (id, value) => {
    const index = entries.value.findIndex((entry) => entry.id === id)
    if (index < 0) return
    entries.value.splice(index, 1)
    resolvers.get(id)?.(value)
    resolvers.delete(id)
  }
  return {
    entries,
    open(options) {
      const id = `apple-overlay-${++nextId}`
      const entry = {
        ...options,
        id,
        kind: options.kind ?? 'dialog',
        component: options.component ? markRaw(options.component) : void 0,
      }
      const result = new Promise((resolve) => resolvers.set(id, resolve))
      entries.value.push(entry)
      return {
        id,
        result,
        close: (value) => close(id, value),
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
    closeTop(value) {
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
function createApple(options = {}) {
  const themes = ref2(
    Object.fromEntries(
      Object.entries({ ...builtInThemes, ...options.themes }).map(
        ([name, theme2]) => [name, { ...theme2, tokens: { ...theme2.tokens } }],
      ),
    ),
  )
  const systemDark = ref2(false)
  const storageKey = options.storageKey ?? 'apptify:preferences'
  const persist = () => {
    if (!options.persist || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          theme: theme.value.name,
          motion: motion.value.mode,
          ripple: ripple2.value.enabled,
          glass: { opacity: glass.value.opacity, blur: glass.value.blur },
        }),
      )
    } catch {}
  }
  const theme = ref2({
    name: options.theme ?? 'system',
    get themes() {
      return themes.value
    },
    get resolved() {
      return theme.value.name === 'system'
        ? systemDark.value
          ? 'dark'
          : 'light'
        : theme.value.name
    },
    get current() {
      return themes.value[theme.value.resolved] ?? themes.value.light
    },
    set(name) {
      if (name !== 'system' && !themes.value[name])
        throw new Error(`Unknown Apple theme: ${name}`)
      theme.value.name = name
      persist()
    },
    register(name, tokens, scheme = 'light') {
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
  const motion = ref2({
    mode: options.motion ?? 'auto',
    reduced: false,
    set(mode) {
      if (mode !== motion.value.mode && (mode === 'reduced' || mode === 'none'))
        ripple2.value.enabled = false
      motion.value.mode = mode
      persist()
    },
  })
  const ripple2 = ref2({
    enabled:
      options.motion === 'none'
        ? false
        : (options.ripple ?? options.motion !== 'reduced'),
    set(enabled) {
      ripple2.value.enabled = enabled && motion.value.mode !== 'none'
      persist()
    },
  })
  const glass = ref2({
    ...glassSettings(options.glass, defaultGlassSettings),
    set(value) {
      Object.assign(glass.value, glassSettings(value, glass.value))
      persist()
    },
    reset() {
      glass.value.set(defaultGlassSettings)
    },
  })
  const messages = createMessageBus()
  const overlays = createOverlayService()
  const portalTarget = ref2()
  let attached = 0
  let detachMedia = () => {}
  const context = {
    theme,
    motion,
    ripple: ripple2,
    glass,
    messages,
    overlays,
    portalTarget,
    isTouchDevice,
    dialog: (settings) => overlays.open({ ...settings, kind: 'dialog' }),
    notify: (message, settings = {}) =>
      overlays.open({ duration: 4e3, ...settings, message, kind: 'snackbar' }),
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
            ripple2.value.enabled = stored.ripple
            hasRipplePreference = true
          } else if (stored.motion === 'reduced') ripple2.value.enabled = false
          if (motion.value.mode === 'none') ripple2.value.enabled = false
          Object.assign(glass.value, glassSettings(stored.glass, glass.value))
        } catch {}
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
          ripple2.value.enabled = false
          persist()
        }
        motion.value.reduced = reduce.matches
        mediaInitialized = true
      }
      const storage = (event) => {
        if (!options.persist || event.key !== storageKey || !event.newValue)
          return
        try {
          const value = JSON.parse(event.newValue)
          if (value.theme === 'system' || themes.value[value.theme])
            theme.value.name = value.theme
          if (['auto', 'full', 'reduced', 'none'].includes(value.motion))
            motion.value.mode = value.motion
          if (typeof value.ripple === 'boolean')
            ripple2.value.enabled = value.ripple
          else if (value.motion === 'reduced') ripple2.value.enabled = false
          if (motion.value.mode === 'none') ripple2.value.enabled = false
          Object.assign(glass.value, glassSettings(value.glass, glass.value))
        } catch {}
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
  for (const channel of ['showSnackbar', 'showSnackBar', 'showMessage']) {
    messages.onMessage(channel, (value) =>
      context.notify(value.text, { tone: value.type }),
    )
  }
  messages.onMessage('showDiag', (value) => context.dialog(value))
  messages.onMessage('closeDiag', () => overlays.closeTop())
  return markRaw(context)
}
var appleKey = /* @__PURE__ */ Symbol('apptify')
function themeStyle(context) {
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

// vendor/apptify/src/core/motion.ts
function motionDuration(element, fallback = 300) {
  if (element.closest('[data-apple-motion="none"], [data-motion="none"]'))
    return 0
  const mode = element
    .closest('[data-apple-motion]')
    ?.getAttribute('data-apple-motion')
  if (mode === 'none') return 0
  if (
    mode === 'reduced' ||
    element.closest('[data-motion="reduced"], [data-apple-motion="reduced"]') ||
    (typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches)
  )
    return 80
  const duration = getComputedStyle(element)
    .getPropertyValue('--apple-duration')
    .trim()
  return duration
    ? parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1e3)
    : fallback
}
var rippleStates = /* @__PURE__ */ new Map()
var ripplePolicyObserver
var rippleMedia
var syncRipplePolicies = () => rippleStates.forEach((state) => state.sync())
function observeRipplePolicies() {
  if (ripplePolicyObserver || typeof document === 'undefined') return
  ripplePolicyObserver = new MutationObserver((records) => {
    for (const [element, state] of rippleStates) {
      if (records.some((record) => record.target.contains(element)))
        state.sync()
    }
  })
  ripplePolicyObserver.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-apple-motion',
      'data-motion',
      'data-apple-ripple-enabled',
      'disabled',
      'aria-disabled',
    ],
  })
  rippleMedia =
    typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)')
      : void 0
  rippleMedia?.addEventListener?.('change', syncRipplePolicies)
}
var AppleRipple = {
  mounted(element, binding) {
    const el = element
    let current = binding
    const scope = binding.instance?.$
    const context = scope?.provides[appleKey]
    el.setAttribute('data-apple-ripple', '')
    if (
      getComputedStyle(el).position === 'static' ||
      !getComputedStyle(el).position
    )
      el.setAttribute('data-apple-ripple-positioned', '')
    Ripple.mounted(el, {
      ...binding,
      value: { keys: ['Enter', ' ', 'Spacebar'] },
    })
    const clear = () => {
      if (el._ripple) {
        window.clearTimeout(el._ripple.showTimer)
        el._ripple.showTimerCommit = null
        el._ripple.touched = false
      }
      for (const child of Array.from(el.children))
        if (child.classList.contains('v-ripple__container')) child.remove()
    }
    const sync = () => {
      const next =
        current.value !== false &&
        context?.ripple.value.enabled !== false &&
        (!context ||
          resolveMotion(
            'inherit',
            context.motion.value.mode,
            context.motion.value.reduced,
          ) !== 'none') &&
        !el.closest('[data-apple-ripple-enabled="false"]') &&
        !el.closest('[data-apple-motion="none"], [data-motion="none"]') &&
        (context || motionDuration(el) > 80) &&
        !el.matches(':disabled, [aria-disabled="true"]')
      if (el._ripple) el._ripple.enabled = next
      if (!next) clear()
    }
    const events = ['mousedown', 'touchstart', 'keydown']
    events.forEach((event) =>
      el.addEventListener(event, sync, { capture: true, passive: true }),
    )
    const cancellations = [
      'pointercancel',
      'touchcancel',
      'touchmove',
      'dragstart',
    ]
    cancellations.forEach((event) =>
      el.addEventListener(event, clear, { passive: true }),
    )
    const stopPolicy = context
      ? watch(
          () => [
            context.ripple.value.enabled,
            context.motion.value.mode,
            context.motion.value.reduced,
          ],
          sync,
          { flush: 'sync' },
        )
      : void 0
    rippleStates.set(el, {
      update(next) {
        current = next
        sync()
      },
      sync,
      destroy() {
        stopPolicy?.()
        clear()
        events.forEach((event) => el.removeEventListener(event, sync, true))
        cancellations.forEach((event) => el.removeEventListener(event, clear))
        Ripple.unmounted(el)
        el.removeAttribute('data-apple-ripple')
        el.removeAttribute('data-apple-ripple-positioned')
      },
    })
    sync()
    observeRipplePolicies()
  },
  updated(el, binding) {
    rippleStates.get(el)?.update(binding)
  },
  unmounted(el) {
    rippleStates.get(el)?.destroy()
    rippleStates.delete(el)
    if (!rippleStates.size) {
      ripplePolicyObserver?.disconnect()
      ripplePolicyObserver = void 0
      rippleMedia?.removeEventListener?.('change', syncRipplePolicies)
      rippleMedia = void 0
    }
  },
}
function ripple(node, enabled = true) {
  return withDirectives(node, [[AppleRipple, enabled]])
}
var selections = /* @__PURE__ */ new WeakMap()
var AppleSelection = {
  mounted(element, binding) {
    const indicator = document.createElement('span')
    indicator.className = 'apple-selection-indicator'
    indicator.setAttribute('aria-hidden', 'true')
    element.classList.add('apple-selection')
    element.appendChild(indicator)
    let value = binding.value
    let initialized = false
    let frame2 = 0
    const measure = () => {
      const selector =
        value && typeof value === 'object' && 'selector' in value
          ? String(value.selector)
          : '[data-apple-selected="true"]'
      const target = element.querySelector(selector)
      indicator.hidden = !target
      if (!target) return
      const box = element.getBoundingClientRect()
      const rect = target.getBoundingClientRect()
      indicator.style.transitionDuration = initialized
        ? `${motionDuration(element)}ms`
        : '0ms'
      indicator.style.width = `${rect.width}px`
      indicator.style.height = `${rect.height}px`
      indicator.style.transform = `translate(${rect.left - box.left + element.scrollLeft - element.clientLeft}px, ${rect.top - box.top + element.scrollTop - element.clientTop}px)`
      initialized = true
    }
    const update = (next = value) => {
      value = next
      cancelAnimationFrame(frame2)
      frame2 = requestAnimationFrame(measure)
    }
    const reflow = () => {
      cancelAnimationFrame(frame2)
      initialized = false
      measure()
    }
    let containerWidth = element.clientWidth
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            const width = element.clientWidth
            if (width !== containerWidth) {
              containerWidth = width
              reflow()
            } else update()
          })
    resize?.observe(element)
    const mutation = new MutationObserver(() => update())
    mutation.observe(element, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-apple-selected', 'aria-selected', 'class'],
    })
    const onResize = reflow
    window.addEventListener('resize', onResize)
    selections.set(element, {
      update,
      destroy() {
        cancelAnimationFrame(frame2)
        resize?.disconnect()
        mutation.disconnect()
        window.removeEventListener('resize', onResize)
        indicator.remove()
      },
    })
    update()
  },
  updated(element, binding) {
    selections.get(element)?.update(binding.value)
  },
  unmounted(element) {
    selections.get(element)?.destroy()
    selections.delete(element)
  },
}

// vendor/apptify/src/core/overlay-surface.ts
function showOverlaySurface(element) {
  if (!element.isConnected || typeof element.showPopover !== 'function') return
  element.setAttribute('data-apple-overlay-surface', '')
  element.setAttribute('popover', 'manual')
  if (!element.matches(':popover-open')) element.showPopover()
}
function hideOverlaySurface(element) {
  if (
    typeof element.hidePopover === 'function' &&
    element.matches(':popover-open')
  )
    element.hidePopover()
}

// vendor/apptify/src/core/popup-placement.ts
function choosePopupSide(preferred, anchor, size, viewport, gap = 8) {
  const spaces = {
    top: anchor.top - gap - 8,
    bottom: viewport.height - anchor.bottom - gap - 8,
    left: anchor.left - gap - 8,
    right: viewport.width - anchor.right - gap - 8,
  }
  const opposite = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }
  const other = opposite[preferred],
    required =
      preferred === 'top' || preferred === 'bottom' ? size.height : size.width
  return spaces[preferred] >= required || spaces[preferred] >= spaces[other]
    ? preferred
    : other
}
function applyPopupSide(element, side, gap = 8) {
  const changed = element.dataset.placement !== side
  element.dataset.placement = side
  element.style.transformOrigin = {
    top: 'center bottom',
    bottom: 'center top',
    left: 'right center',
    right: 'left center',
  }[side]
  element.style.setProperty(
    '--apple-popup-x',
    `${side === 'left' ? gap : side === 'right' ? -gap : 0}px`,
  )
  element.style.setProperty(
    '--apple-popup-y',
    `${side === 'top' ? gap : side === 'bottom' ? -gap : 0}px`,
  )
  if (changed) element.dispatchEvent(new Event('apple-popup-placement'))
}
function createPopupPositioner(panel, options) {
  const { anchor, fixed = false, gap = 8 } = options
  const doc = anchor.ownerDocument,
    win = doc.defaultView
  let destroyed = false,
    updating = false,
    tracking = 0,
    anchorGeometry = ''
  const set = (name, value) => {
    if (panel.style.getPropertyValue(name) !== value)
      panel.style.setProperty(name, value)
  }
  const track = () => {
    tracking = 0
    if (
      destroyed ||
      !panel.isConnected ||
      win.getComputedStyle(panel).display === 'none'
    )
      return
    const rect = anchor.getBoundingClientRect(),
      geometry = `${rect.left},${rect.top},${rect.width},${rect.height}`
    if (geometry !== anchorGeometry) {
      anchorGeometry = geometry
      update()
    }
    if (!tracking) tracking = win.requestAnimationFrame(track)
  }
  const update = () => {
    if (
      destroyed ||
      updating ||
      !panel.isConnected ||
      win.getComputedStyle(panel).display === 'none'
    )
      return
    updating = true
    const viewport = win.visualViewport
    const bounds = {
      left: (viewport?.offsetLeft ?? 0) + 8,
      top: (viewport?.offsetTop ?? 0) + 8,
      right:
        (viewport?.offsetLeft ?? 0) + (viewport?.width ?? win.innerWidth) - 8,
      bottom:
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? win.innerHeight) - 8,
    }
    const rect = anchor.getBoundingClientRect()
    set('position', 'fixed')
    set('--apple-popup-anchor-width', `${rect.width}px`)
    const viewportWidth = Math.max(0, bounds.right - bounds.left)
    set('--apple-popup-viewport-width', `${viewportWidth}px`)
    const css = win.getComputedStyle(panel)
    const border =
      (parseFloat(css.borderTopWidth) || 0) +
      (parseFloat(css.borderBottomWidth) || 0)
    const scroll = panel.querySelector('[data-apple-popup-scroll]')
    const ownScroll =
      scroll?.closest('.apple-field-menu, .apple-popover') === panel
        ? scroll
        : null
    const scrollLimit = ownScroll
      ? parseFloat(
          win
            .getComputedStyle(ownScroll)
            .getPropertyValue('--apple-popup-scroll-limit'),
        ) || Infinity
      : Infinity
    const height = ownScroll
      ? Math.min(
          ownScroll.scrollHeight,
          scrollLimit,
          (viewport?.height ?? win.innerHeight) / 2,
        ) + border
      : Math.max(panel.offsetHeight, panel.scrollHeight + border)
    const width = panel.offsetWidth
    const relative = {
      top: rect.top - bounds.top + 8,
      bottom: rect.bottom - bounds.top + 8,
      left: rect.left - bounds.left + 8,
      right: rect.right - bounds.left + 8,
    }
    const side = choosePopupSide(
      options.placement?.() ?? 'bottom',
      relative,
      { width, height },
      {
        width: bounds.right - bounds.left + 16,
        height: bounds.bottom - bounds.top + 16,
      },
      gap,
    )
    const vertical = side === 'top' || side === 'bottom'
    const availableHeight = vertical
      ? side === 'top'
        ? rect.top - gap - bounds.top
        : bounds.bottom - rect.bottom - gap
      : bounds.bottom - bounds.top
    const availableWidth = vertical
      ? viewportWidth
      : side === 'left'
        ? rect.left - gap - bounds.left
        : bounds.right - rect.right - gap
    set(
      '--apple-popup-available-height',
      `${Math.max(0, Math.min(availableHeight, bounds.bottom - bounds.top))}px`,
    )
    set(
      '--apple-popup-available-width',
      `${Math.max(0, Math.min(availableWidth, viewportWidth))}px`,
    )
    const actualWidth = panel.offsetWidth,
      actualHeight = panel.offsetHeight
    const align = options.align?.() ?? 'start'
    let left =
      align === 'end'
        ? rect.right - actualWidth
        : align === 'center'
          ? rect.left + (rect.width - actualWidth) / 2
          : rect.left
    let top = side === 'top' ? rect.top - actualHeight - gap : rect.bottom + gap
    if (!vertical) {
      left = side === 'left' ? rect.left - actualWidth - gap : rect.right + gap
      top =
        align === 'start'
          ? rect.top
          : align === 'end'
            ? rect.bottom - actualHeight
            : rect.top + (rect.height - actualHeight) / 2
    }
    left = Math.max(bounds.left, Math.min(left, bounds.right - actualWidth))
    top = Math.max(bounds.top, Math.min(top, bounds.bottom - actualHeight))
    const parent = panel.offsetParent
    const origin = parent?.getBoundingClientRect()
    set(
      'left',
      `${left - (origin?.left ?? 0) + (parent?.scrollLeft ?? 0) - (parent?.clientLeft ?? 0)}px`,
    )
    set(
      'top',
      `${top - (origin?.top ?? 0) + (parent?.scrollTop ?? 0) - (parent?.clientTop ?? 0)}px`,
    )
    set('right', 'auto')
    set('bottom', 'auto')
    applyPopupSide(panel, side, fixed ? 10 : gap)
    updating = false
    if (!tracking) tracking = win.requestAnimationFrame(track)
  }
  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
  observer?.observe(anchor)
  observer?.observe(panel)
  const content = new MutationObserver(() => {
    for (const child of Array.from(panel.children)) observer?.observe(child)
    update()
  })
  content.observe(panel, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  for (const child of Array.from(panel.children)) observer?.observe(child)
  const onScroll = (event) => {
    if (event.target instanceof Node && panel.contains(event.target)) return
    update()
  }
  doc.addEventListener('scroll', onScroll, true)
  win.addEventListener('resize', update)
  win.visualViewport?.addEventListener('resize', update)
  win.visualViewport?.addEventListener('scroll', update)
  update()
  return {
    update,
    destroy() {
      destroyed = true
      observer?.disconnect()
      content.disconnect()
      win.cancelAnimationFrame(tracking)
      doc.removeEventListener('scroll', onScroll, true)
      win.removeEventListener('resize', update)
      win.visualViewport?.removeEventListener('resize', update)
      win.visualViewport?.removeEventListener('scroll', update)
    },
  }
}
var states = /* @__PURE__ */ new WeakMap()
function updateFieldPopup(element) {
  states.get(element)?.update()
}
function unmountFieldPopup(element) {
  states.get(element)?.destroy()
  states.delete(element)
}
function mountFieldPopup(element, gap = 8) {
  if (element.style.display === 'none') return
  const anchor = element.parentElement
  if (
    !states.has(element) &&
    anchor &&
    !anchor.contains(element.ownerDocument.activeElement)
  ) {
    anchor.querySelector('[aria-expanded]')?.focus({ preventScroll: true })
  }
  showOverlaySurface(element)
  if (states.has(element)) {
    updateFieldPopup(element)
    return
  }
  if (anchor && element.ownerDocument.defaultView)
    states.set(element, createPopupPositioner(element, { anchor, gap }))
}
var FieldPopupPlacement = {
  mounted: (element, binding) => mountFieldPopup(element, binding.value?.gap),
  updated: updateFieldPopup,
  unmounted(element) {
    if (!element.isConnected) unmountFieldPopup(element)
  },
}

// vendor/apptify/src/core/popup-motion.ts
var animations = /* @__PURE__ */ new WeakMap()
var values = /* @__PURE__ */ new WeakMap()
var transitions = /* @__PURE__ */ new WeakMap()
var cleanup = {
  unmounted: (element) => {
    if (!element.isConnected) freezePopup(element)
  },
}
function progress(element, state) {
  if (state.animation) {
    const css = element.ownerDocument.defaultView?.getComputedStyle(element)
    const visible = parseFloat(
      element.classList.contains('apple-overlay-backdrop')
        ? (css?.getPropertyValue('--apple-modal-progress') ?? '')
        : (css?.opacity ?? ''),
    )
    if (Number.isFinite(visible)) return Math.max(0, Math.min(1, visible))
  }
  const timing = state.animation?.effect?.getComputedTiming()
  return typeof timing?.progress === 'number'
    ? state.from + (state.to - state.from) * timing.progress
    : state.value
}
function frame(element, value) {
  if (element.classList.contains('apple-overlay-backdrop'))
    return { '--apple-modal-progress': String(value) }
  const reduced = motionDuration(element) <= 80
  const x = reduced
    ? 0
    : (parseFloat(element.style.getPropertyValue('--apple-popup-x')) || 0) *
      (1 - value)
  const y = reduced
    ? 0
    : (parseFloat(element.style.getPropertyValue('--apple-popup-y')) || 0) *
      (1 - value)
  return { transform: `translate(${x}px, ${y}px)`, opacity: String(value) }
}
function applyFrame(element, value) {
  for (const [property, setting] of Object.entries(frame(element, value)))
    element.style.setProperty(property, setting)
}
function freezePopup(element) {
  const el = element,
    state = animations.get(el)
  if (!state) return values.get(el)
  const value = progress(el, state)
  applyFrame(el, value)
  values.set(el, value)
  state.animation?.cancel()
  state.dispose()
  animations.delete(el)
  return value
}
function finishPopup(element) {
  const state = animations.get(element)
  if (!state) return
  applyFrame(element, state.to)
  values.set(element, state.to)
  state.animation?.cancel()
  state.dispose()
  animations.delete(element)
  state.done()
}
function resetPopup(element) {
  const el = element
  el.style.transform = ''
  el.style.clipPath = ''
  el.style.opacity = ''
  el.style.willChange = ''
  el.style.removeProperty('--apple-modal-progress')
}
function preparePopup(element, interrupted) {
  const el = element
  freezePopup(el)
  if (interrupted !== void 0) values.set(el, interrupted)
  else if (!values.has(el)) values.set(el, 0)
  applyFrame(el, values.get(el))
}
function animatePopup(element, opened, done) {
  const el = element
  freezePopup(el)
  const from = values.get(el) ?? (opened ? 0 : 1),
    to = opened ? 1 : 0
  const state = { value: from, from, to, done, dispose: () => {} }
  const run = () => {
    state.value = progress(el, state)
    applyFrame(el, state.value)
    state.animation?.cancel()
    state.animation = void 0
    state.from = state.value
    const duration = motionDuration(el) * Math.abs(to - state.from)
    if (!duration || !el.animate) {
      finishPopup(el)
      return
    }
    el.style.willChange = 'opacity, transform'
    const animation = el.animate([frame(el, state.from), frame(el, to)], {
      duration,
      easing: 'cubic-bezier(.2,.65,.3,1)',
      fill: 'both',
    })
    state.animation = animation
    animation.onfinish = () => {
      if (animations.get(el) === state && state.animation === animation)
        finishPopup(el)
    }
  }
  const policy = () => {
    if (motionDuration(el) <= 80) finishPopup(el)
  }
  const observer = new MutationObserver(policy)
  observer.observe(el.ownerDocument.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-apple-motion', 'data-motion'],
  })
  const media2 = el.ownerDocument.defaultView?.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  )
  media2?.addEventListener?.('change', policy)
  el.addEventListener('apple-popup-placement', run)
  state.dispose = () => {
    observer.disconnect()
    media2?.removeEventListener?.('change', policy)
    el.removeEventListener('apple-popup-placement', run)
    el.style.willChange = ''
  }
  animations.set(el, state)
  run()
}
function popupTransition(
  content,
  name = 'apple-field-menu',
  persisted = false,
  gap = 8,
) {
  const owner = getCurrentInstance()
  if (!transitions.has(owner)) transitions.set(owner, /* @__PURE__ */ new Map())
  const records = transitions.get(owner)
  if (!records.has(name)) records.set(name, { open: false })
  const record = records.get(name)
  record.open = !!content
  const clear = (element) => {
    element.classList.remove(`${name}-enter-active`, `${name}-leave-active`)
    resetPopup(element)
  }
  return h(
    Transition,
    {
      name,
      css: false,
      persisted,
      onBeforeEnter: (el) => {
        preparePopup(el, record.interrupted)
        record.interrupted = void 0
      },
      onEnter: (element, done) => {
        const el = element
        mountFieldPopup(el, gap)
        el.classList.add(`${name}-enter-active`)
        animatePopup(el, true, done)
      },
      onBeforeLeave: (el) => updateFieldPopup(el),
      onLeave: (element, done) => {
        element.classList.add(`${name}-leave-active`)
        animatePopup(element, false, done)
      },
      onAfterEnter: clear,
      onAfterLeave: (el) => {
        const value = freezePopup(el)
        record.interrupted = record.open && !persisted ? value : void 0
        hideOverlaySurface(el)
        clear(el)
        unmountFieldPopup(el)
      },
      onEnterCancelled: (el) => {
        freezePopup(el)
        el.classList.remove(`${name}-enter-active`)
      },
      onLeaveCancelled: (el) => {
        el.style.display = ''
        freezePopup(el)
        el.classList.remove(`${name}-leave-active`)
      },
    },
    {
      default: () =>
        content
          ? withDirectives2(content, [
              [FieldPopupPlacement, { gap }],
              [cleanup],
            ])
          : content,
    },
  )
}

// vendor/apptify/src/components/date-picker.ts
import {
  defineComponent as defineComponent3,
  h as h4,
  useId as useId2,
} from 'vue'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from 'lucide-vue-next'
import {
  addDays,
  addMonths,
  format as formatDate,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

// vendor/apptify/src/components/motion.ts
import { defineComponent, h as h2, Transition as Transition2 } from 'vue'
var sizes = /* @__PURE__ */ new WeakMap()
var layoutSize = (element) => ({
  width: element.offsetWidth,
  height: element.offsetHeight,
})
var AppleAutoSize = defineComponent({
  name: 'AppleAutoSize',
  inject: { apple: { from: appleKey, default: null } },
  props: { ...motionProps, axis: { type: String, default: 'height' } },
  computed: {
    motionMode() {
      const context = this.apple
      return resolveMotion(
        this.motion,
        context?.motion.value.mode,
        context?.motion.value.reduced,
      )
    },
  },
  watch: {
    motionMode(mode) {
      if (mode !== 'full') {
        const state = sizes.get(this)
        state?.animation?.cancel()
        if (state) {
          state.animation = void 0
          state.reset()
        }
      }
    },
  },
  mounted() {
    const outer = this.$el
    const inner = this.$refs.inner
    const initial = layoutSize(inner)
    const state = {
      width: initial.width,
      height: initial.height,
      reset: () => {
        outer.style.overflow = ''
        inner.style.width = ''
      },
    }
    sizes.set(this, state)
    if (typeof ResizeObserver === 'undefined') return
    state.observer = new ResizeObserver(() => {
      const next = layoutSize(inner)
      if (
        Math.abs(next.height - state.height) < 0.5 &&
        (this.axis !== 'both' || Math.abs(next.width - state.width) < 0.5)
      )
        return
      const current = state.animation ? layoutSize(outer) : state
      const from = {
        height: `${current.height}px`,
        ...(this.axis === 'both' ? { width: `${current.width}px` } : {}),
      }
      const to = {
        height: `${next.height}px`,
        ...(this.axis === 'both' ? { width: `${next.width}px` } : {}),
      }
      state.animation?.cancel()
      state.animation = void 0
      state.reset()
      state.width = next.width
      state.height = next.height
      const duration = motionDuration(outer)
      if (duration && outer.animate) {
        outer.style.overflow = 'clip'
        if (this.axis === 'both') inner.style.width = `${next.width}px`
        state.animation = outer.animate([from, to], {
          duration,
          easing: 'cubic-bezier(.2,.65,.3,1)',
        })
        state.animation.onfinish = () => {
          state.reset()
          state.animation = void 0
        }
      }
    })
    state.observer.observe(inner)
  },
  beforeUnmount() {
    const state = sizes.get(this)
    state?.observer?.disconnect()
    state?.animation?.cancel()
    sizes.delete(this)
  },
  render() {
    return h2(
      'div',
      { class: 'apple-auto-size', 'data-apple-motion': this.motionMode },
      [
        h2(
          'div',
          { ref: 'inner', class: 'apple-auto-size__inner' },
          this.$slots.default?.(),
        ),
      ],
    )
  },
})
var AppleTransition = defineComponent({
  name: 'AppleTransition',
  inheritAttrs: false,
  inject: { apple: { from: appleKey, default: null } },
  props: {
    ...motionProps,
    name: { type: String, default: 'slide-y' },
    mode: { type: String, default: 'out-in' },
    appear: { type: Boolean, default: true },
  },
  render() {
    const context = this.apple
    const mode = resolveMotion(
      this.motion,
      context?.motion.value.mode,
      context?.motion.value.reduced,
    )
    return h2(
      Transition2,
      {
        ...this.$attrs,
        name: mode === 'full' ? `apple-${this.name}` : 'apple-fade',
        mode: this.mode === 'default' ? void 0 : this.mode,
        appear: this.appear,
        css: mode !== 'none',
      },
      this.$slots,
    )
  },
})

// vendor/apptify/src/components/tabs.ts
import {
  defineComponent as defineComponent2,
  h as h3,
  Transition as Transition3,
  useId,
  withDirectives as withDirectives3,
} from 'vue'
var motionProps2 = { motion: { type: String, default: 'inherit' } }
var itemProps = { items: { type: Array, default: () => [] } }
var valueProp = { type: [String, Number], default: void 0 }
var uidSetup = () => ({ uid: useId() })
var tabsProps = {
  ...motionProps2,
  ...itemProps,
  modelValue: valueProp,
  label: { type: String, default: '\u5185\u5BB9\u5206\u7C7B' },
  disabled: Boolean,
}
var AppleTabs = defineComponent2({
  name: 'AppleTabs',
  setup: uidSetup,
  props: { ...tabsProps, variant: { type: String, default: 'underline' } },
  emits: ['update:modelValue', 'change'],
  data: () => ({
    localValue: void 0,
    backward: false,
    panelPoses: /* @__PURE__ */ new Map(),
  }),
  computed: {
    activeValue() {
      const value = this.modelValue ?? this.localValue
      return (
        this.items.find((item) => item.value === value && !item.disabled)
          ?.value ?? this.items.find((item) => !item.disabled)?.value
      )
    },
    activeItem() {
      return this.items.find((item) => item.value === this.activeValue)
    },
  },
  watch: {
    activeValue(value, previous) {
      this.panelPoses.clear()
      for (const panel of this.$el.querySelectorAll('.apple-tabs__panel')) {
        this.panelPoses.set(panel.id, getComputedStyle(panel).transform)
      }
      this.backward =
        this.items.findIndex((item) => item.value === value) <
        this.items.findIndex((item) => item.value === previous)
    },
  },
  methods: {
    select(item) {
      if (this.disabled || item.disabled) return
      this.localValue = item.value
      this.$emit('update:modelValue', item.value)
      this.$emit('change', item.value)
    },
    keydown(event, index) {
      const enabled = this.items
        .map((item, i) => (!item.disabled ? i : -1))
        .filter((i) => i >= 0)
      if (!enabled.length || this.disabled) return
      const current = enabled.indexOf(index)
      let next
      if (event.key === 'ArrowRight')
        next = enabled[(current + 1) % enabled.length]
      if (event.key === 'ArrowLeft')
        next = enabled[(current - 1 + enabled.length) % enabled.length]
      if (event.key === 'Home') next = enabled[0]
      if (event.key === 'End') next = enabled[enabled.length - 1]
      if (next === void 0) return
      event.preventDefault()
      this.select(this.items[next])
      const buttons = this.$refs.tablist.querySelectorAll('[role="tab"]')
      buttons[next]?.focus()
    },
  },
  render() {
    return h3(
      'div',
      {
        class: [
          'apple-tabs',
          `apple-tabs--${this.variant}`,
          { 'is-backward': this.backward },
        ],
        'data-motion': this.motion,
      },
      [
        withDirectives3(
          h3(
            'div',
            {
              class: 'apple-tabs__list',
              role: 'tablist',
              'aria-label': this.label,
              ref: 'tablist',
            },
            this.items.map((item, index) =>
              h3(
                'button',
                {
                  type: 'button',
                  id: `${this.uid}-tab-${index}`,
                  role: 'tab',
                  class: [
                    'apple-tabs__tab',
                    { 'is-active': item.value === this.activeValue },
                  ],
                  'aria-selected': item.value === this.activeValue,
                  'data-apple-selected': item.value === this.activeValue,
                  'aria-controls': `${this.uid}-panel-${index}`,
                  disabled: this.disabled || item.disabled,
                  tabindex: item.value === this.activeValue ? 0 : -1,
                  onClick: () => this.select(item),
                  onKeydown: (event) => this.keydown(event, index),
                },
                item.label,
              ),
            ),
          ),
          [[AppleSelection]],
        ),
        h3(
          AppleAutoSize,
          { class: 'apple-tabs__viewport', motion: this.motion },
          {
            default: () =>
              h3(
                Transition3,
                {
                  name: 'apple-tab-panel',
                  onBeforeEnter: (element) => {
                    const el = element
                    const pose = this.panelPoses.get(element.id)
                    el.style.setProperty(
                      '--apple-tab-enter-transform',
                      pose && pose !== 'none'
                        ? pose
                        : `translateX(${this.backward ? -100 : 100}%)`,
                    )
                  },
                  onAfterEnter: (element) => {
                    element.style.removeProperty('--apple-tab-enter-transform')
                  },
                  onBeforeLeave: (element) => {
                    const el = element
                    el.style.setProperty(
                      '--apple-tab-leave-from',
                      this.panelPoses.get(element.id) ||
                        getComputedStyle(el).transform,
                    )
                    el.style.setProperty(
                      '--apple-tab-leave-to',
                      `translateX(${this.backward ? 100 : -100}%)`,
                    )
                    element.setAttribute('inert', '')
                    element.setAttribute('aria-hidden', 'true')
                  },
                  onLeaveCancelled: (element) => {
                    element.removeAttribute('inert')
                    element.removeAttribute('aria-hidden')
                  },
                },
                {
                  default: () =>
                    h3(
                      'div',
                      {
                        key: this.activeValue,
                        id: `${this.uid}-panel-${this.items.findIndex((item) => item.value === this.activeValue)}`,
                        class: 'apple-tabs__panel',
                        role: 'tabpanel',
                        tabindex: 0,
                        'aria-labelledby': this.activeItem
                          ? `${this.uid}-tab-${this.items.findIndex((item) => item.value === this.activeValue)}`
                          : void 0,
                        'aria-label': !this.activeItem ? this.label : void 0,
                      },
                      this.$slots[`panel-${this.activeValue}`]?.({
                        item: this.activeItem,
                      }) ??
                        this.$slots.default?.({
                          item: this.activeItem,
                          value: this.activeValue,
                        }) ??
                        this.activeItem?.content,
                    ),
                },
              ),
          },
        ),
      ],
    )
  },
})
var AppleTabBar = defineComponent2({
  name: 'AppleTabBar',
  props: tabsProps,
  emits: ['update:modelValue', 'change'],
  render() {
    return h3(
      AppleTabs,
      {
        ...this.$props,
        variant: 'bar',
        'onUpdate:modelValue': (value) =>
          this.$emit('update:modelValue', value),
        onChange: (value) => this.$emit('change', value),
      },
      this.$slots,
    )
  },
})

// vendor/apptify/src/components/date-picker.ts
var labels = {
  year: '\u5E74',
  month: '\u6708',
  day: '\u65E5',
  hour: '\u65F6',
  minute: '\u5206',
  second: '\u79D2',
}
var emptyParts = () => ({
  year: '',
  month: '',
  day: '',
  hour: '',
  minute: '',
  second: '',
})
var presets = {
  year: 'YYYY',
  month: 'YYYY/MM',
  day: 'YYYY/MM/DD',
  date: 'YYYY/MM/DD',
  hour: 'YYYY/MM/DD HH',
  minute: 'YYYY/MM/DD HH:mm',
  second: 'YYYY/MM/DD HH:mm:ss',
  hm: 'HH:mm',
  hms: 'HH:mm:ss',
  ym: 'YYYY/MM',
  ymd: 'YYYY/MM/DD',
  ymdhm: 'YYYY/MM/DD HH:mm',
  ymdhms: 'YYYY/MM/DD HH:mm:ss',
}
function segmentsFor(pattern) {
  const segments = []
  const matches = [...pattern.matchAll(/y+|M+|d+|h+|m+|s+/gi)]
  let time = false
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index],
      token = match[0],
      char = token[0].toLowerCase()
    if (char === 'h') time = true
    const part =
      char === 'y'
        ? 'year'
        : char === 'd'
          ? 'day'
          : char === 'h'
            ? 'hour'
            : char === 's'
              ? 'second'
              : time
                ? 'minute'
                : 'month'
    if (segments.some((segment) => segment.part === part)) continue
    const next = matches[index + 1]
    const separator = pattern.slice(
      match.index + token.length,
      next ? next.index : pattern.length,
    )
    segments.push({ part, width: part === 'year' ? 4 : 2, separator })
  }
  return segments.length ? segments : segmentsFor('YYYY/MM/DD')
}
function dateParts(date) {
  return {
    year: String(date.getFullYear()).padStart(4, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    hour: String(date.getHours()).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0'),
    second: String(date.getSeconds()).padStart(2, '0'),
  }
}
function dateFrom(parts, fallback) {
  const date = new Date(fallback)
  date.setDate(1)
  date.setFullYear(
    Number(parts.year || fallback.getFullYear()),
    Number(parts.month || fallback.getMonth() + 1) - 1,
    Number(parts.day || 1),
  )
  date.setHours(
    Number(parts.hour || 0),
    Number(parts.minute || 0),
    Number(parts.second || 0),
    0,
  )
  return date
}
function readParts(value, segments) {
  const result = emptyParts(),
    numbers = value.match(/\d+/g) || []
  segments.forEach((segment, index) => {
    result[segment.part] = numbers[index] || ''
  })
  return result
}
function canonical(parts, segments) {
  const present = (part) => segments.some((segment) => segment.part === part)
  const date = ['year', 'month', 'day']
    .filter(present)
    .map((part) => parts[part].padStart(part === 'year' ? 4 : 2, '0'))
    .join('-')
  const time = ['hour', 'minute', 'second']
    .filter(present)
    .map((part) => parts[part].padStart(2, '0'))
    .join(':')
  return date && time ? `${date}T${time}` : date || time
}
function hoverTrail(event, selected) {
  const element = event.currentTarget
  element.getAnimations?.().forEach((animation) => animation.cancel())
  if (
    isTouchDevice.value ||
    event.pointerType === 'touch' ||
    selected ||
    element.closest('[data-apple-motion="none"]') ||
    element.closest('[data-apple-motion="reduced"]') ||
    globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return
  const color = 'rgb(128 128 128 / 8%)'
  element.animate?.(
    [{ backgroundColor: color }, { backgroundColor: 'transparent' }],
    { duration: 240, easing: 'ease-out' },
  )
}
var calendarSlides = /* @__PURE__ */ new WeakMap()
var CalendarPages = defineComponent3({
  name: 'AppleCalendarPages',
  inject: { apple: { from: appleKey, default: null } },
  props: {
    ...motionProps,
    pageKey: { type: String, required: true },
    direction: { type: Number, default: 1 },
  },
  data: () => ({ revision: 0 }),
  computed: {
    motionMode() {
      const context = this.apple
      return resolveMotion(
        this.motion,
        context?.motion.value.mode,
        context?.motion.value.reduced,
      )
    },
  },
  created() {
    calendarSlides.set(this, {
      pages: [],
      pending: false,
      previous: this.pageKey,
    })
  },
  watch: {
    pageKey(_value, previous) {
      const state = calendarSlides.get(this),
        viewport = this.$el,
        left = viewport.getBoundingClientRect().left
      const elements = [...viewport.querySelectorAll('.apple-calendar__page')]
      for (const page of state.pages) {
        const el = elements.find((el2) => el2.dataset.calendarPage === page.key)
        if (el) page.x = el.getBoundingClientRect().left - left
      }
      state.animation?.cancel()
      state.animation = void 0
      this.$refs.pages.style.transform = ''
      for (const page of state.pages) {
        const el = elements.find((el2) => el2.dataset.calendarPage === page.key)
        if (el) el.style.transform = `translateX(${page.x}px)`
      }
      state.previous = previous
      state.pending = true
    },
    motionMode(mode) {
      if (mode !== 'full') this.finish()
    },
  },
  updated() {
    const state = calendarSlides.get(this)
    if (!state.pending) return
    state.pending = false
    const active = state.pages.find((page) => page.key === this.pageKey),
      track = this.$refs.pages
    const width = this.$el.clientWidth || 1,
      baseDuration = motionDuration(track),
      duration =
        baseDuration *
        Math.min(baseDuration <= 80 ? 1 : 1.6, Math.abs(active.x) / width)
    if (!duration || !track.animate) {
      this.finish()
      return
    }
    track.style.willChange = 'transform'
    const animation = track.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-active.x}px)` },
      ],
      { duration, easing: 'cubic-bezier(.2,.65,.3,1)', fill: 'both' },
    )
    state.animation = animation
    animation.onfinish = () => {
      if (state.animation === animation) this.finish()
    }
  },
  beforeUnmount() {
    const state = calendarSlides.get(this)
    if (state) {
      state.animation?.cancel()
      state.animation = void 0
    }
    calendarSlides.delete(this)
  },
  methods: {
    finish() {
      const state = calendarSlides.get(this),
        active = state.pages.find((page) => page.key === this.pageKey)
      state.animation?.cancel()
      state.animation = void 0
      state.pending = false
      const track = this.$refs.pages
      if (track) {
        track.style.transform = ''
        track.style.willChange = ''
      }
      if (active) active.x = 0
      state.pages = active ? [active] : []
      this.revision++
    },
  },
  render() {
    void this.revision
    const state = calendarSlides.get(this)
    let active = state.pages.find((page) => page.key === this.pageKey)
    if (!active) {
      active = {
        key: this.pageKey,
        x: state.pages.length
          ? (state.pages.find((page) => page.key === state.previous)?.x ?? 0) +
            this.direction * this.$el.clientWidth
          : 0,
        content: [],
      }
      state.pages.push(active)
    }
    active.content = this.$slots.default?.() ?? []
    return h4(
      AppleAutoSize,
      { class: 'apple-calendar__viewport', motion: this.motion },
      {
        default: () =>
          h4(
            'div',
            { ref: 'pages', class: 'apple-calendar__pages' },
            state.pages.map((page) =>
              h4(
                'div',
                {
                  key: page.key,
                  class: [
                    'apple-calendar__page',
                    { 'is-leaving': page !== active },
                  ],
                  'data-calendar-page': page.key,
                  inert: page !== active || void 0,
                  'aria-hidden': page !== active || void 0,
                  style: { transform: `translateX(${page.x}px)` },
                },
                page.content,
              ),
            ),
          ),
      },
    )
  },
})
var timeRowHeight = 40
var timeWheelLength = 1e3
var timeWheelMiddle = 450
var repeatedTimeIndex = (value, count, around = timeWheelMiddle) =>
  value +
  count *
    Math.max(
      0,
      Math.min(
        Math.floor((timeWheelLength - 1 - value) / count),
        Math.round((around - value) / count),
      ),
    )
var timeWheelStates = /* @__PURE__ */ new WeakMap()
var TimeWheel = defineComponent3({
  name: 'AppleDateTimeWheel',
  props: {
    modelValue: Number,
    fallback: { type: Number, required: true },
    count: { type: Number, required: true },
    label: { type: String, required: true },
    disabledValues: { type: Array, default: () => [] },
    active: Boolean,
    revision: Number,
  },
  emits: ['update:modelValue', 'change', 'escape'],
  data() {
    const index = repeatedTimeIndex(
      this.modelValue ?? this.fallback,
      this.count,
    )
    return {
      uid: useId2(),
      centerIndex: index,
      windowIndex: index,
      scrollPosition: index,
    }
  },
  computed: {
    rows() {
      const first = Math.max(0, this.windowIndex - 8),
        last = Math.min(timeWheelLength - 1, this.windowIndex + 8)
      return Array.from(
        { length: last - first + 1 },
        (_, index) => first + index,
      )
    },
  },
  watch: {
    modelValue(value) {
      const next = value ?? this.fallback
      if (value === void 0 || next !== this.centerIndex % this.count)
        this.goTo(
          repeatedTimeIndex(next, this.count, this.centerIndex),
          false,
          false,
        )
      if (!timeWheelStates.get(this).interacting)
        timeWheelStates.get(this).committed = value
    },
    active(value) {
      if (!value) {
        this.interrupt()
        timeWheelStates.get(this).interacting = false
      }
    },
    revision() {
      this.goTo(
        repeatedTimeIndex(
          this.modelValue ?? this.fallback,
          this.count,
          this.centerIndex,
        ),
        false,
        false,
      )
    },
  },
  created() {
    timeWheelStates.set(this, {
      frame: 0,
      moving: false,
      interacting: false,
      committed: this.modelValue,
    })
  },
  mounted() {
    this.$refs.viewport.scrollTop = this.centerIndex * timeRowHeight
  },
  beforeUnmount() {
    this.interrupt()
    timeWheelStates.delete(this)
  },
  methods: {
    rowPose(index) {
      const distance = index - this.scrollPosition,
        angle = Math.max(-90, Math.min(90, distance * 22)),
        radians = (angle * Math.PI) / 180
      const z = 110 * (Math.cos(radians) - 1),
        y = (110 * Math.sin(radians) * 600) / (600 - z)
      return {
        top: `${index * timeRowHeight}px`,
        transform: `translateY(${y - distance * timeRowHeight}px) perspective(600px) translateZ(${z}px) rotateX(${-angle}deg)`,
        opacity:
          Math.max(0, Math.cos(radians)) *
          0.72 ** Math.abs(distance) *
          (this.enabled(index) ? 1 : 0.35),
        visibility: Math.abs(distance) > 4 ? 'hidden' : 'visible',
      }
    },
    interrupt() {
      const state = timeWheelStates.get(this)
      cancelAnimationFrame(state.frame)
      clearTimeout(state.timer)
      state.frame = 0
      state.moving = false
      state.target = void 0
    },
    beginGesture() {
      this.interrupt()
      timeWheelStates.get(this).interacting = true
    },
    enabled(index) {
      return (
        index >= 0 &&
        index < timeWheelLength &&
        !this.disabledValues[index % this.count]
      )
    },
    nearestEnabled(index, direction = 0) {
      if (this.enabled(index)) return index
      for (let distance = 1; distance <= this.count; distance++)
        for (const sign of direction < 0 ? [-1, 1] : [1, -1])
          if (this.enabled(index + distance * sign))
            return index + distance * sign
    },
    readScroll() {
      const viewport = this.$refs.viewport
      if (!this.active || viewport.closest('[inert]')) return
      this.scrollPosition = viewport.scrollTop / timeRowHeight
      const index = Math.max(
        0,
        Math.min(
          timeWheelLength - 1,
          Math.round(viewport.scrollTop / timeRowHeight),
        ),
      )
      if (Math.abs(index - this.windowIndex) > 3) this.windowIndex = index
      if (index !== this.centerIndex) {
        this.centerIndex = index
        if (this.enabled(index) && timeWheelStates.get(this).interacting)
          this.$emit('update:modelValue', index % this.count)
      }
    },
    scroll() {
      this.readScroll()
      const state = timeWheelStates.get(this)
      clearTimeout(state.timer)
      if (!state.moving && state.interacting && this.active)
        state.timer = setTimeout(() => this.settle(), 140)
    },
    finish() {
      const state = timeWheelStates.get(this),
        value = this.centerIndex % this.count
      if (!this.active || !state.interacting || !this.enabled(this.centerIndex))
        return
      if (this.modelValue === void 0) this.$emit('update:modelValue', value)
      if (state.committed !== value) {
        state.committed = value
        this.$emit('change', value)
      }
      state.interacting = false
      if (this.centerIndex < 120 || this.centerIndex > timeWheelLength - 120) {
        const index = repeatedTimeIndex(value, this.count),
          offset = index - this.centerIndex
        this.centerIndex = index
        this.windowIndex += offset
        this.scrollPosition += offset
        this.$refs.viewport.scrollTop += offset * timeRowHeight
      }
    },
    settle() {
      if (!this.active || !timeWheelStates.get(this).interacting) return
      const index = this.nearestEnabled(this.centerIndex)
      if (index !== void 0) this.goTo(index, true)
    },
    goTo(index, smooth = true, select = true) {
      const viewport = this.$refs.viewport
      if (!viewport) return
      if (select) {
        const enabled = this.nearestEnabled(index, index - this.centerIndex)
        if (enabled === void 0) return
        index = enabled
      }
      this.interrupt()
      const state = timeWheelStates.get(this),
        start = viewport.scrollTop,
        end = index * timeRowHeight
      state.interacting = select
      const duration = smooth ? motionDuration(viewport) : 0
      const write = (position) => {
        viewport.scrollTop = position
        if (select) this.readScroll()
      }
      if (!duration || Math.abs(start - end) < 0.5) {
        write(end)
        this.centerIndex = index
        this.windowIndex = index
        this.scrollPosition = index
        if (select) this.finish()
        return
      }
      state.moving = true
      state.target = index
      const started = performance.now()
      const tick = (now) => {
        const progress2 = Math.min(1, (now - started) / duration)
        write(start + (end - start) * (1 - (1 - progress2) ** 3))
        if (progress2 < 1) state.frame = requestAnimationFrame(tick)
        else {
          state.frame = 0
          state.moving = false
          state.target = void 0
          this.finish()
        }
      }
      state.frame = requestAnimationFrame(tick)
    },
    keydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.$emit('escape')
        return
      }
      const state = timeWheelStates.get(this),
        index = state.target ?? this.centerIndex
      const offsets = { ArrowUp: -1, ArrowDown: 1, PageUp: -5, PageDown: 5 }
      let target =
        event.key in offsets
          ? index + offsets[event.key]
          : event.key === 'Home'
            ? index - (index % this.count)
            : event.key === 'End'
              ? index - (index % this.count) + this.count - 1
              : void 0
      if (event.key === 'Enter' || event.key === ' ') target = index
      if (target === void 0) return
      event.preventDefault()
      this.goTo(Math.max(0, Math.min(timeWheelLength - 1, target)))
    },
  },
  render() {
    return h4('div', { class: 'apple-calendar__time-wheel' }, [
      h4(
        'div',
        {
          ref: 'viewport',
          class: 'apple-calendar__time-values',
          role: 'listbox',
          tabindex: 0,
          'aria-label': this.label,
          'aria-activedescendant': `${this.uid}-time-${this.centerIndex}`,
          'data-center-index': this.centerIndex,
          'data-center-value': this.centerIndex % this.count,
          onScroll: this.scroll,
          onWheel: this.beginGesture,
          onPointerdown: this.beginGesture,
          onKeydown: this.keydown,
        },
        [
          h4(
            'div',
            {
              class: 'apple-calendar__time-track',
              style: { height: `${timeWheelLength * timeRowHeight}px` },
            },
            this.rows.map((index) => {
              const value = index % this.count,
                selected = index === this.centerIndex,
                disabled = !this.enabled(index)
              return ripple(
                h4(
                  'div',
                  {
                    key: index,
                    id: `${this.uid}-time-${index}`,
                    class: [
                      'apple-calendar__time-option',
                      { 'is-selected': selected, 'is-disabled': disabled },
                    ],
                    role: 'option',
                    'aria-selected': selected,
                    'aria-disabled': disabled || void 0,
                    'aria-posinset': value + 1,
                    'aria-setsize': this.count,
                    'data-time-index': index,
                    'data-time-value': value,
                    style: this.rowPose(index),
                    onClick: () => {
                      if (disabled || !this.active) return
                      this.$refs.viewport.focus({ preventScroll: true })
                      this.goTo(index)
                    },
                  },
                  String(value).padStart(2, '0'),
                ),
                !disabled,
              )
            }),
          ),
        ],
      ),
    ])
  },
})
var AppleDatePicker = defineComponent3({
  name: 'AppleDatePicker',
  inheritAttrs: false,
  props: {
    modelValue: { type: String, default: '' },
    label: { type: String, default: '' },
    hint: { type: String, default: '' },
    error: { type: String, default: '' },
    disabled: Boolean,
    loading: Boolean,
    required: Boolean,
    min: String,
    max: String,
    format: String,
    granularity: String,
    type: { type: String, default: 'date' },
    motion: { type: String, default: 'inherit' },
  },
  emits: ['update:modelValue', 'change'],
  data() {
    return {
      inputId: useId2(),
      now: /* @__PURE__ */ new Date(),
      clockNow: /* @__PURE__ */ new Date(),
      timeRevision: 0,
      draft: emptyParts(),
      opened: false,
      tab: 'date',
      view: 'days',
      cursor: startOfMonth(/* @__PURE__ */ new Date()),
      focusedDate: '',
      direction: 1,
      lastEmitted: null,
      outside: null,
    }
  },
  computed: {
    pattern() {
      return (
        this.format ||
        presets[this.granularity || ''] ||
        (this.type === 'month'
          ? 'YYYY/MM'
          : this.type === 'datetime-local'
            ? 'YYYY/MM/DD HH:mm'
            : this.type === 'time'
              ? 'HH:mm'
              : 'YYYY/MM/DD')
      )
    },
    segments() {
      return segmentsFor(this.pattern)
    },
    hasDate() {
      return this.segments.some((segment) =>
        ['year', 'month', 'day'].includes(segment.part),
      )
    },
    hasTime() {
      return this.segments.some((segment) =>
        ['hour', 'minute', 'second'].includes(segment.part),
      )
    },
    placeholderParts() {
      return dateParts(this.now)
    },
    selectedDate() {
      return this.draft.year && this.draft.month && this.draft.day
        ? `${this.draft.year.padStart(4, '0')}-${this.draft.month.padStart(2, '0')}-${this.draft.day.padStart(2, '0')}`
        : ''
    },
    calendarDate() {
      return (
        this.selectedDate ||
        (!['year', 'month', 'day'].some((part) => this.draft[part]) &&
        !this.dateDisabled(this.clockNow)
          ? formatDate(this.clockNow, 'yyyy-MM-dd')
          : '')
      )
    },
    nowDisabled() {
      const value = canonical(dateParts(this.clockNow), this.segments)
      return Boolean(
        (this.min && value < this.normalizeBound(this.min)) ||
          (this.max && value > this.normalizeBound(this.max)),
      )
    },
    dates() {
      const start = startOfWeek(startOfMonth(this.cursor), { weekStartsOn: 0 })
      return Array.from({ length: 42 }, (_, index) => addDays(start, index))
    },
    years() {
      const start = Math.max(1, Math.floor(this.cursor.getFullYear() / 12) * 12)
      return Array.from({ length: 12 }, (_, index) => start + index).filter(
        (year) => year <= 9999,
      )
    },
    id() {
      return String(this.$attrs.id || this.inputId)
    },
    validity() {
      if (!this.segments.some((segment) => this.draft[segment.part]))
        return this.required
          ? '\u8BF7\u9009\u62E9\u65E5\u671F\u6216\u65F6\u95F4'
          : ''
      if (this.segments.some((segment) => !this.draft[segment.part]))
        return '\u8BF7\u586B\u5199\u5B8C\u6574\u7684\u65E5\u671F\u6216\u65F6\u95F4'
      for (const { part } of this.segments) {
        const value2 = Number(this.draft[part])
        if (value2 < this.lower(part) || value2 > this.upper(part))
          return `\u8BF7\u8F93\u5165\u6709\u6548\u7684${labels[part]}`
      }
      const value = canonical(this.draft, this.segments)
      if (this.min && value < this.normalizeBound(this.min))
        return `\u4E0D\u80FD\u65E9\u4E8E ${this.min}`
      if (this.max && value > this.normalizeBound(this.max))
        return `\u4E0D\u80FD\u665A\u4E8E ${this.max}`
      return ''
    },
  },
  watch: {
    modelValue(value) {
      if (value !== this.lastEmitted) this.sync()
      this.lastEmitted = null
      this.$nextTick(this.syncValidity)
    },
    pattern() {
      this.sync()
    },
    required() {
      this.$nextTick(this.syncValidity)
    },
    min() {
      this.$nextTick(this.syncValidity)
    },
    max() {
      this.$nextTick(this.syncValidity)
    },
    disabled(value) {
      if (value) this.opened = false
    },
    loading(value) {
      if (value) this.opened = false
    },
  },
  created() {
    this.sync()
  },
  mounted() {
    this.syncValidity()
    this.outside = (event) => {
      if (!this.$el.contains(event.target)) this.close()
    }
    document.addEventListener('pointerdown', this.outside)
  },
  beforeUnmount() {
    if (this.outside) document.removeEventListener('pointerdown', this.outside)
  },
  methods: {
    lower(part) {
      return ['year', 'month', 'day'].includes(part) ? 1 : 0
    },
    upper(part) {
      return part === 'year'
        ? 9999
        : part === 'month'
          ? 12
          : part === 'day'
            ? getDaysInMonth(dateFrom({ ...this.draft, day: '1' }, this.now))
            : part === 'hour'
              ? 23
              : 59
    },
    normalizeBound(value) {
      return canonical(readParts(value, this.segments), this.segments)
    },
    sync() {
      this.draft = readParts(this.modelValue, this.segments)
      this.timeRevision++
      const date = dateFrom(this.draft, this.now)
      this.cursor = startOfMonth(date)
      this.tab = this.hasDate ? 'date' : 'time'
      this.view = this.segments.some((segment) => segment.part === 'day')
        ? 'days'
        : this.segments.some((segment) => segment.part === 'month')
          ? 'months'
          : 'years'
      this.$nextTick(this.syncValidity)
    },
    syncValidity() {
      this.$refs[`input-${this.segments[0]?.part}`]?.setCustomValidity(
        this.validity,
      )
    },
    focus(part) {
      const target = part || this.segments[0]?.part
      if (target) this.$refs[`input-${target}`]?.focus()
    },
    emitValue(commit = false) {
      const value = this.validity
        ? ''
        : this.segments.every((segment) => !this.draft[segment.part])
          ? ''
          : canonical(this.draft, this.segments)
      this.lastEmitted = value
      this.$emit('update:modelValue', value)
      if (commit && !this.validity) this.$emit('change', value)
      this.$nextTick(this.syncValidity)
    },
    input(part, event) {
      const input = event.target,
        width = part === 'year' ? 4 : 2
      let value = input.value.replace(/\D/g, '').slice(0, width)
      if (value && Number(value) > this.upper(part))
        value = String(this.upper(part))
      this.draft[part] = value
      input.value = value
      this.emitValue()
    },
    commitPart(part) {
      if (this.draft[part])
        this.draft[part] = String(
          Math.max(
            this.lower(part),
            Math.min(this.upper(part), Number(this.draft[part])),
          ),
        ).padStart(part === 'year' ? 4 : 2, '0')
      if ((part === 'month' || part === 'year') && this.draft.day)
        this.draft.day = String(
          Math.min(this.upper('day'), Number(this.draft.day)),
        ).padStart(2, '0')
      this.emitValue(true)
    },
    inputKey(part, event) {
      if (event.key === 'Escape') {
        this.close()
        return
      }
      if (event.key === 'ArrowDown' && event.altKey) {
        event.preventDefault()
        this.open()
        return
      }
      if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return
      event.preventDefault()
      this.draft[part] = String(
        Math.max(
          this.lower(part),
          Math.min(
            this.upper(part),
            Number(this.draft[part] || this.placeholderParts[part]) +
              (event.key === 'ArrowUp' ? 1 : -1),
          ),
        ),
      )
      this.commitPart(part)
    },
    open() {
      if (this.disabled || this.loading) return
      this.clockNow = /* @__PURE__ */ new Date()
      this.opened = true
      this.cursor = startOfMonth(dateFrom(this.draft, this.clockNow))
      this.focusedDate = this.calendarDate
    },
    close() {
      this.opened = false
    },
    fillDefaults() {
      for (const { part } of this.segments)
        if (!this.draft[part]) this.draft[part] = this.placeholderParts[part]
    },
    timeDraft() {
      const parts = dateParts(this.clockNow)
      for (const { part } of this.segments)
        if (this.draft[part]) parts[part] = this.draft[part]
      return parts
    },
    clampTime(parts) {
      const value = canonical(parts, this.segments)
      const bound =
        this.min && value < this.normalizeBound(this.min)
          ? this.min
          : this.max && value > this.normalizeBound(this.max)
            ? this.max
            : void 0
      return bound ? { ...parts, ...readParts(bound, this.segments) } : parts
    },
    timeDisabled(part, value) {
      const first = this.timeDraft(),
        last = { ...first },
        order = ['hour', 'minute', 'second']
      first[part] = last[part] = String(value).padStart(2, '0')
      for (const lower of order.slice(order.indexOf(part) + 1)) {
        first[lower] = '00'
        last[lower] = '59'
      }
      return Boolean(
        (this.min &&
          canonical(last, this.segments) < this.normalizeBound(this.min)) ||
          (this.max &&
            canonical(first, this.segments) > this.normalizeBound(this.max)),
      )
    },
    chooseTime(part, value, commit = false) {
      if (
        !this.opened ||
        this.disabled ||
        this.loading ||
        (this.hasDate && this.tab !== 'time') ||
        this.timeDisabled(part, value)
      )
        return
      this.draft = this.clampTime({
        ...this.timeDraft(),
        [part]: String(value).padStart(2, '0'),
      })
      this.emitValue(commit)
    },
    chooseNow() {
      if (this.disabled || this.loading) return
      this.clockNow = /* @__PURE__ */ new Date()
      if (this.nowDisabled) return
      this.draft = dateParts(this.clockNow)
      this.timeRevision++
      this.cursor = startOfMonth(this.clockNow)
      this.focusedDate = formatDate(this.clockNow, 'yyyy-MM-dd')
      this.emitValue(true)
    },
    clear() {
      this.draft = emptyParts()
      this.timeRevision++
      this.emitValue(true)
    },
    dateDisabled(date) {
      if (date.getFullYear() < 1 || date.getFullYear() > 9999) return true
      const dateOnly = formatDate(date, 'yyyy-MM-dd')
      const bound = (value) => value.replaceAll('/', '-').split(/[T ]/)[0]
      return Boolean(
        (this.min &&
          dateOnly.slice(0, bound(this.min).length) < bound(this.min)) ||
          (this.max &&
            dateOnly.slice(0, bound(this.max).length) > bound(this.max)),
      )
    },
    chooseDate(date) {
      if (this.dateDisabled(date)) return
      this.fillDefaults()
      const parts = dateParts(date)
      this.draft.year = parts.year
      this.draft.month = parts.month
      this.draft.day = parts.day
      if (this.hasTime) this.draft = this.clampTime(this.draft)
      this.cursor = startOfMonth(date)
      this.focusedDate = formatDate(date, 'yyyy-MM-dd')
      this.emitValue(true)
      if (this.hasTime) this.tab = 'time'
      else {
        this.close()
        this.focus()
      }
    },
    chooseMonth(month) {
      this.direction = 1
      const date = new Date(this.cursor)
      date.setMonth(month, 1)
      this.cursor = date
      if (this.segments.some((segment) => segment.part === 'day'))
        this.view = 'days'
      else this.chooseDate(date)
    },
    chooseYear(year) {
      this.direction = 1
      const date = new Date(this.cursor)
      date.setFullYear(year, date.getMonth(), 1)
      this.cursor = date
      if (this.segments.some((segment) => segment.part === 'month'))
        this.view = 'months'
      else this.chooseDate(date)
    },
    move(direction) {
      this.direction = direction
      const amount =
        this.view === 'days'
          ? direction
          : this.view === 'months'
            ? direction * 12
            : direction * 144
      const next = addMonths(this.cursor, amount)
      if (next.getFullYear() >= 1 && next.getFullYear() <= 9999)
        this.cursor = next
    },
    calendarKey(date, event) {
      const offsets = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -7,
        ArrowDown: 7,
        Home: -date.getDay(),
        End: 6 - date.getDay(),
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
        this.focus()
        return
      }
      if (
        !(event.key in offsets) &&
        !['PageUp', 'PageDown'].includes(event.key)
      )
        return
      event.preventDefault()
      const next =
        event.key === 'PageUp' || event.key === 'PageDown'
          ? addMonths(
              date,
              (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1),
            )
          : addDays(date, offsets[event.key])
      if (next.getFullYear() < 1 || next.getFullYear() > 9999) return
      this.direction = next > date ? 1 : -1
      this.cursor = startOfMonth(next)
      this.focusedDate = formatDate(next, 'yyyy-MM-dd')
      this.$nextTick(() =>
        this.$el
          .querySelector(
            `.apple-calendar__page:not([inert]) [data-date="${this.focusedDate}"]`,
          )
          ?.focus({ preventScroll: true }),
      )
    },
    renderCalendar() {
      const year = this.cursor.getFullYear(),
        month = this.cursor.getMonth()
      const grid =
        this.view === 'days'
          ? h4(
              'div',
              {
                class: 'apple-calendar__days',
                role: 'grid',
                'aria-label': `${year}\u5E74${month + 1}\u6708`,
              },
              [
                h4(
                  'div',
                  { class: 'apple-calendar__weekdays', role: 'row' },
                  [
                    '\u65E5',
                    '\u4E00',
                    '\u4E8C',
                    '\u4E09',
                    '\u56DB',
                    '\u4E94',
                    '\u516D',
                  ].map((day) => h4('span', { role: 'columnheader' }, day)),
                ),
                ...Array.from({ length: 6 }, (_, week) =>
                  h4(
                    'div',
                    { class: 'apple-calendar__week', role: 'row' },
                    this.dates.slice(week * 7, week * 7 + 7).map((date) => {
                      const key = formatDate(date, 'yyyy-MM-dd'),
                        selected = key === this.calendarDate,
                        disabled = this.dateDisabled(date)
                      return h4(
                        'span',
                        { role: 'gridcell', 'aria-selected': selected },
                        ripple(
                          h4(
                            'button',
                            {
                              key,
                              ref: `day-${key}`,
                              type: 'button',
                              disabled,
                              tabindex: key === this.focusedDate ? 0 : -1,
                              'data-date': key,
                              'aria-label': formatDate(
                                date,
                                'yyyy\u5E74M\u6708d\u65E5',
                              ),
                              'aria-current':
                                key === formatDate(this.clockNow, 'yyyy-MM-dd')
                                  ? 'date'
                                  : void 0,
                              class: [
                                'apple-calendar__day',
                                {
                                  'is-selected': selected,
                                  'is-other-month': date.getMonth() !== month,
                                },
                              ],
                              onClick: () => this.chooseDate(date),
                              onPointerleave: (event) =>
                                hoverTrail(event, selected),
                              onKeydown: (event) =>
                                this.calendarKey(date, event),
                            },
                            date.getDate().toString(),
                          ),
                          !disabled,
                        ),
                      )
                    }),
                  ),
                ),
              ],
            )
          : h4(
              'div',
              {
                class: 'apple-calendar__choices',
                role: 'group',
                'aria-label':
                  this.view === 'months'
                    ? '\u9009\u62E9\u6708\u4EFD'
                    : '\u9009\u62E9\u5E74\u4EFD',
              },
              (this.view === 'months'
                ? Array.from({ length: 12 }, (_, index) => index)
                : this.years
              ).map((value) => {
                const selected =
                  this.view === 'months'
                    ? year === Number(this.draft.year) &&
                      value + 1 === Number(this.draft.month)
                    : value === Number(this.draft.year)
                return ripple(
                  h4(
                    'button',
                    {
                      type: 'button',
                      class: [
                        'apple-calendar__choice',
                        { 'is-selected': selected },
                      ],
                      'aria-pressed': selected,
                      onPointerleave: (event) => hoverTrail(event, selected),
                      onClick: () =>
                        this.view === 'months'
                          ? this.chooseMonth(value)
                          : this.chooseYear(value),
                    },
                    this.view === 'months'
                      ? `${value + 1}\u6708`
                      : String(value),
                  ),
                )
              }),
            )
      return h4('div', { class: 'apple-calendar' }, [
        h4('div', { class: 'apple-calendar__header' }, [
          ripple(
            h4(
              'button',
              {
                type: 'button',
                class: 'apple-field__icon',
                'aria-label':
                  this.view === 'days'
                    ? '\u4E0A\u4E2A\u6708'
                    : '\u4E0A\u4E00\u9875',
                onClick: () => this.move(-1),
              },
              h4(ChevronLeft, { size: 18 }),
            ),
          ),
          ripple(
            h4(
              'button',
              {
                type: 'button',
                class: 'apple-calendar__heading',
                onClick: () => {
                  this.direction = this.view === 'years' ? 1 : -1
                  this.view =
                    this.view === 'days'
                      ? 'months'
                      : this.view === 'months'
                        ? 'years'
                        : 'days'
                },
              },
              this.view === 'days'
                ? `${year}\u5E74${month + 1}\u6708`
                : this.view === 'months'
                  ? `${year}\u5E74`
                  : `${this.years[0]} \u2013 ${this.years.at(-1)}`,
            ),
          ),
          ripple(
            h4(
              'button',
              {
                type: 'button',
                class: 'apple-field__icon',
                'aria-label':
                  this.view === 'days'
                    ? '\u4E0B\u4E2A\u6708'
                    : '\u4E0B\u4E00\u9875',
                onClick: () => this.move(1),
              },
              h4(ChevronRight, { size: 18 }),
            ),
          ),
        ]),
        h4(
          CalendarPages,
          {
            pageKey: `${this.view}-${year}-${month}`,
            direction: this.direction,
            motion: this.motion,
          },
          { default: () => grid },
        ),
      ])
    },
    renderTime() {
      const segments = this.segments.filter((segment) =>
        ['hour', 'minute', 'second'].includes(segment.part),
      )
      return h4('div', { class: 'apple-calendar__time' }, [
        h4(
          'div',
          { class: 'apple-calendar__time-labels', 'aria-hidden': true },
          segments.map(({ part }) => h4('span', {}, labels[part])),
        ),
        h4(
          'div',
          { class: 'apple-calendar__time-wheels' },
          segments.map(({ part }) =>
            h4(
              'div',
              { class: 'apple-calendar__time-column', 'data-time-part': part },
              [
                h4(TimeWheel, {
                  label: labels[part],
                  modelValue:
                    this.draft[part] === '' ? void 0 : Number(this.draft[part]),
                  fallback: Number(dateParts(this.clockNow)[part]),
                  count: this.upper(part) + 1,
                  active: this.opened && (!this.hasDate || this.tab === 'time'),
                  revision: this.timeRevision,
                  disabledValues: Array.from(
                    { length: this.upper(part) + 1 },
                    (_, value) => this.timeDisabled(part, value),
                  ),
                  'onUpdate:modelValue': (value) =>
                    this.chooseTime(part, value),
                  onChange: (value) => this.chooseTime(part, value, true),
                  onEscape: () => {
                    this.close()
                    this.focus(part)
                  },
                }),
              ],
            ),
          ),
        ),
      ])
    },
  },
  render() {
    const message = this.error || this.hint,
      inactive = this.disabled || this.loading
    const panel =
      this.opened && !inactive
        ? h4(
            'div',
            {
              class: 'apple-date-menu',
              role: 'dialog',
              'aria-label':
                this.label || '\u9009\u62E9\u65E5\u671F\u4E0E\u65F6\u95F4',
              id: `${this.id}-calendar`,
            },
            [
              this.hasDate && this.hasTime
                ? h4(
                    AppleTabBar,
                    {
                      class: 'apple-calendar__tabs',
                      label: '\u65E5\u671F\u4E0E\u65F6\u95F4',
                      motion: this.motion,
                      modelValue: this.tab,
                      items: [
                        { value: 'date', label: '\u65E5\u671F' },
                        { value: 'time', label: '\u65F6\u95F4' },
                      ],
                      'onUpdate:modelValue': (value) => {
                        this.tab = String(value)
                      },
                    },
                    {
                      'panel-date': () => this.renderCalendar(),
                      'panel-time': () => this.renderTime(),
                    },
                  )
                : this.hasDate
                  ? this.renderCalendar()
                  : this.renderTime(),
              h4('div', { class: 'apple-calendar__footer' }, [
                h4(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-calendar__text',
                    onClick: this.clear,
                  },
                  '\u6E05\u9664',
                ),
                h4(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-calendar__text',
                    disabled: this.nowDisabled,
                    onClick: this.chooseNow,
                  },
                  '\u73B0\u5728',
                ),
                ripple(
                  h4(
                    'button',
                    {
                      type: 'button',
                      class: 'apple-calendar__done',
                      onClick: () => {
                        this.close()
                        this.focus()
                      },
                    },
                    '\u5B8C\u6210',
                  ),
                ),
              ]),
            ],
          )
        : null
    return h4(
      'div',
      {
        class: [
          'apple-field',
          'apple-date-field',
          this.$attrs.class,
          { 'has-error': !!this.error, 'is-disabled': inactive },
        ],
        'data-apple-motion': this.motion,
        'data-apple-popup-open': this.opened ? true : void 0,
        onFocusout: (event) => {
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget)
          )
            this.close()
        },
        onKeydown: (event) => {
          if (event.key === 'Escape') this.close()
        },
      },
      [
        this.label
          ? h4(
              'span',
              { class: 'apple-field__label', id: `${this.id}-label` },
              [
                this.label,
                this.required
                  ? h4(
                      'span',
                      { 'aria-hidden': true, class: 'apple-field__required' },
                      ' *',
                    )
                  : null,
              ],
            )
          : null,
        h4('div', { class: 'apple-date-anchor' }, [
          h4(
            'div',
            {
              class: 'apple-date-input apple-input-wrap',
              role: 'group',
              'aria-label':
                this.$attrs['aria-label'] ||
                this.label ||
                '\u65E5\u671F\u4E0E\u65F6\u95F4',
              'aria-labelledby':
                this.$attrs['aria-labelledby'] ||
                (!this.$attrs['aria-label'] && this.label
                  ? `${this.id}-label`
                  : void 0),
            },
            [
              h4(
                'div',
                { class: 'apple-date-segments' },
                this.segments.flatMap(({ part, separator, width }, index) => [
                  h4('input', {
                    ...this.$attrs,
                    class: 'apple-date-segment',
                    id: index === 0 ? this.id : `${this.id}-${part}`,
                    ref: `input-${part}`,
                    name: void 0,
                    type: 'text',
                    inputmode: 'numeric',
                    autocomplete: 'off',
                    maxlength: width,
                    size: width,
                    value: this.draft[part],
                    placeholder: this.placeholderParts[part],
                    disabled: inactive,
                    required: this.required,
                    'data-part': part,
                    'aria-label': `${this.label || this.$attrs['aria-label'] || ''}${labels[part]}`,
                    'aria-invalid': this.error ? true : void 0,
                    'aria-describedby': message ? `${this.id}-message` : void 0,
                    onFocus: (event) => event.target.select(),
                    onInput: (event) => this.input(part, event),
                    onBlur: () => this.commitPart(part),
                    onKeydown: (event) => this.inputKey(part, event),
                  }),
                  separator
                    ? h4(
                        'span',
                        { class: 'apple-date-separator', 'aria-hidden': true },
                        separator,
                      )
                    : null,
                ]),
              ),
              ripple(
                h4(
                  'button',
                  {
                    type: 'button',
                    class: 'apple-field__icon',
                    disabled: inactive,
                    'aria-label': this.hasDate
                      ? '\u6253\u5F00\u65E5\u5386'
                      : '\u9009\u62E9\u65F6\u95F4',
                    'aria-expanded': this.opened,
                    'aria-controls': `${this.id}-calendar`,
                    onClick: () => (this.opened ? this.close() : this.open()),
                  },
                  h4(this.hasDate ? CalendarDays : Clock3, { size: 19 }),
                ),
              ),
            ],
          ),
          popupTransition(panel, 'apple-date-pop'),
        ]),
        this.$attrs.name
          ? h4('input', {
              type: 'hidden',
              name: this.$attrs.name,
              value: this.modelValue,
              disabled: inactive,
            })
          : null,
        message
          ? h4(
              'p',
              {
                id: `${this.id}-message`,
                class: ['apple-field__message', { 'is-error': !!this.error }],
                role: this.error ? 'alert' : void 0,
              },
              message,
            )
          : null,
      ],
    )
  },
})
export { AppleDatePicker, appleKey, createApple, resolveMotion, themeStyle }
