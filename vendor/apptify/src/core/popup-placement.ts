import type { ObjectDirective } from 'vue'
import { showOverlaySurface } from './overlay-surface'

export type PopupSide = 'top' | 'bottom' | 'left' | 'right'
export function choosePopupSide(
  preferred: PopupSide,
  anchor: Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  gap = 8,
): PopupSide {
  const spaces = {
    top: anchor.top - gap - 8,
    bottom: viewport.height - anchor.bottom - gap - 8,
    left: anchor.left - gap - 8,
    right: viewport.width - anchor.right - gap - 8,
  }
  const opposite: Record<PopupSide, PopupSide> = {
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

export function applyPopupSide(element: HTMLElement, side: PopupSide, gap = 8) {
  const changed = element.dataset.placement !== side
  element.dataset.placement = side
  element.style.transformOrigin = (
    {
      top: 'center bottom',
      bottom: 'center top',
      left: 'right center',
      right: 'left center',
    } as const
  )[side]
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

export interface PopupPositioner {
  update(): void
  destroy(): void
}
interface PopupPositionOptions {
  anchor: HTMLElement
  placement?: () => PopupSide
  align?: () => 'start' | 'center' | 'end'
  fixed?: boolean
  gap?: number
}

/** Keep measurements in viewport coordinates and never uncap a live scrollport
 * to measure it: doing so clamps scrollTop to zero before constraints return. */
export function createPopupPositioner(
  panel: HTMLElement,
  options: PopupPositionOptions,
): PopupPositioner {
  const { anchor, fixed = false, gap = 8 } = options
  const doc = anchor.ownerDocument,
    win = doc.defaultView!
  let destroyed = false,
    updating = false,
    tracking = 0,
    anchorGeometry = ''
  const set = (name: string, value: string) => {
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
    // Width limits belong to the viewport, even inside a narrow/scrolling card.
    const viewportWidth = Math.max(0, bounds.right - bounds.left)
    set('--apple-popup-viewport-width', `${viewportWidth}px`)
    const css = win.getComputedStyle(panel)
    const border =
      (parseFloat(css.borderTopWidth) || 0) +
      (parseFloat(css.borderBottomWidth) || 0)
    const scroll = panel.querySelector<HTMLElement>('[data-apple-popup-scroll]')
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
    // Older engines without a top layer can still position fixed popups inside
    // their containing block. Modern engines always take the viewport branch.
    const parent = panel.offsetParent as HTMLElement | null
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
  const onScroll = (event: Event) => {
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

const states = new WeakMap<HTMLElement, PopupPositioner>()
/** Field popups retain their DOM/focus owner while rendering in the top layer. */
export function updateFieldPopup(element: HTMLElement) {
  states.get(element)?.update()
}
export function unmountFieldPopup(element: HTMLElement) {
  states.get(element)?.destroy()
  states.delete(element)
}
export function mountFieldPopup(element: HTMLElement, gap = 8) {
  if (element.style.display === 'none') return
  const anchor = element.parentElement
  // Safari does not focus buttons on pointer activation. Keep keyboard events
  // in the field's existing focus scope without scrolling its container.
  if (
    !states.has(element) &&
    anchor &&
    !anchor.contains(element.ownerDocument.activeElement)
  ) {
    anchor
      .querySelector<HTMLElement>('[aria-expanded]')
      ?.focus({ preventScroll: true })
  }
  showOverlaySurface(element)
  if (states.has(element)) {
    updateFieldPopup(element)
    return
  }
  if (anchor && element.ownerDocument.defaultView)
    states.set(element, createPopupPositioner(element, { anchor, gap }))
}
export const FieldPopupPlacement: ObjectDirective<
  HTMLElement,
  { gap?: number } | undefined
> = {
  mounted: (element, binding) => mountFieldPopup(element, binding.value?.gap),
  updated: updateFieldPopup,
  unmounted(element) {
    if (!element.isConnected) unmountFieldPopup(element)
  },
}
