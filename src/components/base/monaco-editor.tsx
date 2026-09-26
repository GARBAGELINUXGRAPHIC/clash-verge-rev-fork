import { Box, CircularProgress } from '@mui/material'
import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'

import { loadMonacoEditor } from '@/services/monaco'

type MonacoEditorProps = import('@monaco-editor/react').EditorProps

let monacoEditorBundle: Awaited<ReturnType<typeof loadMonacoEditor>>

const MonacoEditorView = ({ beforeMount, ...props }: MonacoEditorProps) => {
  const { Editor, beforeEditorMount } = monacoEditorBundle

  return (
    <Editor
      {...props}
      theme={
        props.theme === 'light'
          ? 'verge-light'
          : props.theme === 'vs-dark'
            ? 'verge-dark'
            : props.theme
      }
      options={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: 13,
        lineHeight: 20,
        padding: { top: 12, bottom: 12 },
        ...props.options,
      }}
      beforeMount={(monaco) => {
        beforeEditorMount()
        beforeMount?.(monaco)
      }}
    />
  )
}

const MonacoEditorContent = lazy(async () => {
  monacoEditorBundle = await loadMonacoEditor()
  return { default: MonacoEditorView }
})

export const MonacoEditor = (props: MonacoEditorProps) => {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 160,
            bgcolor: 'background.paper',
          }}
        >
          <CircularProgress
            size={22}
            aria-label={t('shared.statuses.loading')}
          />
        </Box>
      }
    >
      <MonacoEditorContent {...props} />
    </Suspense>
  )
}
