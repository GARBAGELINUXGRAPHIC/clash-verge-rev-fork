import { useTheme } from '@emotion/react'
import type { SxProps, Theme } from '@mui/material'
import {
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from 'react'

import { AppleLayout, appleDeclarations } from './apple-style'
import './apple-controls.css'

interface SegmentProps {
  value: unknown
  children?: ReactNode
  disabled?: boolean
  onClick?: (event: MouseEvent<HTMLElement>) => void
  sx?: SxProps<Theme>
  'aria-label'?: string
  title?: string
  size?: string
}
export const AppleSegment = (_props: SegmentProps) => null
interface Props {
  value?: unknown
  children?: ReactNode
  onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: any) => void
  exclusive?: boolean
  disabled?: boolean
  size?: string
  sx?: SxProps<Theme>
  className?: string
  'aria-label'?: string
}
export const AppleSegmentedControl = ({
  value,
  children,
  onChange,
  disabled,
  sx,
  className,
  ...props
}: Props) => {
  const theme = useTheme() as Theme
  const groupId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const initializedRef = useRef(false)
  const items = appleDeclarations<SegmentProps>(children)
  useLayoutEffect(() => {
    const element = rootRef.current
    const marker = indicatorRef.current
    if (!element || !marker) return
    const measure = () => {
      const selected = element.querySelector<HTMLElement>(
        '[data-selected=true]',
      )
      marker.hidden = !selected
      if (!selected) return
      marker.style.transitionDuration = initializedRef.current ? '' : '0ms'
      marker.style.width = `${selected.offsetWidth}px`
      marker.style.height = `${selected.offsetHeight}px`
      marker.style.transform = `translate(${selected.offsetLeft}px, ${selected.offsetTop}px)`
      initializedRef.current = true
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const item of element.querySelectorAll<HTMLElement>('label'))
      observer.observe(item)
    return () => observer.disconnect()
  }, [value, children])
  return (
    <AppleLayout
      ref={rootRef}
      role="radiogroup"
      aria-label={props['aria-label']}
      className={`apple-segmented ${className ?? ''}`}
      data-scheme={theme.palette.mode}
      sx={sx}
    >
      {items.map((item) => (
        <AppleLayout
          as="label"
          key={String(item.props.value)}
          className="apple-segmented__item"
          sx={item.props.sx}
          data-selected={Object.is(item.props.value, value)}
          data-disabled={disabled || item.props.disabled}
          title={item.props.title}
        >
          <input
            type="radio"
            name={groupId}
            checked={Object.is(item.props.value, value)}
            disabled={disabled || item.props.disabled}
            aria-label={item.props['aria-label']}
            onClick={item.props.onClick as any}
            onChange={(event) => onChange?.(event, item.props.value)}
          />
          <span>{item.props.children}</span>
        </AppleLayout>
      ))}
      <span
        ref={indicatorRef}
        className="apple-selection-indicator"
        aria-hidden="true"
      />
    </AppleLayout>
  )
}
