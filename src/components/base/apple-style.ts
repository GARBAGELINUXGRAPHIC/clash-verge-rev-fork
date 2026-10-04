import type { CSSObject } from '@emotion/react'
import styled from '@emotion/styled'
import type { SxProps, Theme } from '@mui/material'
import {
  Fragment,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from 'react'

// Layout compatibility only; the controls themselves use native HTML and Apptify CSS.
export const appleSx = (
  sx: SxProps<Theme> | undefined,
  theme: Theme,
): CSSObject => {
  if (!sx) return {}
  if (typeof sx === 'function') return appleSx(sx(theme), theme)
  if (Array.isArray(sx))
    return Object.assign({}, ...sx.map((item) => appleSx(item, theme)))
  const result: Record<string, unknown> = {}
  const spacing: Record<string, string[]> = {
    p: ['padding'],
    px: ['paddingLeft', 'paddingRight'],
    py: ['paddingTop', 'paddingBottom'],
    pt: ['paddingTop'],
    pb: ['paddingBottom'],
    pl: ['paddingLeft'],
    pr: ['paddingRight'],
    m: ['margin'],
    mx: ['marginLeft', 'marginRight'],
    my: ['marginTop', 'marginBottom'],
    mt: ['marginTop'],
    mb: ['marginBottom'],
    ml: ['marginLeft'],
    mr: ['marginRight'],
  }
  for (const [rawKey, rawValue] of Object.entries(sx)) {
    const key = rawKey
      .replaceAll('.MuiInputBase-root', '.apple-input-wrap')
      .replaceAll('.MuiOutlinedInput-root', '.apple-input-wrap')
      .replaceAll('.MuiInputBase-input', '.apple-control')
      .replaceAll('.MuiToggleButton-root', '.apple-segmented__item')
    const value = typeof rawValue === 'function' ? rawValue(theme) : rawValue
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.keys(value).some((k) => k in theme.breakpoints.values)) {
        for (const [bp, entry] of Object.entries(value)) {
          const media = theme.breakpoints.up(bp as 'xs')
          result[media] = {
            ...(result[media] as object),
            ...appleSx({ [key]: entry }, theme),
          }
        }
      } else result[key] = appleSx(value as SxProps<Theme>, theme)
      continue
    }
    const keys = spacing[key] ?? [key === 'bgcolor' ? 'backgroundColor' : key]
    for (const cssKey of keys) {
      let cssValue = value
      if (
        typeof value === 'number' &&
        (spacing[key] || /^(gap|rowGap|columnGap|margin|padding)/.test(cssKey))
      )
        cssValue = theme.spacing(value)
      if (typeof value === 'string' && /color/i.test(cssKey)) {
        const [section, token] = value.split('.')
        if (token)
          cssValue =
            (
              theme.palette as unknown as Record<string, Record<string, string>>
            )[section]?.[token] ?? value
      }
      result[cssKey] = cssValue
    }
  }
  return result as CSSObject
}

export const AppleLayout = styled('div', {
  shouldForwardProp: (key) => key !== 'sx' && key !== 'as',
})<{ sx?: SxProps<Theme> }>(({ sx, theme }) => appleSx(sx, theme as Theme))

export const AppleControl = styled('input', {
  shouldForwardProp: (key) => key !== 'sx' && key !== 'as',
})<{ sx?: SxProps<Theme>; rows?: string | number }>(({ sx, theme }) =>
  appleSx(sx, theme as Theme),
)

export function appleDeclarations<T>(children: ReactNode): ReactElement<T>[] {
  if (Array.isArray(children))
    return children.flatMap((child) => appleDeclarations<T>(child))
  if (!isValidElement<T>(children)) return []
  if (children.type === Fragment)
    return appleDeclarations<T>(
      (children.props as { children?: ReactNode }).children,
    )
  return [children]
}
export const appleFieldSurface = (theme: Theme) => ({
  borderRadius: 8,
  backgroundColor: theme.palette.background.paper,
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
})
