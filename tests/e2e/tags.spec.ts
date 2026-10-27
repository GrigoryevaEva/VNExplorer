import { expect, test } from '@playwright/test'

test('complete tag directory supports curated sections and local global search', async ({ page }) => {
  const tagPages: number[] = []
  let catalogRequests = 0
  await page.route('https://api.vndb.org/kana/vn', route => { catalogRequests++; return route.fulfill({ json: { results: [], more: false, count: 0 } }) })
  await page.route('https://api.vndb.org/kana/tag', route => {
    const query = route.request().postDataJSON(); tagPages.push(query.page)
    return route.fulfill({ json: { results: query.page === 1 ? [
      { id: 'g96', name: 'Romance', description: 'Love between characters.', searchable: true },
      { id: 'g2', name: 'Fantasy', description: 'Imaginary worlds.', searchable: true },
      { id: 'g1', name: 'Theme', searchable: false },
    ] : [
      { id: 'g9999', name: 'Unassigned discovery', description: 'Outside the curated sections.', searchable: true },
      { id: 'g235', name: 'No Sexual Content', description: 'A broad searchable group.', searchable: true, applicable: false, category: 'tech' },
    ], more: query.page === 1 } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Browse tags' }).click()
  const picker = page.getByRole('dialog', { name: 'Discover tags' })
  await expect(picker.getByRole('button', { name: 'Include Fantasy', exact: true })).toBeVisible()
  expect(tagPages).toEqual([1, 2])
  await expect(picker.getByRole('listitem')).toHaveText(['FantasyInfoInclude', 'RomanceInfoInclude'])
  await picker.getByRole('button', { name: 'Sexual Content', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Include No Sexual Content', exact: true })).toBeVisible()
  await picker.getByRole('button', { name: 'All tags', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Include Unassigned discovery', exact: true })).toBeVisible()
  await expect(picker.getByText('Theme', { exact: true })).toHaveCount(0)
  await picker.getByRole('button', { name: 'Setting', exact: true }).click()
  await picker.getByRole('searchbox', { name: 'Search all tags' }).fill('Unassigned')
  await expect(picker.getByRole('button', { name: 'Include Unassigned discovery', exact: true })).toBeVisible()
  await picker.getByRole('button', { name: 'About Unassigned discovery' }).focus()
  await page.keyboard.press('Enter')
  await expect(picker.getByText('Outside the curated sections.')).toBeVisible()
  expect(catalogRequests).toBe(1)
  expect(tagPages).toEqual([1, 2])
  await expect(page).toHaveURL(/\/$/)
})

test('one included tag remains a draft until Apply filters and restores from its URL', async ({ page }) => {
  const catalog: any[] = []
  await page.route('https://api.vndb.org/kana/vn', route => {
    const query = route.request().postDataJSON(); catalog.push(query)
    return route.fulfill({ json: { results: [{ id: 'v1', title: JSON.stringify(query.filters).includes('g96') ? 'Romantic story' : 'Initial story', image: null, rating: 80, released: '2020' }], more: false, count: 1 } })
  })
  await page.route('https://api.vndb.org/kana/tag', route => route.fulfill({ json: { results: [{ id: 'g96', name: 'Romance', description: 'Love between characters.', searchable: true }], more: false } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Initial story' })).toBeVisible()
  await page.getByRole('button', { name: 'Browse tags' }).click()
  const picker = page.getByRole('dialog', { name: 'Discover tags' })
  await picker.getByRole('button', { name: 'Include Romance', exact: true }).click()
  await picker.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(picker).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Remove included tag Romance' })).toBeVisible()
  expect(catalog).toHaveLength(1)
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('heading', { name: 'Romantic story' })).toBeVisible()
  expect(catalog.at(-1).filters).toEqual(['tag', '=', ['g96', 0, 0]])
  await expect(page).toHaveURL(/tag=g96/)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Romantic story' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove included tag Romance' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove included tag Romance' }).click()
  await expect(page).toHaveURL(/tag=g96/)
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('heading', { name: 'Initial story' })).toBeVisible()
})

test.describe('touch access', () => {
 test.use({ hasTouch: true })
 test('mobile reader opens tags from Filters and retries an interrupted directory', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  let attempts = 0
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [], more: false, count: 0 } }))
  await page.route('https://api.vndb.org/kana/tag', route => {
    attempts++
    return attempts === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [{ id: 'g96', name: 'Romance', description: 'Love between characters.', searchable: true }], more: false } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByRole('button', { name: 'Browse tags' }).click()
  const picker = page.getByRole('dialog', { name: 'Discover tags' })
  await expect(picker.getByRole('alert')).toBeVisible()
  await picker.getByRole('button', { name: 'Retry tags' }).click()
  await picker.getByRole('button', { name: 'About Romance' }).tap()
  await expect(picker.getByText('Love between characters.')).toBeVisible()
  await picker.getByRole('button', { name: 'Include Romance', exact: true }).tap()
  await expect(picker.getByRole('button', { name: 'Include Romance', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(picker.getByRole('button', { name: 'Done' })).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/ticket04-mobile-tags.png' })
  await page.keyboard.press('Escape')
  await expect(picker).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Browse tags' })).toBeFocused()
})

})

