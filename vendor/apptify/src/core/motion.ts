import {
  watch,
  withDirectives,
  type DirectiveBinding,
  type ObjectDirective,
  type VNode,
} from 'vue'
import { Ripple } from 'vuetify/directives/ripple'
import { appleKey, resolveMotion, type AppleContext } from './context'
import '../styles/ripple.css'

export function motionDuration(element: HTMLElement, fallback = 300): number {
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
    ? parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000)
    : fallback
}

// Keep Vuetify's listeners stable. Its enabled/disabled update replaces the
// keyboard callback before removing it, leaving the previous listener attached.
// Gating the mounted state also lets keyup/blur reset a held keyboard ripple when
// an ancestor changes its motion policy in the middle of a press.
type RippleElement = HTMLElement & {
  _ripple?: {
    enabled: boolean
    showTimer?: number
    showTimerCommit?: (() => void) | null
    touched?: boolean
  }
}
const rippleStates = new Map<
  HTMLElement,
  {
    update: (binding: DirectiveBinding<boolean>) => void
    sync: () => void
    destroy: () => void
  }
>()
let ripplePolicyObserver: MutationObserver | undefined
let rippleMedia: MediaQueryList | undefined
const syncRipplePolicies = () => rippleStates.forEach((state) => state.sync())
function observeRipplePolicies() {
  if (ripplePolicyObserver || typeof document === 'undefined') return
  ripplePolicyObserver = new MutationObserver((records) => {
    for (const [element, state] of rippleStates) {
      if (
        records.some((record) => (record.target as Element).contains(element))
      )
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
      : undefined
  rippleMedia?.addEventListener?.('change', syncRipplePolicies)
}
export const AppleRipple: ObjectDirective<HTMLElement, boolean> = {
  mounted(element, binding) {
    const el = element as RippleElement
    let current = binding
    // Directives run outside setup; use their rendering component's injection
    // scope so app policy also applies without a provider DOM ancestor.
    const scope = binding.instance?.$ as
      | { provides: Record<symbol, AppleContext | undefined> }
      | undefined
    const context = scope?.provides[appleKey as symbol]
    el.setAttribute('data-apple-ripple', '')
    // Establish the containing block without writing/restoring inline position
    // after every wave. Consumer fixed/sticky/absolute positioning stays intact.
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
      // Never remove a nested control's wave.
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
    // Ancestor policy can change without this component rerendering.
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
      : undefined
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
      ripplePolicyObserver = undefined
      rippleMedia?.removeEventListener?.('change', syncRipplePolicies)
      rippleMedia = undefined
    }
  },
}

export function ripple(node: VNode, enabled = true): VNode {
  return withDirectives(node, [[AppleRipple, enabled]])
}

const entrances = new WeakMap<HTMLElement, Animation>()
export function animateEntrance(
  element: HTMLElement,
  axis: 'x' | 'y' = 'y',
): Animation | undefined {
  entrances.get(element)?.cancel()
  const duration = motionDuration(element)
  if (duration <= 80 || !element.animate) return
  // Give whole-page entrances more breathing room than control interactions.
  const animation = element.animate(
    [
      {
        transform: axis === 'x' ? 'translateX(-14px)' : 'translateY(14px)',
        opacity: 0,
      },
      { transform: 'translate(0)', opacity: 1 },
    ],
    { duration: duration * 1.8, easing: 'cubic-bezier(.25,.1,.25,1)' },
  )
  entrances.set(element, animation)
  animation.onfinish = () => entrances.delete(element)
  return animation
}

// Entrance only: never duplicates the page or delays replacement for a leave phase.
export const AppleEntrance: ObjectDirective<HTMLElement, unknown> = {
  mounted: (element) => {
    animateEntrance(element)
  },
  updated(element, binding) {
    if (motionDuration(element) <= 80) entrances.get(element)?.cancel()
    else if (!Object.is(binding.value, binding.oldValue))
      animateEntrance(element)
  },
  unmounted(element) {
    entrances.get(element)?.cancel()
    entrances.delete(element)
  },
}

type SelectionValue = unknown | { selector: string }
const selections = new WeakMap<
  HTMLElement,
  { update: (value?: SelectionValue) => void; destroy: () => void }
>()

export const AppleSelection: ObjectDirective<HTMLElement, SelectionValue> = {
  mounted(element, binding) {
    const indicator = document.createElement('span')
    indicator.className = 'apple-selection-indicator'
    indicator.setAttribute('aria-hidden', 'true')
    element.classList.add('apple-selection')
    element.appendChild(indicator)
    let value = binding.value
    let initialized = false
    let frame = 0
    const measure = () => {
      const selector =
        value && typeof value === 'object' && 'selector' in value
          ? String(value.selector)
          : '[data-apple-selected="true"]'
      const target = element.querySelector<HTMLElement>(selector)
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
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const reflow = () => {
      // A resized container must not paint an indicator at its previous, potentially out-of-bounds position.
      cancelAnimationFrame(frame)
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
        cancelAnimationFrame(frame)
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
