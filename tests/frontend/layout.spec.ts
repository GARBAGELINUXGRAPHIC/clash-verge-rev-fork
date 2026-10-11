import {
  expect,
  expectEffectsVisible,
  expectPageFits,
  navigate,
  openPage,
  pages,
  settle,
  test,
  theme,
} from './fixtures'

for (const width of [350, 800, 1280]) {
  for (const mode of ['light', 'dark'] as const) {
    for (const route of pages) {
      test(`${route.path} fits ${width}px in ${mode}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 })
        await openPage(page, '/settings')
        await theme(page, mode)
        await navigate(page, route.nav)
        await expect(page).toHaveURL(new RegExp(`${route.path}$`))
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          route.title,
        )
        await expectPageFits(page)
        await expect(
          page.getByText('出现了一些问题', { exact: true }),
        ).toHaveCount(0)
        if (route.path === '/profile') {
          const cards = page.locator('.base-content [aria-selected]')
          await expect(cards).toHaveCount(5)
          for (const card of [cards.first(), cards.last()]) {
            await card.hover()
            await settle(page)
            await expect(card).not.toHaveCSS('transform', 'none')
            await expectEffectsVisible(card)
          }
        }
        if (route.path === '/unlock') {
          const card = page.getByText('Netflix', { exact: true }).locator('..')
          await expect(card).toBeVisible()
          await card.hover()
          await settle(page)
          await expectEffectsVisible(card)
        }
      })
    }
  }
}

test('settings primary labels use readable, consistent typography', async ({
  page,
}) => {
  await openPage(page, '/settings')
  const labels = [
    '虚拟网卡模式',
    '系统代理',
    '开机自启',
    '静默启动',
    '局域网连接',
    'DNS 覆写',
    'IPv6',
    '日志等级',
    '语言设置',
    '主题模式',
    '主题设置',
    '界面设置',
    '托盘设置',
    '备份设置',
    '检查更新',
  ]
  for (const label of labels) {
    const text = page
      .locator('.base-content')
      .getByText(label, { exact: true })
      .first()
    const size = await text.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    )
    expect(size, label).toBeGreaterThanOrEqual(16)
  }
})

test('subscription columns grow without overflowing or exceeding the four-column range', async ({
  page,
}) => {
  await openPage(page, '/profile')
  for (const [width, columns] of [
    [350, 1],
    [800, 2],
    [1280, 3],
    [1440, 4],
    [1920, 4],
    [2800, 5],
  ]) {
    await page.setViewportSize({ width, height: 800 })
    await settle(page)
    const grid = page
      .locator('.base-content [aria-selected]')
      .first()
      .locator('../..')
    await expect
      .poll(() =>
        grid.evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
        ),
      )
      .toBe(columns)
    await expectPageFits(page)
  }
})

test('reduced motion removes card zoom without hiding shadows', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPage(page, '/profile')
  const card = page.locator('.base-content [aria-selected]').first()
  await card.hover()
  await expect(card).toHaveCSS('transform', 'none')
  await expectEffectsVisible(card)
})

test('sidebar collapse preserves navigation and expands available content', async ({
  page,
}) => {
  await openPage(page, '/profile')
  const before = await page.locator('.base-page').boundingBox()
  await page.getByRole('button', { name: '收起', exact: true }).click()
  await settle(page)
  expect(
    (await page.locator('.base-page').boundingBox())!.width,
  ).toBeGreaterThan(before!.width)
  for (const route of pages) {
    await navigate(page, route.nav)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      route.title,
    )
  }
})
