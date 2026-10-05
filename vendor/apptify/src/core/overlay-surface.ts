import type { ObjectDirective } from 'vue'

/** The browser's top layer escapes clipping and transformed containing blocks
 * without moving Vue's DOM, focus scope, or inherited theme out of its owner. */
export function showOverlaySurface(element: HTMLElement) {
  if (!element.isConnected || typeof element.showPopover !== 'function') return
  element.setAttribute('data-apple-overlay-surface', '')
  element.setAttribute('popover', 'manual')
  if (!element.matches(':popover-open')) element.showPopover()
}

export function hideOverlaySurface(element: HTMLElement) {
  if (
    typeof element.hidePopover === 'function' &&
    element.matches(':popover-open')
  )
    element.hidePopover()
}

export const OverlaySurface: ObjectDirective<HTMLElement> = {
  mounted: showOverlaySurface,
  // Vue retains leaving nodes. Removing the top-layer entry before leave ends
  // would briefly paint the panel back inside its clipped containing block.
  unmounted(element) {
    if (!element.isConnected) hideOverlaySurface(element)
  },
}
