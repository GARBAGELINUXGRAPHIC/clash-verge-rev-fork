import {
  expect,
  expectPageFits,
  expectTextContrast,
  navigate,
  openPage,
  settle,
  test,
  theme,
} from './fixtures'

test('direct routes and reloads load the real preview independently', async ({
  page,
}) => {
  await openPage(page, '/profile')
  await expect(
    page.getByRole('heading', { name: 'Web Preview', exact: true }),
  ).toBeVisible()
  await page.reload()
  await settle(page)
  await expect(page.locator('.base-content [aria-selected]')).toHaveCount(5)
})

test('settings toggles persist across navigation and reset with preview reload', async ({
  page,
}) => {
  await openPage(page, '/settings')
  for (const label of ['开机自启', '局域网连接', 'IPv6']) {
    const row = page
      .locator('.MuiListItem-root')
      .filter({ has: page.getByText(label, { exact: true }) })
    await row.getByRole('switch').check()
    await expect(row.getByRole('switch')).toBeChecked()
  }
  await navigate(page, '订阅')
  await navigate(page, '设置')
  await expect(
    page
      .locator('.MuiListItem-root')
      .filter({ hasText: 'IPv6' })
      .getByRole('switch'),
  ).toBeChecked()
  await page.reload()
  await settle(page)
  await expect(
    page
      .locator('.MuiListItem-root')
      .filter({ hasText: 'IPv6' })
      .getByRole('switch'),
  ).not.toBeChecked()
})

test('select supports keyboard selection, Escape and outside dismissal', async ({
  page,
}) => {
  await openPage(page, '/settings')
  const select = page
    .locator('.MuiListItem-root')
    .filter({ hasText: '日志等级' })
    .getByRole('combobox')
  await select.click()
  await expect(page.getByRole('listbox')).toBeVisible()
  await select.press('Home')
  await select.press('Enter')
  await expect(page.getByRole('listbox')).toBeHidden()
  const selected = await select.textContent()
  await select.click()
  await select.press('ArrowDown')
  await select.press('Escape')
  await expect(select).toHaveText(selected!)
  await expect(select).toBeFocused()
  await select.click()
  await page.getByRole('heading', { level: 1 }).click()
  await expect(page.getByRole('listbox')).toBeHidden()
})

test('dropdown survives rapid close and reopen and stays inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 600 })
  await openPage(page, '/settings')
  const select = page
    .locator('.MuiListItem-root')
    .filter({ hasText: '日志等级' })
    .getByRole('combobox')
  for (let i = 0; i < 3; i++) {
    await select.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await select.press('Escape')
  }
  await select.click()
  await settle(page)
  const box = await page.getByRole('listbox').boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(350)
  expect(box!.y + box!.height).toBeLessThanOrEqual(600)
})

test('theme changes affect real pages and keep foreground text readable', async ({
  page,
}) => {
  await openPage(page, '/settings')
  for (const mode of ['dark', 'light'] as const) {
    await theme(page, mode)
    await navigate(page, '订阅')
    await expectTextContrast(
      page.getByRole('heading', { name: 'Web Preview', exact: true }),
    )
    expect(
      await page.locator('html').evaluate((el) => el.style.colorScheme),
    ).toBe(mode)
  }
})

test('settings dialogs fit small windows, trap focus and restore it on dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 350, height: 600 })
  await openPage(page, '/settings')
  const trigger = page.getByRole('button', { name: '主题设置', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: '主题设置', exact: true })
  await expect(dialog).toBeVisible()
  await settle(page)
  const box = await dialog.boundingBox()
  expect(box!.width).toBeLessThanOrEqual(350 - 32)
  expect(box!.height).toBeLessThanOrEqual(600 - 16)
  expect(box!.y).toBeGreaterThanOrEqual(8)
  expect(box!.y + box!.height).toBeLessThanOrEqual(600 - 8)
  const close = dialog.getByRole('button', { name: '关闭', exact: true })
  await close.focus()
  await page.keyboard.press('Shift+Tab')
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true)
  await expect(close).not.toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('page and dialog overlay scrollbars drag, track wheel and restore after close', async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 })
  await openPage(page, '/settings')
  const section = page.locator('.base-container > section')
  const bar = page.locator('[data-overlay-scrollbar]')
  await expect(bar).toBeVisible()
  await expect(bar).toHaveCSS('z-index', '1200')
  const thumb = bar.locator('> div')
  const box = (await thumb.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120)
  await page.mouse.up()
  await expect
    .poll(() => section.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: '主题设置', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await settle(page)
  await expect(bar).toHaveCSS('z-index', '1301')
  const content = dialog.locator('.MuiDialogContent-root')
  const contentBox = (await content.boundingBox())!
  await page.mouse.move(contentBox.x + 40, contentBox.y + 40)
  await page.mouse.wheel(0, 200)
  await expect
    .poll(() => content.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
  await dialog.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(bar).toHaveCSS('z-index', '1200')
  await expectPageFits(page)
})

test('rules filter, clear and invalid-regex recovery preserve the original data', async ({
  page,
}) => {
  await openPage(page, '/rules')
  const search = page.getByPlaceholder('过滤条件')
  await expect(page.locator('.base-content')).toContainText('ads.example.com')
  await search.fill('docs.example.com')
  await expect(page.locator('.base-content')).not.toContainText(
    'ads.example.com',
  )
  await expect(page.locator('.base-content')).toContainText('docs.example.com')
  await page.getByRole('button', { name: '清空输入框' }).click()
  await expect(page.locator('.base-content')).toContainText('ads.example.com')
  await search.fill('DOCS')
  await expect(page.locator('.base-content')).toContainText('docs.example.com')
  await page.getByRole('button', { name: '区分大小写' }).click()
  await expect(page.locator('.base-content')).not.toContainText(
    'docs.example.com',
  )
  await page.getByRole('button', { name: '区分大小写' }).click()
  await search.fill('doc')
  await expect(page.locator('.base-content')).toContainText('docs.example.com')
  await page.getByRole('button', { name: '全字匹配' }).click()
  await expect(page.locator('.base-content')).not.toContainText(
    'docs.example.com',
  )
  await page.getByRole('button', { name: '全字匹配' }).click()
  await page.getByRole('button', { name: '使用正则表达式' }).click()
  await search.fill('[')
  await expect(search).toHaveAttribute('aria-invalid', 'true')
  await search.fill('ads\\.example')
  await expect(search).not.toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('.base-content')).toContainText('ads.example.com')
})

test('logs filter by severity and text, reverse order and pause/resume', async ({
  page,
}) => {
  await openPage(page, '/logs')
  await expect(page.locator('.base-content')).toContainText(
    'synthetic configuration loaded',
  )
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'ERROR', exact: true }).click()
  await expect(page.locator('.base-content')).toContainText(
    'synthetic connection timeout',
  )
  await expect(page.locator('.base-content')).not.toContainText(
    'synthetic configuration loaded',
  )
  await page.getByPlaceholder('过滤条件').fill('no matching log')
  await expect(page.getByText('空空如也', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '清空输入框' }).click()
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'ALL', exact: true }).click()
  const logs = page.locator('.base-content .data')
  await expect(logs).toHaveCount(4)
  const chronological = await logs.allTextContents()
  await page.getByRole('button', { name: '按时间倒序' }).click()
  await expect(page.getByRole('button', { name: '按时间正序' })).toBeVisible()
  await expect(logs).toHaveText([...chronological].reverse())
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '暂停', exact: true }),
  ).toBeVisible()
})

test('connections filter, switch table/list and open details', async ({
  page,
}) => {
  await openPage(page, '/connections')
  // The application defaults to the table view.
  await page.getByRole('button', { name: '列表视图', exact: true }).click()
  await expect(page.locator('.base-content')).toContainText('docs.example.com')
  await page.getByPlaceholder('过滤条件').fill('docs.example.com')
  await expect(page.locator('.base-content')).not.toContainText(
    'media.example.com',
  )
  await page.getByRole('button', { name: '表格视图', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '列设置', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: '列表视图', exact: true }).click()
  await page
    .locator('.base-content')
    .getByText('docs.example.com:443', { exact: true })
    .click()
  const detail = page.locator('.MuiDrawer-paper')
  await expect(detail).toBeVisible()
  await expect(detail).toContainText('docs.example.com')
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
})

test('proxy modes, node selection and group folding preserve selected state', async ({
  page,
}) => {
  await openPage(page, '/proxies')
  await page.getByRole('radio', { name: '全局', exact: true }).check()
  await expect(
    page.getByRole('radio', { name: '全局', exact: true }),
  ).toBeChecked()
  await page.getByRole('radio', { name: '规则', exact: true }).check()
  await page
    .getByRole('button', { name: '展开 Select Proxy', exact: true })
    .click()
  const node = page.getByRole('button', { name: /^Tokyo 02 Uptime:/ }).first()
  await node.click()
  await expect(
    page.getByRole('button', {
      name: 'Select Proxy Selector Tokyo 02',
      exact: true,
    }),
  ).toBeVisible()
  await settle(page)
  await page
    .getByRole('button', { name: '收起 Select Proxy', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '展开 Select Proxy', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: '展开 Select Proxy', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: /^Tokyo 02 Uptime:/ }).first(),
  ).toBeVisible()
})

test('subscription create, edit, activate, refresh and delete update rendered cards', async ({
  page,
}) => {
  await openPage(page, '/profile')
  await page.getByRole('button', { name: '新建', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('textbox', { name: '名称', exact: true })
    .fill('回归测试订阅')
  await dialog
    .getByRole('textbox', { name: '订阅链接', exact: true })
    .fill('https://example.com/regression.yaml')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()
  let card = page
    .locator('.base-content [aria-selected]')
    .filter({ hasText: '回归测试订阅' })
  await expect(card).toBeVisible()
  await card.click({ button: 'right' })
  await page.getByRole('menuitem', { name: '编辑信息', exact: true }).click()
  await dialog
    .getByRole('textbox', { name: '名称', exact: true })
    .fill('已编辑测试订阅')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeHidden()
  card = page
    .locator('.base-content [aria-selected]')
    .filter({ hasText: '已编辑测试订阅' })
  await card.click()
  await expect(card).toHaveAttribute('aria-selected', 'true')
  await card.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(card).toContainText('几秒前')
  await page.getByRole('heading', { name: 'Web Preview', exact: true }).click()
  await expect(card).toHaveAttribute('aria-selected', 'false')
  await card.click({ button: 'right' })
  await page.getByRole('menuitem', { name: '删除', exact: true }).click()
  await page
    .getByRole('dialog', { name: '确认删除' })
    .getByRole('button', { name: '确认', exact: true })
    .click()
  await expect(card).toHaveCount(0)
})

test('subscription cancel and missing URL validation never create a card', async ({
  page,
}) => {
  await openPage(page, '/profile')
  await page.getByRole('button', { name: '新建', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(page.getByText('请输入订阅链接', { exact: false })).toBeVisible()
  await dialog.getByRole('button', { name: '取消', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.base-content [aria-selected]')).toHaveCount(5)
})

test('unlock single and all checks update status and preserve results after reload', async ({
  page,
}) => {
  await openPage(page, '/unlock')
  const apple = page.getByText('Apple TV+', { exact: true }).locator('..')
  await expect(apple).toContainText('待检测')
  await apple.getByRole('button').click()
  await expect(apple).toContainText('支持')
  await page.getByRole('button', { name: '测试全部', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '测试全部', exact: true }),
  ).toBeEnabled()
  await page.reload()
  await settle(page)
  await expect(
    page.getByText('Apple TV+', { exact: true }).locator('..'),
  ).toContainText('支持')
})

test('unsupported native commands reject instead of pretending to succeed', async ({
  page,
}) => {
  await openPage(page, '/profile')
  for (const command of [
    'install_service',
    'plugin:fs|read_text_file',
    'unknown_regression_command',
  ]) {
    const error = await page.evaluate(async (command) => {
      try {
        await (window as any).__TAURI_INTERNALS__.invoke(command, {})
        return null
      } catch (error) {
        return String(error)
      }
    }, command)
    expect(error).toContain(`Web preview: ${command} is unavailable`)
  }
})
