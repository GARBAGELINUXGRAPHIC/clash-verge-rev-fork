import {
  CheckRounded,
  CloseRounded,
  DeleteRounded,
  EditRounded,
  OpenInNewRounded,
} from '@mui/icons-material'
import { Divider, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppleIconButton as IconButton } from '@/components/base/apple-button'
import { AppleInput } from '@/components/base/apple-input'

interface Props {
  value?: string
  onlyEdit?: boolean
  onChange: (value?: string) => void
  onOpenUrl?: (value?: string) => void
  onDelete?: () => void
  onCancel?: () => void
}

export const WebUIItem = (props: Props) => {
  const {
    value,
    onlyEdit = false,
    onChange,
    onDelete,
    onOpenUrl,
    onCancel,
  } = props

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const { t } = useTranslation()

  const highlightedParts = useMemo(() => {
    const placeholderRegex = /(%host|%port|%secret)/g
    if (!value) {
      return ['NULL']
    }
    return value.split(placeholderRegex).filter((part) => part !== '')
  }, [value])

  if (editing || onlyEdit) {
    return (
      <>
        <Stack
          spacing={0.75}
          direction="row"
          sx={{ py: 1.5, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
        >
          <AppleInput
            autoComplete="new-password"
            fullWidth
            size="small"
            sx={{ flex: '1 1 180px', minWidth: 0 }}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={t(
              'settings.modals.webUI.messages.supportedPlaceholders',
            )}
          />
          <IconButton
            size="small"
            title={t('shared.actions.save')}
            aria-label={t('shared.actions.save')}
            color="inherit"
            onClick={() => {
              onChange(editValue)
              setEditing(false)
            }}
          >
            <CheckRounded fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            title={t('shared.actions.cancel')}
            aria-label={t('shared.actions.cancel')}
            color="inherit"
            onClick={() => {
              onCancel?.()
              setEditing(false)
            }}
          >
            <CloseRounded fontSize="inherit" />
          </IconButton>
        </Stack>
        <Divider />
      </>
    )
  }

  const renderedParts = highlightedParts.map((part, index) => {
    const isPlaceholder =
      part === '%host' || part === '%port' || part === '%secret'
    const repeatIndex = highlightedParts
      .slice(0, index)
      .filter((prev) => prev === part).length
    const key = `${part || 'empty'}-${repeatIndex}`

    return (
      <span key={key} className={isPlaceholder ? 'placeholder' : undefined}>
        {part}
      </span>
    )
  })

  return (
    <>
      <Stack
        spacing={0.75}
        direction="row"
        sx={{ alignItems: 'center', py: 1.5 }}
      >
        <Typography
          component="div"
          title={value}
          color={value ? 'text.primary' : 'text.secondary'}
          sx={({ palette }) => ({
            width: '100%',
            minWidth: 0,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            '> .placeholder': {
              color: palette.primary.main,
            },
          })}
        >
          {renderedParts}
        </Typography>
        <IconButton
          size="small"
          title={t('settings.modals.webUI.actions.openUrl')}
          aria-label={t('settings.modals.webUI.actions.openUrl')}
          color="inherit"
          onClick={() => onOpenUrl?.(value)}
        >
          <OpenInNewRounded fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          title={t('shared.actions.edit')}
          aria-label={t('shared.actions.edit')}
          color="inherit"
          onClick={() => {
            setEditing(true)
            setEditValue(value)
          }}
        >
          <EditRounded fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          title={t('shared.actions.delete')}
          aria-label={t('shared.actions.delete')}
          color="inherit"
          onClick={onDelete}
        >
          <DeleteRounded fontSize="inherit" />
        </IconButton>
      </Stack>
      <Divider />
    </>
  )
}
