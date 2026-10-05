import { useTheme } from '@mui/material'
import { useLayoutEffect, useRef, useState } from 'react'
import { createApp, h, shallowReactive } from 'vue'

import {
  AppleDatePicker as OriginalDatePicker,
  appleKey,
  createApple,
  resolveMotion,
  themeStyle,
} from './apptify/date-picker.js'
import './apptify/date-picker.css'
import './apple-date-picker.css'

type Props = {
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
  required?: boolean
  min?: string
  max?: string
  type?: 'date' | 'month' | 'datetime-local' | 'time'
}

// Vue owns the complete original component. React only synchronizes its props
// and lifecycle; no calendar, wheel, validation or popup logic is reimplemented.
export function AppleDatePicker(props: Props) {
  const theme = useTheme()
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<ReturnType<typeof shallowReactive<Props>> | null>(
    null,
  )
  const contextRef = useRef<ReturnType<typeof createApple> | null>(null)

  const [initial] = useState(() => ({ props, scheme: theme.palette.mode }))

  useLayoutEffect(() => {
    if (!hostRef.current) return
    const apple = createApple({ theme: initial.scheme, persist: false })
    const current = shallowReactive({ ...initial.props })
    stateRef.current = current
    contextRef.current = apple
    const app = createApp({
      render: () =>
        h(
          'div',
          {
            class: 'apple-provider',
            style: {
              ...themeStyle(apple),
              colorScheme: apple.theme.value.current.scheme,
            },
            'data-apple-theme': apple.theme.value.resolved,
            'data-apple-motion': resolveMotion(
              'inherit',
              apple.motion.value.mode,
              apple.motion.value.reduced,
            ),
            'data-apple-ripple-enabled': String(apple.ripple.value.enabled),
          },
          [
            h(OriginalDatePicker, {
              ...current,
              modelValue: current.value,
              'onUpdate:modelValue': (value: string) => current.onChange(value),
              // The canonical value belongs to modelValue, never a native value
              // attribute forwarded by Vue to each segmented input.
              value: undefined,
              onChange: undefined,
            }),
          ],
        ),
    })
    app.provide(appleKey, apple)
    apple.attach()
    app.mount(hostRef.current)
    return () => {
      app.unmount()
      apple.dispose()
      stateRef.current = null
      contextRef.current = null
    }
  }, [initial])

  useLayoutEffect(() => {
    if (stateRef.current) Object.assign(stateRef.current, props)
    contextRef.current?.theme.value.set(theme.palette.mode)
  })

  return <div ref={hostRef} className="apptify-date-picker" />
}
