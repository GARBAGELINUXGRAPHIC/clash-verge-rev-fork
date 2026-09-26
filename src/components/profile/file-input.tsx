import { UploadFileRounded } from '@mui/icons-material'
import { Box, Button, Typography } from '@mui/material'
import { useLockFn } from 'ahooks'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onChange: (file: File, value: string) => void
}

export const FileInput = (props: Props) => {
  const { onChange } = props

  const { t } = useTranslation()
  // file input
  const inputRef = useRef<any>(undefined)
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')

  const onFileInput = useLockFn(async (e: any) => {
    const file = e.target.files?.[0] as File

    if (!file) return

    setFileName(file.name)
    setLoading(true)

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        resolve(null)
        onChange(file, event.target?.result as string)
      }
      reader.onerror = reject
      reader.readAsText(file)
    }).finally(() => setLoading(false))
  })

  return (
    <Box
      sx={{
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minWidth: 0,
        borderTop: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Button
        variant="outlined"
        size="small"
        startIcon={<UploadFileRounded />}
        sx={{ flex: 'none' }}
        onClick={() => inputRef.current?.click()}
      >
        {t('profiles.components.fileInput.chooseFile')}
      </Button>

      <input
        type="file"
        accept=".yaml,.yml"
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={onFileInput}
      />

      <Typography
        variant="body2"
        noWrap
        title={fileName}
        sx={{ minWidth: 0, color: 'text.secondary' }}
      >
        {loading ? t('shared.statuses.loading') : fileName}
      </Typography>
    </Box>
  )
}
