import { useTheme } from '@emotion/react'
import styled from '@emotion/styled'
import type { ButtonProps, Theme } from '@mui/material'
import { forwardRef, type PointerEvent } from 'react'

import { appleSx } from './apple-style'
import './apple-controls.css'

const ButtonElement = styled('button', {
  shouldForwardProp: (key) => key !== 'sx' && key !== 'as',
})<{ sx?: ButtonProps['sx']; href?: string }>(({ sx, theme }) =>
  appleSx(sx, theme as Theme),
)

export type AppleButtonProps = Omit<ButtonProps, 'variant' | 'type'> & {
  variant?:
    | ButtonProps['variant']
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'danger'
  type?: 'button' | 'submit' | 'reset'
  iconOnly?: boolean
  label?: string
  ripple?: boolean
}

// Preserve the existing call-site props; rendering and states use native HTML.
export const AppleButton = forwardRef<HTMLButtonElement, AppleButtonProps>(
  function AppleButton(
    {
      variant = 'primary',
      size = 'medium',
      color = 'primary',
      children,
      startIcon,
      endIcon,
      loading,
      loadingIndicator,
      loadingPosition = 'start',
      disabled,
      fullWidth,
      iconOnly,
      label,
      ripple = true,
      disableRipple,
      disableFocusRipple: _disableFocusRipple,
      disableElevation: _disableElevation,
      focusVisibleClassName: _focusVisibleClassName,
      onFocusVisible: _onFocusVisible,
      action: _action,
      TouchRippleProps: _touchRippleProps,
      touchRippleRef: _touchRippleRef,
      centerRipple: _centerRipple,
      classes: _classes,
      className,
      sx,
      type = 'button',
      href,
      component,
      onPointerDown,
      ...props
    },
    ref,
  ) {
    const theme = useTheme() as Theme
    const appearance =
      variant === 'contained'
        ? 'primary'
        : variant === 'outlined'
          ? 'outline'
          : variant === 'text'
            ? 'ghost'
            : variant
    const palette =
      color === 'inherit' ? undefined : theme.palette[color as 'primary']
    const accent =
      appearance === 'danger'
        ? theme.palette.error.main
        : (palette?.main ?? theme.palette.primary.main)
    const blocked = disabled || !!loading
    const showRipple = (event: PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(event)
      if (
        event.defaultPrevented ||
        blocked ||
        !ripple ||
        disableRipple ||
        (appearance === 'ghost' && !iconOnly) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
        return
      const button = event.currentTarget
      const rect = button.getBoundingClientRect()
      const diameter = Math.hypot(rect.width, rect.height) * 2
      const wave = document.createElement('span')
      wave.className = 'apple-button__ripple'
      wave.style.cssText = `width:${diameter}px;height:${diameter}px;left:${event.clientX - rect.left - diameter / 2}px;top:${event.clientY - rect.top - diameter / 2}px`
      button.append(wave)
      const animation = wave.animate(
        [
          { transform: 'scale(0)', opacity: 0.1 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        { duration: 600, easing: 'ease-out' },
      )
      animation.onfinish = () => wave.remove()
      animation.oncancel = () => wave.remove()
    }
    const spinner =
      loading &&
      (loadingIndicator ?? (
        <span className="apple-button__spinner" aria-hidden="true" />
      ))
    return (
      <ButtonElement
        {...props}
        ref={ref}
        as={component ?? (href && !blocked ? 'a' : 'button')}
        href={blocked ? undefined : href}
        type={href && !blocked ? undefined : type}
        disabled={blocked}
        aria-disabled={blocked || undefined}
        aria-busy={loading || undefined}
        aria-label={label ?? props['aria-label']}
        data-scheme={theme.palette.mode}
        className={`apple-button apple-button--${appearance} apple-button--${size}${iconOnly ? ' apple-button--icon' : ''}${className ? ` ${className}` : ''}`}
        sx={[
          {
            '--apple-accent': accent,
            '--apple-accent-text':
              palette?.contrastText ?? theme.palette.primary.contrastText,
            '--apple-text': theme.palette.text.primary,
            ...(color === 'inherit' ? { color: 'inherit' } : {}),
            ...(fullWidth ? { width: '100%' } : {}),
          },
          ...(Array.isArray(sx) ? sx : [sx ?? {}]),
        ]}
        onPointerDown={showRipple}
      >
        <span className="apple-button__content">
          {loadingPosition !== 'end' && (spinner || startIcon)}
          {children}
          {loadingPosition === 'end' ? spinner || endIcon : endIcon}
        </span>
      </ButtonElement>
    )
  },
)

export const AppleIconButton = forwardRef<
  HTMLButtonElement,
  import('@mui/material').IconButtonProps
>(function AppleIconButton(
  { color = 'default', className, edge: _edge, type, ...props },
  ref,
) {
  return (
    <AppleButton
      {...props}
      ref={ref}
      iconOnly
      type={type === 'submit' || type === 'reset' ? type : 'button'}
      variant="ghost"
      color={color === 'default' ? 'inherit' : color}
      className={`apple-icon-button ${className ?? ''}`}
    />
  )
})
