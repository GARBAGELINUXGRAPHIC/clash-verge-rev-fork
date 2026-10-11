import { expect, test as base, type Locator, type Page } from '@playwright/test'

export const pages = [
  { path: '/proxies', nav: '代理', title: '代理组' },
  { path: '/profile', nav: '订阅', title: '订阅' },
  { path: '/connections', nav: '连接', title: '连接' },
  { path: '/rules', nav: '规则', title: '规则' },
  { path: '/logs', nav: '日志', title: '日志' },
  { path: '/unlock', nav: '测试', title: '解锁测试' },
  { path: '/settings', nav: '设置', title: '设置' },
] as const

export const test = base.extend<{ runtimeGuard: void }>({
  runtimeGuard: [
    async ({ page, context }, use, testInfo) => {
      const errors: string[] = []
      const warnings: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
        if (message.type() === 'warning') warnings.push(message.text())
      })
      page.on('response', (response) => {
        if (response.status() >= 400)
          errors.push(`${response.status()} ${response.url()}`)
      })
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url())
        if (url.origin === 'http://127.0.0.1:3001') return route.continue()
        errors.push(`Unexpected external request: ${url.origin}${url.pathname}`)
        return route.abort()
      })
      await use()
      if (warnings.length)
        await testInfo.attach('console-warnings', {
          body: warnings.join('\n'),
          contentType: 'text/plain',
        })
      expect(errors, 'frontend runtime / network errors').toEqual([])
    },
    { auto: true },
  ],
})
export { expect }

export async function settle(page: Page) {
  await expect(page.locator('.base-page h1')).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getTiming().iterations !== Infinity,
        )
        .map((animation) => animation.finished.catch(() => {})),
    )
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })
}

export async function openPage(page: Page, path: string) {
  await page.goto(path)
  await expect(page).toHaveTitle('Clash Verge · Web Preview')
  await settle(page)
}

export async function navigate(page: Page, nav: string) {
  await page
    .locator('.the-menu')
    .getByRole('button', { name: nav, exact: true })
    .click()
  await settle(page)
}

export async function theme(page: Page, mode: 'light' | 'dark') {
  await navigate(page, '设置')
  await page
    .getByRole('radio', {
      name: mode === 'light' ? '浅色' : '深色',
      exact: true,
    })
    .check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', mode)
  await settle(page)
}

export async function expectTextContrast(text: Locator) {
  const ratio = await text.evaluate((el) => {
    // Composite translucent ancestor backgrounds before measuring contrast.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    context.fillStyle = 'white'
    context.fillRect(0, 0, 1, 1)
    const ancestors: Element[] = []
    for (let node: Element | null = el; node; node = node.parentElement)
      ancestors.unshift(node)
    for (const node of ancestors) {
      context.fillStyle = getComputedStyle(node).backgroundColor
      context.fillRect(0, 0, 1, 1)
    }
    const background = context.getImageData(0, 0, 1, 1).data
    context.fillStyle = getComputedStyle(el).color
    context.fillRect(0, 0, 1, 1)
    const foreground = context.getImageData(0, 0, 1, 1).data
    const luminance = (color: Uint8ClampedArray) => {
      const channels = Array.from(color)
        .slice(0, 3)
        .map((value) => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    }
    const light = luminance(background)
    const dark = luminance(foreground)
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)
  })
  expect(
    ratio,
    'primary text contrast against rendered background',
  ).toBeGreaterThanOrEqual(4.5)
}

export async function expectPageFits(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const selectors = [
            'html',
            'body',
            '.layout',
            '.base-page',
            '.base-container',
            '.base-content',
          ]
          return selectors.flatMap((selector) =>
            Array.from(document.querySelectorAll<HTMLElement>(selector))
              .filter((el) => el.scrollWidth > el.clientWidth + 1)
              .map(
                (el) => `${selector}: ${el.scrollWidth} > ${el.clientWidth}`,
              ),
          )
        }),
      { message: 'page shell must not overflow horizontally' },
    )
    .toEqual([])
  const header = page.locator('.base-page > header')
  const offscreen = await header.evaluate((el) =>
    Array.from(el.querySelectorAll<HTMLElement>('h1, button, [role="radio"]'))
      .filter((item) => {
        const rect = item.getBoundingClientRect()
        return (
          rect.width > 0 &&
          (rect.left < -1 || rect.right > innerWidth + 1 || rect.top < -1)
        )
      })
      .map((el) => el.textContent || el.getAttribute('aria-label')),
  )
  expect(offscreen, 'page title and header actions remain reachable').toEqual(
    [],
  )
}

// Check rendered effects against clipping ancestors, including scrollports.
// Vertical clipping during scrolling is intentional; scroll the card into view first.
export async function expectEffectsVisible(card: Locator) {
  await card.scrollIntoViewIfNeeded()
  await expect
    .poll(
      () =>
        card.evaluate((el) => {
          const rect = el.getBoundingClientRect()
          const shadow = getComputedStyle(el).boxShadow
          const lengths = shadow.match(/-?[\d.]+px/g)?.map(parseFloat) ?? []
          const [x = 0, y = 0, blur = 0, spread = 0] = lengths
          const halo = blur / 2 + Math.max(0, spread)
          const bounds = {
            left: rect.left + Math.min(0, x) - halo,
            right: rect.right + Math.max(0, x) + halo,
            top: rect.top + Math.min(0, y) - halo,
            bottom: rect.bottom + Math.max(0, y) + halo,
          }
          const clipped: string[] = []
          for (
            let parent = el.parentElement;
            parent;
            parent = parent.parentElement
          ) {
            const style = getComputedStyle(parent)
            const box = parent.getBoundingClientRect()
            const clipsX = /hidden|clip|auto|scroll/.test(style.overflowX)
            const clipsY = /hidden|clip|auto|scroll/.test(style.overflowY)
            if (
              (clipsX &&
                (bounds.left < box.left - 1 || bounds.right > box.right + 1)) ||
              (clipsY &&
                (bounds.top < box.top - 1 || bounds.bottom > box.bottom + 1))
            )
              clipped.push(
                `${parent.tagName}.${parent.className} (${style.overflow})`,
              )
          }
          return clipped
        }),
      { message: 'card bounds and shadow must fit clipping ancestors' },
    )
    .toEqual([])
}
