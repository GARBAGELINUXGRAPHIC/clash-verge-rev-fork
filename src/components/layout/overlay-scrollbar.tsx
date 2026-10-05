import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'

export const OverlayScrollbar = () => {
  const { pathname } = useLocation()
  const targetRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ y: number; scrollTop: number } | null>(null)
  const [geometry, setGeometry] = useState<{
    opacity: number
    zIndex: number
    scale: number
    left: number
    top: number
    height: number
    thumbHeight: number
    thumbTop: number
  } | null>(null)

  const update = () => {
    const target = targetRef.current
    if (!target?.isConnected || target.scrollHeight <= target.clientHeight) {
      setGeometry(null)
      return
    }
    const rect = target.getBoundingClientRect()
    const thumbHeight = Math.min(
      target.clientHeight,
      Math.max(24, target.clientHeight ** 2 / target.scrollHeight),
    )
    const scale = rect.height / target.offsetHeight || 1
    let opacity = 1
    let zIndex = 1200
    for (
      let ancestor: HTMLElement | null = target;
      ancestor;
      ancestor = ancestor.parentElement
    ) {
      const style = getComputedStyle(ancestor)
      opacity *= Number(style.opacity)
      if (ancestor.matches('.MuiModal-root')) zIndex = Number(style.zIndex) + 1
    }
    const next = {
      opacity,
      zIndex,
      scale,
      left: rect.left + (target.clientLeft + target.clientWidth - 8) * scale,
      top: rect.top + target.clientTop * scale,
      height: target.clientHeight,
      thumbHeight,
      thumbTop:
        (target.scrollTop / (target.scrollHeight - target.clientHeight)) *
        (target.clientHeight - thumbHeight),
    }
    setGeometry((previous) =>
      previous &&
      Object.keys(next).every(
        (key) =>
          previous[key as keyof typeof next] === next[key as keyof typeof next],
      )
        ? previous
        : next,
    )
  }

  useEffect(() => {
    targetRef.current = null
    const observer = new ResizeObserver(() => schedule())
    const select = (target: HTMLElement) => {
      if (targetRef.current === target) return
      observer.disconnect()
      targetRef.current = target
      observer.observe(target)
      if (target.firstElementChild) observer.observe(target.firstElementChild)
      update()
    }
    const isScrollable = (element: HTMLElement) =>
      element.scrollHeight > element.clientHeight &&
      element.clientHeight > 0 &&
      /auto|scroll/.test(getComputedStyle(element).overflowY)
    const activeScope = () =>
      Array.from(document.querySelectorAll<HTMLElement>('.MuiModal-root'))
        .filter(
          (element) =>
            element.getAttribute('aria-hidden') !== 'true' &&
            getComputedStyle(element).visibility !== 'hidden',
        )
        .at(-1) ?? document.querySelector<HTMLElement>('.base-page')
    let frame = 0
    const refresh = () => {
      frame = 0
      const scope = activeScope()
      if (!scope) {
        targetRef.current = null
        update()
        return
      }
      if (
        !targetRef.current ||
        !scope.contains(targetRef.current) ||
        !isScrollable(targetRef.current)
      ) {
        const target = [
          scope,
          ...scope.querySelectorAll<HTMLElement>('*'),
        ].find(isScrollable)
        if (target) select(target)
        else targetRef.current = null
      }
      update()
      // Track the actual fade/scale/slide, including exit transitions.
      let ancestor = targetRef.current
      while (ancestor) {
        if (
          ancestor
            .getAnimations()
            .some((animation) => animation.playState === 'running')
        ) {
          schedule()
          break
        }
        ancestor = ancestor.parentElement
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(refresh)
    }
    const onPointerOver = (event: PointerEvent) => {
      if (dragRef.current) return
      const scope = activeScope()
      let element = event.target instanceof HTMLElement ? event.target : null
      while (element && scope?.contains(element)) {
        if (isScrollable(element)) {
          select(element)
          schedule()
          return
        }
        element = element.parentElement
      }
    }
    const onScroll = (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        activeScope()?.contains(event.target) &&
        isScrollable(event.target)
      )
        select(event.target)
      schedule()
    }
    const mutations = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            !(
              record.target instanceof Element &&
              record.target.closest('[data-overlay-scrollbar]')
            ),
        )
      )
        schedule()
    })
    mutations.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-hidden'],
    })
    document.addEventListener('transitionrun', schedule, true)
    document.addEventListener('animationstart', schedule, true)
    schedule()
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      mutations.disconnect()
      document.removeEventListener('transitionrun', schedule, true)
      document.removeEventListener('animationstart', schedule, true)
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', schedule)
    }
  }, [pathname])

  if (!geometry) return null

  return createPortal(
    <div
      data-overlay-scrollbar
      style={{
        position: 'fixed',
        left: geometry.left,
        top: geometry.top,
        height: geometry.height,
        width: 8,
        zIndex: geometry.zIndex,
        opacity: geometry.opacity,
        transform: `scale(${geometry.scale})`,
        transformOrigin: 'top left',
      }}
      onWheel={(event) => {
        if (targetRef.current) targetRef.current.scrollTop += event.deltaY
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: geometry.thumbTop,
          height: geometry.thumbHeight,
          left: 1,
          width: 6,
          borderRadius: 4,
          background: 'var(--scrollbar-thumb)',
          touchAction: 'none',
          cursor: 'default',
        }}
        onPointerDown={(event) => {
          if (event.button !== 0 || !targetRef.current) return
          event.preventDefault()
          dragRef.current = {
            y: event.clientY,
            scrollTop: targetRef.current.scrollTop,
          }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const target = targetRef.current
          const drag = dragRef.current
          if (!target || !drag) return
          target.scrollTop =
            drag.scrollTop +
            (((event.clientY - drag.y) / geometry.scale) *
              (target.scrollHeight - target.clientHeight)) /
              (geometry.height - geometry.thumbHeight)
        }}
        onLostPointerCapture={() => {
          dragRef.current = null
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
      />
    </div>,
    document.body,
  )
}
