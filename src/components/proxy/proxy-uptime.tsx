import { alpha, Box } from '@mui/material'

import {
  latencyUptimeNodeKey,
  useLatencyUptimeData,
} from '@/providers/app-data-context'
import { providerNameOf, type ResolvedProxyMember } from '@/types/proxy-view'

interface Props {
  member: ResolvedProxyMember
}

export const ProxyUptime = ({ member }: Props) => {
  const { enabled, nodesByKey, nodesByName } = useLatencyUptimeData()
  if (!enabled || member.kind !== 'node') return null

  const providerName = providerNameOf(member.node)
  const proxyName = member.node.source.proxyName

  const node =
    nodesByKey.get(latencyUptimeNodeKey(proxyName, providerName)) ??
    (!providerName ? nodesByName.get(proxyName) : undefined)
  const uptime = node?.uptime
  if (!node || uptime == null || node.samples < 1) return null

  const percentage = `${(uptime * 100).toFixed(2)}%`

  return (
    <Box
      component="span"
      title={`Uptime ${percentage} (${node.samples})`}
      sx={({ palette }) => {
        const color =
          uptime >= 0.99
            ? palette.success.main
            : uptime >= 0.95
              ? palette.warning.main
              : palette.error.main

        return {
          display: 'inline-flex',
          alignItems: 'center',
          flexShrink: 0,
          marginRight: '4px',
          padding: '0 4px',
          border: '1px solid',
          borderColor: alpha(color, 0.55),
          borderRadius: '4px',
          color,
          fontSize: 10,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }
      }}
    >
      Uptime: {percentage}
    </Box>
  )
}
