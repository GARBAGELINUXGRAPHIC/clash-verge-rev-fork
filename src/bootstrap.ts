import { isTauri } from '@tauri-apps/api/core'

async function bootstrap() {
  if (
    import.meta.env.DEV &&
    !isTauri() &&
    (import.meta.env.MODE === 'web-preview' ||
      new URLSearchParams(location.search).has('web-preview'))
  ) {
    await import('./web-preview/setup')
  }

  await import('./main')
}

void bootstrap()
