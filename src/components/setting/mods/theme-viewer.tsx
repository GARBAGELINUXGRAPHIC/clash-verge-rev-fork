import { EditRounded } from '@mui/icons-material'
import { Box, ListItem, ListItemText, styled, useTheme } from '@mui/material'
import { useLockFn } from 'ahooks'
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, DialogRef } from '@/components/base'
import { AppleButton as Button } from '@/components/base/apple-button'
import { AppleInput } from '@/components/base/apple-input'
import { EditorViewer } from '@/components/profile/editor-viewer'
import { useVerge } from '@/hooks/use-verge'
import { defaultDarkTheme, defaultTheme } from '@/pages/_theme'
import { showNotice } from '@/services/notice-service'

import { SettingForm } from './setting-comp'

export function ThemeViewer(props: { ref?: React.Ref<DialogRef> }) {
  const { ref } = props
  const { t } = useTranslation()

  const [open, setOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [cssEditorValue, setCssEditorValue] = useState('')
  const [cssEditorSavedValue, setCssEditorSavedValue] = useState('')
  const { verge, patchVerge } = useVerge()
  const { theme_setting } = verge ?? {}
  const [theme, setTheme] = useState(theme_setting || {})
  // Latest theme ref to avoid stale closures when saving CSS
  const themeRef = useRef(theme)
  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true)
      setTheme({ ...theme_setting })
    },
    close: () => setOpen(false),
  }))

  const textProps = {
    size: 'small',
    autoComplete: 'off',
    sx: { width: 148 },
  } as const

  const handleChange = (field: keyof typeof theme) => (e: any) => {
    setTheme((t) => ({ ...t, [field]: e.target.value }))
  }

  const onSave = useLockFn(async () => {
    try {
      await patchVerge({ theme_setting: theme })
      setOpen(false)
    } catch (err) {
      showNotice.error(err)
    }
  })

  const { palette } = useTheme()

  const dt = palette.mode === 'light' ? defaultTheme : defaultDarkTheme

  type ThemeKey = keyof typeof theme & keyof typeof defaultTheme

  const fieldDefinitions: Array<{ labelKey: string; key: ThemeKey }> = useMemo(
    () => [
      {
        labelKey: 'settings.components.verge.theme.fields.primaryColor',
        key: 'primary_color',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.secondaryColor',
        key: 'secondary_color',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.primaryText',
        key: 'primary_text',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.secondaryText',
        key: 'secondary_text',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.infoColor',
        key: 'info_color',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.warningColor',
        key: 'warning_color',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.errorColor',
        key: 'error_color',
      },
      {
        labelKey: 'settings.components.verge.theme.fields.successColor',
        key: 'success_color',
      },
    ],
    [],
  )

  const openCssEditor = () => {
    const nextCss = themeRef.current?.css_injection ?? ''
    setCssEditorValue(nextCss)
    setCssEditorSavedValue(nextCss)
    setEditorOpen(true)
  }

  const handleSaveCss = useLockFn(async () => {
    const prevTheme = themeRef.current || {}
    setTheme({ ...prevTheme, css_injection: cssEditorValue })
    setCssEditorSavedValue(cssEditorValue)
  })

  const renderItem = (labelKey: string, key: ThemeKey) => {
    const label = t(labelKey)
    return (
      <Item key={key}>
        <ListItemText primary={label} />
        <Box
          component="label"
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: theme[key] || dt[key],
            flexShrink: 0,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <input
            type="color"
            aria-label={label}
            value={
              /^#[\da-f]{6}$/i.test(theme[key] || '') ? theme[key] : dt[key]
            }
            onChange={handleChange(key)}
            style={{
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
            }}
          />
        </Box>
        <AppleInput
          {...textProps}
          value={theme[key] ?? ''}
          placeholder={dt[key]}
          slotProps={{ htmlInput: { 'aria-label': label } }}
          onChange={handleChange(key)}
          onKeyDown={(e) => e.key === 'Enter' && onSave()}
        />
      </Item>
    )
  }

  return (
    <BaseDialog
      open={open}
      title={t('settings.components.verge.theme.title')}
      okBtn={t('shared.actions.save')}
      cancelBtn={t('shared.actions.cancel')}
      contentSx={{ width: 480, maxWidth: '100%', overflow: 'auto' }}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <SettingForm
        sx={{
          '& > .MuiListItem-root:has(input[type="color"])': {
            flexWrap: 'nowrap',
            '& > .MuiListItemText-root': { flexBasis: 'auto' },
            '& > .apple-field': { width: 132, flexShrink: 0 },
          },
        }}
      >
        {fieldDefinitions.map((field) => renderItem(field.labelKey, field.key))}

        <Item>
          <ListItemText
            primary={t('settings.components.verge.theme.fields.fontFamily')}
          />
          <AppleInput
            {...textProps}
            value={theme.font_family ?? ''}
            onChange={handleChange('font_family')}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
          />
        </Item>
        <Item>
          <ListItemText
            primary={t('settings.components.verge.theme.fields.cssInjection')}
          />
          <Button
            startIcon={<EditRounded />}
            variant="outlined"
            onClick={openCssEditor}
          >
            {t('settings.components.verge.theme.actions.editCss')}
          </Button>
          {editorOpen && (
            <EditorViewer
              open={true}
              title={t('settings.components.verge.theme.dialogs.editCssTitle')}
              value={cssEditorValue}
              language="css"
              path="theme-css.css"
              dirty={cssEditorValue !== cssEditorSavedValue}
              onChange={setCssEditorValue}
              onSave={handleSaveCss}
              onClose={() => {
                setEditorOpen(false)
              }}
            />
          )}
        </Item>
      </SettingForm>
    </BaseDialog>
  )
}

const Item = styled(ListItem)(() => ({
  padding: '5px 2px',
}))
