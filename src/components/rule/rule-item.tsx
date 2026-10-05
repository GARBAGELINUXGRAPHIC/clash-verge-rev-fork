import { styled, Box, Typography } from '@mui/material'
import { Rule } from 'tauri-plugin-mihomo-api'

import { ListRow } from '@/components/base/list-row'

const Item = styled(ListRow)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '40px minmax(0, 1fr)',
  alignItems: 'center',
  minHeight: 44,
  padding: '8px 20px',
  boxSizing: 'border-box',
  gap: 16,
  color: theme.palette.text.primary,
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

interface Props {
  value: Rule & { lineNo: number }
}

const parseColor = (text: string) => {
  if (text === 'REJECT' || text === 'REJECT-DROP') return 'error.main'
  if (text === 'DIRECT') return 'text.primary'

  return 'primary.main'
}

const RuleItem = (props: Props) => {
  const { value } = props

  return (
    <Item>
      <Typography
        color="text.secondary"
        variant="body2"
        sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}
      >
        {value.lineNo}
      </Typography>

      <Box
        sx={{
          userSelect: 'text',
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) auto',
            md: 'minmax(0, 1fr) 150px 160px',
          },
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Typography
          variant="body1"
          color="text.primary"
          title={value.payload || '-'}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            gridColumn: { xs: '1 / -1', md: 'auto' },
          }}
        >
          {value.payload || '-'}
        </Typography>

        <Typography component="span" variant="body2" color="text.secondary">
          {typeof value.type === 'string' ? value.type : value.type.Unknown}
        </Typography>

        <Typography
          component="span"
          variant="body2"
          color={parseColor(value.proxy)}
          title={value.proxy}
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value.proxy}
        </Typography>
      </Box>
    </Item>
  )
}

export default RuleItem
