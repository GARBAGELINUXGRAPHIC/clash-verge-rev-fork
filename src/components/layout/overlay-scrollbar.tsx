import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'

export const OverlayScrollbar = () => {
  const { pathname } = useLocation()
  const targetRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{ y: number; scrollTop: number } | null>(null)
  const [geometry, setGeometry] = useState<{
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
    setGeometry({
      left: rect.left + target.clientLeft + target.clientWidth - 8,
      top: rect.top + target.clientTop,
      height: target.clientHeight,
      thumbHeight,
      thumbTop:
        (target.scrollTop / (target.scrollHeight - target.clientHeight)) *
        (target.clientHeight - thumbHeight),
    })
  }

  useEffect(() => {
    targetRef.current = null
    const observer = new ResizeObserver(update)
    const select = (target: HTMLElement) => {
      if (targetRef.current === target) return
      observer.disconnect()
      targetRef.current = target
      observer.observe(target)
      if (target.firstElementChild) observer.observe(target.firstElementChild)
      update()
    }
    const onPointerOver = (event: PointerEvent) => {
      if (dragRef.current) return
      let element = event.target instanceof HTMLElement ? event.target : null
      while (element) {
        if (
          element.scrollHeight > element.clientHeight &&
          /auto|scroll/.test(getComputedStyle(element).overflowY)
        ) {
          select(element)
          return
        }
        element = element.parentElement
      }
    }
    const onScroll = (event: Event) => {
      if (
        event.target instanceof HTMLElement &&
        /auto|scroll/.test(getComputedStyle(event.target).overflowY)
      )
        select(event.target)
      update()
    }
    const frame = requestAnimationFrame(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('.base-page *'),
      ).find(
        (element) =>
          element.scrollHeight > element.clientHeight &&
          /auto|scroll/.test(getComputedStyle(element).overflowY),
      )
      if (target) select(target)
      else update()
    })
    document.addEventListener('pointerover', onPointerOver)
    document.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('pointerover', onPointerOver)
      document.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', update)
    }
  }, [pathname])

  if (!geometry) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: geometry.left,
        top: geometry.top,
        height: geometry.height,
        width: 8,
        zIndex: 1200,
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
            ((event.clientY - drag.y) *
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
