import { alpha, Box } from '@mui/material'

import {
  latencyUptimeNodeKey,
  useLatencyUptimeData,
} from '@/providers/app-data-context'

interface Props {
  proxy: IProxyItem
}

export const ProxyUptime = ({ proxy }: Props) => {
  const { enabled, nodesByKey, nodesByName } = useLatencyUptimeData()
  if (!enabled) return null

  const node =
    nodesByKey.get(latencyUptimeNodeKey(proxy.name, proxy.provider)) ??
    (!proxy.provider ? nodesByName.get(proxy.name) : undefined)
  if (!node || node.samples < 1) return null

  const percentage = `${(node.uptime * 100).toFixed(2)}%`

  return (
    <Box
      component="span"
      title={`Uptime ${percentage} (${node.samples})`}
      sx={({ palette }) => {
        const color =
          node.uptime >= 0.99
            ? palette.success.main
            : node.uptime >= 0.95
              ? palette.warning.main
              : palette.error.main

        return {
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          height: 16,
          marginRight: '4px',
          padding: '0 4px',
          border: '1px solid',
          borderColor: alpha(color, 0.55),
          borderRadius: '6px',
          backgroundColor: alpha(color, 0.12),
          color,
          fontSize: 10,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }
      }}
    >
      {percentage}
    </Box>
  )
}
