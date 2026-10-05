import { useLayoutEffect, useRef } from 'react'

// Fade and move the complete surface, including its glass and shadow.
// Release compositing hints and the transform when the animation settles.
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
    const progress = () =>
      Math.max(
        0,
        Math.min(1, Number.parseFloat(getComputedStyle(element).opacity)),
      )
    const from = element.hidden ? 0 : progress()
    const to = open ? 1 : 0
    const frame = (value: number) => ({
      opacity: String(value),
      transform: `translateY(${media.matches ? 0 : offsetY * (1 - value)}px)`,
    })
    element.hidden = false
    element.style.willChange = 'transform'
    const timing: KeyframeAnimationOptions = {
      duration: (media.matches ? 80 : 300) * Math.abs(to - from),
      easing: 'cubic-bezier(.2,.65,.3,1)',
      fill: 'both',
    }
    const animation = element.animate([frame(from), frame(to)], timing)
    const finish = () => {
      // Remove the settled transform rather than retaining an identity layer.
      element.style.transform = ''
      element.style.opacity = String(to)
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
      const current = progress()
      Object.assign(element.style, frame(current))
      animation.cancel()
      element.style.willChange = ''
      media.removeEventListener('change', policy)
    }
  }, [open, placed, offsetY])
  return popupRef
}
