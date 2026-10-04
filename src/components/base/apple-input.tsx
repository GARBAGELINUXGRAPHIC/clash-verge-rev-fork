import { useTheme } from '@emotion/react'
import type { TextFieldProps, Theme } from '@mui/material'
import {
  forwardRef,
  useId,
  type Ref,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

import { AppleSelect } from './apple-select'
import { AppleLayout, AppleControl } from './apple-style'
import './apple-controls.css'

const setRef = <T,>(ref: Ref<T> | undefined, value: T | null) => {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}
// The old prop shape is retained at call sites; no MUI field is rendered.
export const AppleInput = forwardRef<
  HTMLDivElement,
  TextFieldProps & { InputProps?: any; inputProps?: any; SelectProps?: any }
>(function AppleInput(
  {
    label,
    hiddenLabel,
    helperText,
    error,
    fullWidth,
    multiline,
    rows,
    minRows,
    maxRows,
    inputRef,
    slotProps,
    InputProps,
    inputProps,
    id,
    sx,
    className,
    select,
    children,
    SelectProps,
    variant: _variant,
    size: _size,
    color: _color,
    ...props
  },
  ref,
) {
  const theme = useTheme() as Theme
  const generatedId = useId()
  const controlId = id ?? generatedId
  const messageId = `${controlId}-message`
  const labelId = `${controlId}-label`
  const slot = (value: any) =>
    typeof value === 'function' ? value(props) : (value ?? {})
  const wrapper = { ...InputProps, ...slot(slotProps?.input) }
  const native = { ...inputProps, ...slot(slotProps?.htmlInput) }
  const {
    sx: wrapperSx,
    startAdornment,
    endAdornment,
    ref: wrapperRef,
    ...wrapperProps
  } = wrapper
  const { sx: nativeSx, ref: nativeRef, ...nativeProps } = native
  const common = {
    ...nativeProps,
    id: controlId,
    name: props.name,
    value: props.value ?? native.value,
    defaultValue: props.defaultValue ?? native.defaultValue,
    disabled: props.disabled ?? native.disabled,
    required: props.required,
    readOnly: wrapper.readOnly ?? native.readOnly,
    autoFocus: props.autoFocus,
    autoComplete: props.autoComplete ?? native.autoComplete,
    placeholder: props.placeholder ?? native.placeholder,
    onChange: props.onChange ?? native.onChange,
    onBlur: props.onBlur ?? native.onBlur,
    onFocus: props.onFocus ?? native.onFocus,
    'aria-labelledby':
      label && !hiddenLabel ? labelId : native['aria-labelledby'],
    'aria-invalid': error || undefined,
    'aria-describedby': helperText ? messageId : native['aria-describedby'],
    className: `apple-control ${native.className ?? ''}`,
    ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      setRef(inputRef, element)
      setRef(nativeRef, element)
    },
  }
  if (select)
    return (
      <AppleSelect
        {...SelectProps}
        {...(props as any)}
        id={controlId}
        label={hiddenLabel ? undefined : label}
        error={error}
        fullWidth={fullWidth}
        sx={sx}
        className={className}
      >
        {children}
      </AppleSelect>
    )
  return (
    <AppleLayout
      ref={ref}
      className={`apple-field ${className ?? ''}`}
      data-error={error}
      data-scheme={theme.palette.mode}
      sx={sx}
      style={{ width: fullWidth ? '100%' : undefined }}
      onClick={props.onClick}
      onKeyDown={props.onKeyDown}
      onKeyUp={props.onKeyUp}
    >
      {label && !hiddenLabel && (
        <span className="apple-field__label" id={labelId}>
          {label}
          {props.required ? ' *' : ''}
        </span>
      )}
      <AppleLayout
        className="apple-input-wrap"
        data-disabled={props.disabled}
        ref={wrapperRef}
        sx={wrapperSx}
        onClick={wrapperProps.onClick}
        onMouseDown={wrapperProps.onMouseDown}
        onMouseUp={wrapperProps.onMouseUp}
      >
        {startAdornment && (
          <span className="apple-affix">{startAdornment}</span>
        )}
        <AppleControl
          as={multiline ? 'textarea' : 'input'}
          {...(common as InputHTMLAttributes<HTMLInputElement> &
            TextareaHTMLAttributes<HTMLTextAreaElement>)}
          type={multiline ? undefined : props.type}
          rows={multiline ? (rows ?? minRows ?? 2) : undefined}
          sx={nativeSx}
          style={
            multiline
              ? {
                  resize: 'vertical',
                  maxHeight: maxRows
                    ? `${Number(maxRows) * 24 + 22}px`
                    : undefined,
                }
              : undefined
          }
          spellCheck={props.spellCheck ?? native.spellCheck}
        />
        {endAdornment && <span className="apple-affix">{endAdornment}</span>}
      </AppleLayout>
      {helperText && (
        <p id={messageId} className="apple-field__message">
          {helperText}
        </p>
      )}
    </AppleLayout>
  )
})
