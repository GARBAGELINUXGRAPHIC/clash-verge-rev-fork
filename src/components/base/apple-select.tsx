import { useTheme } from '@emotion/react'
import type { SelectProps, SelectChangeEvent, Theme } from '@mui/material'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react'
import { createPortal } from 'react-dom'

import { AppleLayout, appleDeclarations } from './apple-style'
import { useApplePopupMotion } from './use-apple-popup-motion'
import './apple-controls.css'

export const AppleOption = (_props: {
  value?: unknown
  children?: ReactNode
  disabled?: boolean
  [key: string]: unknown
}) => null
export function AppleSelect<Value = unknown>({
  value,
  defaultValue,
  onChange,
  children,
  disabled,
  label,
  id,
  name,
  sx,
  className,
  fullWidth,
  error,
  required,
  autoFocus,
  renderValue,
  onBlur,
  onFocus,
  ...props
}: SelectProps<Value>) {
  const theme = useTheme() as Theme
  const generatedId = useId()
  const controlId = id ?? generatedId
  const labelId = `${controlId}-label`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [internal, setInternal] = useState(defaultValue)
  const current = value === undefined ? internal : value
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [keyboard, setKeyboard] = useState(false)
  const [position, setPosition] = useState<{
    left: number
    top: number
    width: number
    maxHeight: number
    offsetY: number
  } | null>(null)
  const popupRef = useApplePopupMotion(
    open && !disabled,
    !!position,
    position?.offsetY ?? -8,
  )
  const options = appleDeclarations<{
    value: Value
    disabled?: boolean
    children?: ReactNode
  }>(children)
  const selectedIndex = options.findIndex((option) =>
    Object.is(option.props.value, current),
  )
  const selected = options[selectedIndex]
  const available = options
    .map((option, index) => (option.props.disabled ? -1 : index))
    .filter((index) => index >= 0)
  const choose = (index: number, event: React.SyntheticEvent) => {
    const option = options[index]
    if (!option || option.props.disabled || disabled) return
    setInternal(option.props.value)
    onChange?.(
      {
        ...event,
        target: { name: name ?? '', value: option.props.value },
      } as SelectChangeEvent<Value>,
      option as ReactElement,
    )
    setOpen(false)
    triggerRef.current?.focus()
  }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const height = Math.min(280, options.length * 36 + 14)
      const below = window.innerHeight - rect.bottom - 14
      const above = rect.top - 14
      const flip = below < height && above > below
      const maxHeight = Math.min(height, Math.max(36, flip ? above : below))
      setPosition({
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - rect.width - 8),
        ),
        top: flip ? rect.top - maxHeight - 6 : rect.bottom + 6,
        width: rect.width,
        maxHeight,
        offsetY: flip ? 8 : -8,
      })
    }
    const frame = requestAnimationFrame(place)
    const observer = new ResizeObserver(place)
    if (triggerRef.current) observer.observe(triggerRef.current)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, options.length])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !listRef.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => {
    if (open && keyboard)
      listRef.current
        ?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' })
  }, [active, open, keyboard])
  return (
    <AppleLayout
      ref={rootRef}
      className={`apple-field ${className ?? ''}`}
      data-scheme={theme.palette.mode}
      data-error={error}
      sx={sx}
      style={{ width: fullWidth ? '100%' : undefined, minWidth: 140 }}
    >
      {label && (
        <span className="apple-field__label" id={labelId}>
          {label}
          {required ? ' *' : ''}
        </span>
      )}
      <div
        className="apple-input-wrap apple-select-wrap"
        data-disabled={disabled}
        data-open={open}
      >
        <button
          ref={triggerRef}
          id={controlId}
          type="button"
          className="apple-control apple-select"
          role="combobox"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-label={props['aria-label']}
          aria-labelledby={label ? labelId : props.labelId}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${controlId}-list`}
          aria-activedescendant={
            open && active >= 0 ? `${controlId}-option-${active}` : undefined
          }
          onBlur={(event) => {
            onBlur?.(event as any)
            setOpen(false)
          }}
          onFocus={onFocus as any}
          onClick={(event) => {
            setKeyboard(event.detail === 0)
            setActive(selectedIndex)
            setOpen(!open)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Tab') {
              setOpen(false)
              if (event.key === 'Escape') event.preventDefault()
              return
            }
            if (open && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              choose(active, event)
              return
            }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
              return
            event.preventDefault()
            setOpen(true)
            setKeyboard(true)
            const index = available.indexOf(active)
            setActive(
              event.key === 'Home'
                ? available[0]
                : event.key === 'End'
                  ? available[available.length - 1]
                  : index < 0
                    ? available[
                        event.key === 'ArrowDown' ? 0 : available.length - 1
                      ]
                    : available[
                        (index +
                          (event.key === 'ArrowDown' ? 1 : -1) +
                          available.length) %
                          available.length
                      ],
            )
          }}
        >
          {renderValue && current !== undefined
            ? renderValue(current as Value)
            : (selected?.props.children ??
              (props.displayEmpty ? options[0]?.props.children : ''))}
        </button>
        <svg
          className={`apple-select__chevron ${open ? 'is-open' : ''}`}
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        {name && (
          <input
            type="hidden"
            name={name}
            value={String(current ?? '')}
            disabled={disabled}
          />
        )}
      </div>
      {position &&
        createPortal(
          <div
            ref={popupRef}
            className="apple-field apple-field-menu"
            aria-hidden={!open}
            inert={!open || disabled}
            data-scheme={theme.palette.mode}
            style={{
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
              opacity: 0,
              pointerEvents: open && !disabled ? undefined : 'none',
            }}
          >
            <ul
              ref={listRef}
              id={`${controlId}-list`}
              className="apple-option-list"
              role="listbox"
              aria-label={
                typeof label === 'string'
                  ? label
                  : (props['aria-label'] ?? '选项')
              }
              style={{ maxHeight: position.maxHeight - 2 }}
            >
              {options.map((option, index) => (
                <li
                  id={`${controlId}-option-${index}`}
                  key={String(option.props.value)}
                  role="option"
                  className="apple-option"
                  aria-selected={index === selectedIndex}
                  aria-disabled={option.props.disabled}
                  data-option-index={index}
                  data-keyboard-active={keyboard && index === active}
                  onPointerMove={() => setKeyboard(false)}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => choose(index, event)}
                >
                  <span>{option.props.children}</span>
                  {index === selectedIndex && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </AppleLayout>
  )
}
