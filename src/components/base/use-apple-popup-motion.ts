import { useLayoutEffect, useRef } from 'react'

// Apptify popup-motion: move the complete surface (including shadow), and
// reverse from the rendered frame rather than restarting an interrupted motion.
export function useApplePopupMotion(
  open: boolean,
  placed: boolean,
  offsetY: number,
) {
  const popupRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = popupRef.current
    if (!element || !placed) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const from = element.hidden
      ? 0
      : Math.max(
          0,
          Math.min(1, Number.parseFloat(getComputedStyle(element).opacity)),
        )
    const to = open ? 1 : 0
    const frame = (progress: number) => ({
      opacity: String(progress),
      transform: `translateY(${media.matches ? 0 : offsetY * (1 - progress)}px)`,
    })
    element.hidden = false
    element.style.willChange = 'opacity, transform'
    const animation = element.animate([frame(from), frame(to)], {
      duration: (media.matches ? 80 : 300) * Math.abs(to - from),
      easing: 'cubic-bezier(.2,.65,.3,1)',
      fill: 'both',
    })
    const finish = () => {
      Object.assign(element.style, frame(to))
      animation.cancel()
      element.hidden = !open
      element.style.willChange = ''
    }
    animation.onfinish = finish
    const policy = () => {
      if (media.matches) finish()
    }
    media.addEventListener('change', policy)
    return () => {
      const progress = Math.max(
        0,
        Math.min(1, Number.parseFloat(getComputedStyle(element).opacity)),
      )
      Object.assign(element.style, frame(progress))
      animation.cancel()
      element.style.willChange = ''
      media.removeEventListener('change', policy)
    }
  }, [open, placed, offsetY])
  return popupRef
}
