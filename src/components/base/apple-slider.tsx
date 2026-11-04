import { Box } from '@mui/material'
import { useLayoutEffect, useRef, useState } from 'react'
import { createApp, h, shallowReactive } from 'vue'

import { AppleSlider as OriginalSlider } from './apptify/slider.js'
import './apptify/slider.css'

interface Props {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  formatValue?: (value: number) => string
  disabled?: boolean
  'aria-label': string
}

export function AppleSlider(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<ReturnType<typeof shallowReactive<Props>> | null>(
    null,
  )
  const [initial] = useState(() => props)

  useLayoutEffect(() => {
    if (!hostRef.current) return
    const current = shallowReactive({ ...initial })
    stateRef.current = current
    const app = createApp({
      render: () =>
        h(OriginalSlider, {
          ...current,
          modelValue: current.value,
          showValue: false,
          'onUpdate:modelValue': (value: number) => current.onChange(value),
          value: undefined,
          onChange: undefined,
        }),
    })
    app.mount(hostRef.current)
    return () => {
      app.unmount()
      stateRef.current = null
    }
  }, [initial])

  useLayoutEffect(() => {
    if (stateRef.current) Object.assign(stateRef.current, props)
  })

  return (
    <Box
      ref={hostRef}
      className="apptify-slider"
      sx={(theme) => ({
        '& .apple-field': {
          '--apple-accent': theme.palette.primary.main,
          '--apple-surface-alt':
            theme.palette.mode === 'dark' ? '#2b2b2e' : '#f0f0f2',
          '--apple-text': theme.palette.text.primary,
          '--apple-secondary': theme.palette.text.secondary,
          '--apple-danger': theme.palette.error.main,
        },
      })}
    />
  )
}
