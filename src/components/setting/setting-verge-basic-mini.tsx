import { MenuItem, Select } from '@mui/material'
import { useTranslation } from 'react-i18next'

import { useVerge } from '@/hooks/use-verge'
import { navigationItems } from '@/pages/_navigation-meta'

import { GuardState } from './mods/guard-state'
import { SettingItem, SettingList } from './mods/setting-comp'

interface Props {
  onError: (err: Error) => void
}

const SettingVergeBasicMini = ({ onError }: Props) => {
  const { t } = useTranslation()
  const { verge, patchVerge, mutateVerge } = useVerge()
  const { start_page: startPage } = verge ?? {}

  const onChangeData = (start_page: string) => {
    mutateVerge({ ...verge, start_page }, false)
  }

  return (
    <SettingList title={t('settings.components.verge.basic.title')}>
      <SettingItem
        label={t('settings.components.verge.basic.fields.startPage')}
      >
        <GuardState
          value={startPage ?? '/'}
          onCatch={onError}
          onFormat={(event: React.ChangeEvent<HTMLInputElement>) =>
            event.target.value
          }
          onChange={onChangeData}
          onGuard={(start_page) => patchVerge({ start_page })}
        >
          <Select size="small" sx={{ width: 140, '> div': { py: '7.5px' } }}>
            {Object.values(navigationItems).map((page) => (
              <MenuItem key={page.path} value={page.path}>
                {t(page.label)}
              </MenuItem>
            ))}
          </Select>
        </GuardState>
      </SettingItem>
    </SettingList>
  )
}

export default SettingVergeBasicMini
