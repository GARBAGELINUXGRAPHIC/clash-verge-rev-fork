import { SystemUpdateAltRounded } from '@mui/icons-material'
import { IconButton, Tooltip } from '@mui/material'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { DialogRef } from '@/components/base'
import { useUpdate } from '@/hooks/use-update'

import { UpdateViewer } from '../setting/mods/update-viewer'

interface Props {
  className?: string
}

export const UpdateButton = (props: Props) => {
  const { className } = props
  const { t } = useTranslation()
  const viewerRef = useRef<DialogRef>(null)

  const { updateInfo } = useUpdate()

  if (!updateInfo?.available) return null

  return (
    <>
      <UpdateViewer ref={viewerRef} />

      <Tooltip title={t('shared.feedback.notifications.updateAvailable')}>
        <IconButton
          color="primary"
          size="small"
          className={className}
          aria-label={t('shared.feedback.notifications.updateAvailable')}
          onClick={() => viewerRef.current?.open()}
        >
          <SystemUpdateAltRounded />
        </IconButton>
      </Tooltip>
    </>
  )
}
