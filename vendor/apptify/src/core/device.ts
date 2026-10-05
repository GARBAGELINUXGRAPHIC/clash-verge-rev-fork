import { readonly, ref } from 'vue'

export const touchDeviceQuery = '(any-pointer: coarse)'
export const detectTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.navigator.maxTouchPoints > 0 ||
    (window.matchMedia?.(touchDeviceQuery).matches ?? false))

const touchDevice = ref(detectTouchDevice())
/** Shared across apps, components and teleported overlays. */
export const isTouchDevice = readonly(touchDevice)

let media: MediaQueryList | undefined
export function syncTouchDevice() {
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
