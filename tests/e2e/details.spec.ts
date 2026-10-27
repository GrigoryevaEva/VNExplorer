import { expect, test } from '@playwright/test'

const novel = { id: 'v17', title: 'Saya no Uta', released: '2003-12-26', rating: 81.2, votecount: 12345, image: null, titles: [{ lang: 'ja', title: '沙耶の唄', latin: 'Saya no Uta', official: true, main: true }], aliases: ['The Song of Saya'], length: 2, length_minutes: 321, description: 'A [b]strange[/b] world.\n\nVisit [url=https://example.org/story]the source[/url].' }

test('reader opens a story from Catalog and returns with browser Back', async ({ page }) => {
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [novel], more: false, count: 1 } }))
  await page.goto('/')
  await page.getByRole('link', { name: 'Saya no Uta', exact: true }).click()
  await expect(page).toHaveURL(/\/vn\/v17$/)
  await expect(page.getByRole('heading', { name: 'Saya no Uta', level: 1 })).toBeVisible()
  await expect(page.getByText('12,345 votes')).toBeVisible()
  await expect(page.getByText('About 5 hours')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Alternative titles' })).toBeVisible()
  await expect(page.getByText('沙耶の唄', { exact: true })).toBeVisible()
  await expect(page.getByText('The Song of Saya', { exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Find your next story.' })).toBeVisible()
})

test('direct URL preserves source formatting and rejects executable source markup', async ({ page }) => {
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ ...novel, description: 'First [b]bold [i]and italic[/i][/b] paragraph.\n\nVisit [url=/v17]VNDB entry[/url] or [url=https://example.org/story]the source[/url].\n[url=javascript:alert(1)]unsafe link[/url]<img src=x onerror="window.injected=true">' }], more: false } }))
  await page.goto('/vn/v17')
  await expect(page.locator('strong').filter({ hasText: 'bold and italic' })).toBeVisible()
  await expect(page.locator('em').filter({ hasText: 'and italic' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'the source' })).toHaveAttribute('href', 'https://example.org/story')
  await expect(page.getByRole('link', { name: 'VNDB entry' })).toHaveAttribute('href', 'https://vndb.org/v17')
  await expect(page.getByRole('link', { name: 'unsafe link' })).toHaveCount(0)
  await expect(page.getByText('<img src=x onerror="window.injected=true">', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => 'injected' in window)).toBe(false)
})

test('missing source data and coarse play time remain honest across direct routes', async ({ page }) => {
  await page.route('https://api.vndb.org/kana/vn', route => {
    const id = route.request().postDataJSON().filters[2]
    return route.fulfill({ json: { results: [{ ...novel, id, title: 'Original main title', image: null, released: id === 'v2' ? '2024-05' : null, rating: null, votecount: null, titles: [{ lang: 'en', title: 'Translated title', latin: null, main: false, official: true }], aliases: ['Translated title', 'Alias'], length_minutes: null, length: id === 'v2' ? 3 : null, description: null }], more: false } })
  })
  await page.goto('/vn/v2?lang=en')
  await expect(page.getByRole('heading', { name: 'Original main title' })).toBeVisible()
  await expect(page.getByText('Translated title', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Medium · 10–30 hours')).toBeVisible()
  await expect(page.getByText('May 2024', { exact: true })).toBeVisible()
  await expect(page.getByText('Not rated', { exact: true })).toBeVisible()
  await expect(page.getByText('No description available.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Original main title: cover unavailable' })).toBeVisible()
  await page.goto('/vn/v3')
  await expect(page.getByText('Play time unknown')).toBeVisible()
  await expect(page.getByText('Release date unknown')).toBeVisible()
})

test('detail loading, failure retry and unknown IDs are distinct outcomes', async ({ page }) => {
  let finish: (() => void) | undefined
  const gate = new Promise<void>(resolve => { finish = resolve })
  let failed = false
  await page.route('https://api.vndb.org/kana/vn', async route => {
    if (route.request().postDataJSON().filters[2] === 'v999999') return route.fulfill({ json: { results: [], more: false } })
    if (!failed) { failed = true; await gate; return route.fulfill({ status: 503, json: { error: 'offline' } }) }
    return route.fulfill({ json: { results: [novel], more: false } })
  })
  await page.goto('/vn/v17')
  await expect(page.getByRole('status')).toContainText('Opening the story')
  finish?.()
  await expect(page.getByRole('alert')).toContainText('Could not open this story')
  await expect(page.getByRole('heading', { name: 'Story not found' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: 'Saya no Uta', level: 1 })).toBeVisible()
  await page.goto('/vn/v999999')
  await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible()
  await page.goto('/vn/not-an-id')
  await expect(page.getByRole('heading', { name: 'Story not found' })).toBeVisible()
})

test('mobile detail is a single readable column with normal document scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ ...novel, description: Array.from({ length: 30 }, () => 'A long source paragraph for a comfortable reading journey.').join('\n\n') }], more: false } }))
  await page.goto('/vn/v17')
  const cover = await page.getByRole('img', { name: 'Saya no Uta: cover unavailable' }).boundingBox()
  const title = await page.getByRole('heading', { name: 'Saya no Uta', level: 1 }).boundingBox()
  expect(title!.y).toBeGreaterThan(cover!.y + cover!.height)
  await page.getByRole('heading', { name: 'Alternative titles' }).scrollIntoViewIfNeeded()
  await expect(page.getByText('The Song of Saya', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('detail Catalog return preserves the originating Catalog URL', async ({ page }) => {
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [novel], more: false, count: 1 } }))
  await page.goto('/?q=story&page=2')
  await page.getByRole('link', { name: 'Saya no Uta', exact: true }).click()
  await page.getByRole('link', { name: '← Catalog', exact: true }).click()
  await expect(page).toHaveURL(/\/\?q=story&page=2$/)
})
