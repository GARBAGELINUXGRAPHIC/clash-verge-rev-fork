import { AddRounded, CodeRounded, ViewModuleRounded } from '@mui/icons-material'
import { Box, Chip, FormHelperText, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import { AppleInput } from '@/components/base/apple-input'
import {
  AppleSegment,
  AppleSegmentedControl,
} from '@/components/base/apple-segmented-control'

type BaseSplitChipEditorMode = 'visual' | 'advanced'

interface BaseSplitChipEditorProps {
  value?: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
  helperText?: ReactNode
  placeholder?: string
  rows?: number
  separator?: string
  splitPattern?: RegExp
  defaultMode?: BaseSplitChipEditorMode
  showModeToggle?: boolean
  ariaLabel?: string
  addLabel?: ReactNode
  emptyLabel?: ReactNode
  modeLabels?: Partial<Record<BaseSplitChipEditorMode, ReactNode>>
  renderHeader?: (modeToggle: ReactNode) => ReactNode
}

const DEFAULT_SPLIT_PATTERN = /[,\n;\r]+/

const splitValue = (value: string, splitPattern: RegExp) =>
  value
    .split(splitPattern)
    .map((item) => item.trim())
    .filter(Boolean)

export const BaseSplitChipEditor = ({
  value = '',
  onChange,
  disabled = false,
  error = false,
  helperText,
  placeholder,
  rows = 4,
  separator = ',',
  splitPattern = DEFAULT_SPLIT_PATTERN,
  defaultMode = 'visual',
  showModeToggle = true,
  ariaLabel,
  addLabel,
  emptyLabel,
  modeLabels,
  renderHeader,
}: BaseSplitChipEditorProps) => {
  const { t } = useTranslation()
  const [mode, setMode] = useState<BaseSplitChipEditorMode>(defaultMode)
  const [draft, setDraft] = useState('')

  const resolvedLabels = useMemo(
    () => ({
      visual: modeLabels?.visual ?? t('shared.editorModes.visualization'),
      advanced: modeLabels?.advanced ?? t('shared.editorModes.advanced'),
      add: addLabel ?? t('shared.actions.new'),
      empty: emptyLabel ?? t('shared.statuses.empty'),
    }),
    [t, modeLabels, addLabel, emptyLabel],
  )

  const values = useMemo(
    () => splitValue(value, splitPattern),
    [value, splitPattern],
  )

  const items = useMemo(() => {
    const counts = new Map<string, number>()
    return values.map((item) => {
      const nextCount = (counts.get(item) ?? 0) + 1
      counts.set(item, nextCount)
      return {
        key: `${item}-${nextCount}`,
        value: item,
      }
    })
  }, [values])

  const handleAddDraft = () => {
    const nextValues = splitValue(draft, splitPattern)
    if (!nextValues.length) {
      return
    }
    const nextValue = [...values, ...nextValues].join(separator)
    onChange(nextValue)
    setDraft('')
  }

  const handleRemoveItem = (index: number) => {
    const nextValue = values.filter((_, itemIndex) => itemIndex !== index)
    onChange(nextValue.join(separator))
  }

  const modeToggle = showModeToggle ? (
    <AppleSegmentedControl
      exclusive
      size="small"
      value={mode}
      aria-label={ariaLabel}
      onChange={(_, nextMode: BaseSplitChipEditorMode | null) => {
        if (nextMode) {
          setMode(nextMode)
          if (nextMode === 'visual') setDraft('')
        }
      }}
    >
      <AppleSegment
        value="visual"
        title={
          typeof resolvedLabels.visual === 'string'
            ? resolvedLabels.visual
            : undefined
        }
        aria-label={
          typeof resolvedLabels.visual === 'string'
            ? resolvedLabels.visual
            : undefined
        }
      >
        <ViewModuleRounded sx={{ fontSize: 18 }} />
      </AppleSegment>

      <AppleSegment
        value="advanced"
        title={
          typeof resolvedLabels.advanced === 'string'
            ? resolvedLabels.advanced
            : undefined
        }
        aria-label={
          typeof resolvedLabels.advanced === 'string'
            ? resolvedLabels.advanced
            : undefined
        }
      >
        <CodeRounded sx={{ fontSize: 18 }} />
      </AppleSegment>
    </AppleSegmentedControl>
  ) : null

  return (
    <>
      {renderHeader ? renderHeader(modeToggle) : modeToggle}
      {mode === 'visual' ? (
        <Box sx={{ padding: '0 2px 5px' }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              minHeight: 32,
            }}
          >
            {items.length ? (
              items.map((item, index) => (
                <Chip
                  key={item.key}
                  label={item.value}
                  title={item.value}
                  size="small"
                  sx={{ maxWidth: '100%' }}
                  onDelete={
                    disabled ? undefined : () => handleRemoveItem(index)
                  }
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                {resolvedLabels.empty}
              </Typography>
            )}
          </Box>
          <Box
            sx={{ display: 'flex', gap: 1, marginTop: 1, alignItems: 'center' }}
          >
            <AppleInput
              disabled={disabled}
              size="small"
              fullWidth
              value={draft}
              placeholder={placeholder}
              error={error}
              sx={{
                '& .apple-input-wrap': { minHeight: 32 },
                '& .apple-control': { padding: '4px 8px' },
              }}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddDraft()
                }
              }}
            />
            <Tooltip title={resolvedLabels.add}>
              <span>
                <IconButton
                  size="small"
                  onClick={handleAddDraft}
                  disabled={disabled || !draft.trim()}
                  aria-label={
                    typeof resolvedLabels.add === 'string'
                      ? resolvedLabels.add
                      : undefined
                  }
                  sx={{ width: 32, height: 32 }}
                >
                  <AddRounded />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          {helperText && (
            <FormHelperText error={error}>{helperText}</FormHelperText>
          )}
        </Box>
      ) : (
        <AppleInput
          error={error}
          disabled={disabled}
          size="small"
          multiline
          rows={rows}
          sx={{
            width: '100%',
            '& textarea': {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
            },
          }}
          value={value}
          helperText={helperText}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
    </>
  )
}
