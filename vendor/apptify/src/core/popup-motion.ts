import {
  getCurrentInstance,
  h,
  Transition,
  withDirectives,
  type VNode,
  type VNodeChild,
} from 'vue'
import { motionDuration } from './motion'
import {
  FieldPopupPlacement,
  mountFieldPopup,
  updateFieldPopup,
  unmountFieldPopup,
} from './popup-placement'
import { hideOverlaySurface } from './overlay-surface'

interface PopupAnimation {
  animation?: Animation
  value: number
  from: number
  to: number
  done: () => void
  dispose: () => void
}
const animations = new WeakMap<HTMLElement, PopupAnimation>()
const values = new WeakMap<HTMLElement, number>()
const transitions = new WeakMap<
  object,
  Map<string, { open: boolean; interrupted?: number }>
>()
const cleanup = {
  unmounted: (element: HTMLElement) => {
    if (!element.isConnected) freezePopup(element)
  },
}

function progress(element: HTMLElement, state: PopupAnimation) {
  // Resume from the rendered frame. In particular, WebKit's effect timing can
  // be a frame ahead of the style currently on screen during a reversal.
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
function frame(element: HTMLElement, value: number): Record<string, string> {
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
function applyFrame(element: HTMLElement, value: number) {
  for (const [property, setting] of Object.entries(frame(element, value)))
    element.style.setProperty(property, setting)
}

export function freezePopup(element: Element) {
  const el = element as HTMLElement,
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
export function finishPopup(element: HTMLElement) {
  const state = animations.get(element)
  if (!state) return
  applyFrame(element, state.to)
  values.set(element, state.to)
  state.animation?.cancel()
  state.dispose()
  animations.delete(element)
  state.done()
}
export function resetPopup(element: Element) {
  const el = element as HTMLElement
  el.style.transform = ''
  el.style.clipPath = ''
  el.style.opacity = ''
  el.style.willChange = ''
  el.style.removeProperty('--apple-modal-progress')
}
export function preparePopup(element: Element, interrupted?: number) {
  const el = element as HTMLElement
  freezePopup(el)
  if (interrupted !== undefined) values.set(el, interrupted)
  else if (!values.has(el)) values.set(el, 0)
  applyFrame(el, values.get(el)!)
}

/** Animate the complete surface, including its shadow. Keep the current frame
 * until its replacement is ready, including on reversal and placement changes. */
export function animatePopup(
  element: Element,
  opened: boolean,
  done: () => void,
) {
  const el = element as HTMLElement
  freezePopup(el)
  const from = values.get(el) ?? (opened ? 0 : 1),
    to = opened ? 1 : 0
  const state: PopupAnimation = {
    value: from,
    from,
    to,
    done,
    dispose: () => {},
  }
  const run = () => {
    state.value = progress(el, state)
    applyFrame(el, state.value)
    state.animation?.cancel()
    state.animation = undefined
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
  const media = el.ownerDocument.defaultView?.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  )
  media?.addEventListener?.('change', policy)
  el.addEventListener('apple-popup-placement', run)
  state.dispose = () => {
    observer.disconnect()
    media?.removeEventListener?.('change', policy)
    el.removeEventListener('apple-popup-placement', run)
    el.style.willChange = ''
  }
  animations.set(el, state)
  run()
}

/** Shared field transition keeps the full panel layout stable during motion. */
export function popupTransition(
  content: VNodeChild,
  name = 'apple-field-menu',
  persisted = false,
  gap = 8,
) {
  const owner = getCurrentInstance()!
  if (!transitions.has(owner)) transitions.set(owner, new Map())
  const records = transitions.get(owner)!
  if (!records.has(name)) records.set(name, { open: false })
  const record = records.get(name)!
  record.open = !!content
  const clear = (element: Element) => {
    element.classList.remove(`${name}-enter-active`, `${name}-leave-active`)
    resetPopup(element)
  }
  return h(
    Transition,
    {
      name,
      css: false,
      persisted,
      onBeforeEnter: (el: Element) => {
        preparePopup(el, record.interrupted)
        record.interrupted = undefined
      },
      onEnter: (element: Element, done: () => void) => {
        const el = element as HTMLElement
        mountFieldPopup(el, gap)
        el.classList.add(`${name}-enter-active`)
        animatePopup(el, true, done)
      },
      onBeforeLeave: (el: Element) => updateFieldPopup(el as HTMLElement),
      onLeave: (element: Element, done: () => void) => {
        element.classList.add(`${name}-leave-active`)
        animatePopup(element, false, done)
      },
      onAfterEnter: clear,
      onAfterLeave: (el: Element) => {
        // v-if replaces a leaving DOM node when reopened. Vue finishes its old
        // leave callback first; transfer the visible fraction to the new node.
        const value = freezePopup(el)
        record.interrupted = record.open && !persisted ? value : undefined
        hideOverlaySurface(el as HTMLElement)
        clear(el)
        unmountFieldPopup(el as HTMLElement)
      },
      onEnterCancelled: (el: Element) => {
        freezePopup(el)
        el.classList.remove(`${name}-enter-active`)
      },
      onLeaveCancelled: (el: Element) => {
        ;(el as HTMLElement).style.display = ''
        freezePopup(el)
        el.classList.remove(`${name}-leave-active`)
      },
    },
    {
      default: () =>
        content
          ? withDirectives(content as VNode, [
              [FieldPopupPlacement, { gap }],
              [cleanup],
            ])
          : content,
    },
  )
}
