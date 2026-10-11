import {
  getLatencyUptimeSnapshot,
  getPendingFailures,
  getRuntimeState,
  getSidecarFailure,
  type RunState,
} from '@/services/cmds'
import delayManager from '@/services/delay'

import type { AppStoreAction } from './app-state'

export const createStoreReads = (
  dispatch: (action: AppStoreAction) => void,
) => {
  let runRevision = 0
  let failureRevision = 0
  let latencyRevision = 0
  let current: RunState | null = null
  let latestRead: Promise<RunState> | null = null

  const acceptRunState = (runState: RunState) => {
    runRevision += 1
    latestRead = null
    current = runState
    dispatch({ type: 'runState/loaded', runState })
  }

  const applyLatencyUptime = (snapshot: ILatencyUptimeSnapshot) => {
    dispatch({ type: 'latencyUptime/loaded', snapshot })
    delayManager.applyLatencyUptimeSnapshot(snapshot.nodes)
  }
  const acceptLatencyUptime = (snapshot: ILatencyUptimeSnapshot) => {
    latencyRevision += 1
    applyLatencyUptime(snapshot)
  }
  const readLatencyUptime = () => {
    const revision = ++latencyRevision
    void getLatencyUptimeSnapshot()
      .then((snapshot) => {
        if (revision === latencyRevision) applyLatencyUptime(snapshot)
      })
      .catch((error) => {
        console.warn(
          '[app-store] Latency/Uptime snapshot could not be read:',
          error,
        )
      })
  }

  const readRunState = (): Promise<RunState> => {
    const revision = ++runRevision
    const read: Promise<RunState> = getRuntimeState().then((runState) => {
      if (revision === runRevision) {
        current = runState
        dispatch({ type: 'runState/loaded', runState })
      }
      if (latestRead && latestRead !== read) return latestRead
      return current ?? runState
    })
    latestRead = read
    return read
  }

  const readPendingFailures = () => {
    const revision = ++failureRevision
    getSidecarFailure()
      .then((snapshot) => {
        if (revision === failureRevision) {
          dispatch({ type: 'sidecarFailure/loaded', snapshot })
        }
      })
      .catch((error) => {
        console.warn('[app-store] Sidecar failure could not be read:', error)
      })
    getPendingFailures()
      .then((failures) => {
        if (revision === failureRevision) {
          dispatch({ type: 'pendingFailures/loaded', failures })
        }
      })
      .catch((error) => {
        console.warn('[app-store] pending failures could not be read:', error)
      })
  }

  return {
    acceptLatencyUptime,
    readLatencyUptime,
    acceptRunState,
    readRunState,
    readPendingFailures,
    invalidate: () => {
      runRevision += 1
      failureRevision += 1
      latencyRevision += 1
      latestRead = null
    },
  }
}
