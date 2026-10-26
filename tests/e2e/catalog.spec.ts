import { expect, test } from '@playwright/test'

test('reader sees top-rated stories and honest metadata on first opening', async ({ page }) => {
  await page.route('https://api.vndb.org/kana/vn', async (route) => {
    const query = route.request().postDataJSON()
    expect(query.sort).toBe('rating')
    expect(query.reverse).toBe(true)
    expect(query.filters).toEqual([])
    await route.fulfill({ json: { results: [
      { id: 'v12402', title: 'The House in Fata Morgana', released: '2012-12-31', rating: 89.4, image: null },
      { id: 'v17', title: 'Saya no Uta', released: null, rating: null, image: null },
    ], more: false, count: 2 } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Find your next story.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'The House in Fata Morgana' })).toBeVisible()
  await expect(page.getByText(/8\.94/)).toBeVisible()
  await expect(page.getByText('Dec 31, 2012', { exact: true })).toBeVisible()
  await expect(page.getByText('Release date unknown')).toBeVisible()
  await expect(page.getByText('Not rated')).toBeVisible()
  await expect(page.getByText('Cover unavailable')).toHaveCount(2)
})

test('reader sees loading and can retry an API failure', async ({ page }) => {
  let finishFirstRequest: (() => void) | undefined
  const gate = new Promise<void>((resolve) => { finishFirstRequest = resolve })
  let first = true
  await page.route('https://api.vndb.org/kana/vn', async (route) => {
    if (first) {
      first = false
      await gate
      await route.fulfill({ status: 503, json: { error: 'temporarily unavailable' } })
    } else {
      await route.fulfill({ json: { results: [{ id: 'v1', title: 'A recovered story', released: '2004', rating: 80, image: null }], more: false } })
    }
  })
  await page.goto('/')
  await expect(page.getByRole('status')).toContainText('Opening a new chapter')
  finishFirstRequest?.()
  await expect(page.getByRole('alert')).toContainText('We could not load stories')
  await expect(page.getByText('No stories here yet.')).toHaveCount(0)
  await page.getByRole('button', { name: /Try again/ }).click()
  await expect(page.getByRole('heading', { name: 'A recovered story' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('failed cover becomes a deliberate placeholder and other covers remain intact', async ({ page }) => {
  await page.route('https://covers.example.test/good.svg', (route) => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="#bdd5c6"/></svg>' }))
  await page.route('https://covers.example.test/broken.jpg', (route) => route.abort())
  await page.route('https://api.vndb.org/kana/vn', (route) => route.fulfill({ json: { results: [
    { id: 'v1', title: 'Available artwork', released: '2024-05', rating: 81, image: { url: 'https://covers.example.test/good.svg' } },
    { id: 'v2', title: 'Unavailable artwork', released: 'TBA', rating: 79, image: { url: 'https://covers.example.test/broken.jpg' } },
  ], more: false } }))
  await page.goto('/')
  await expect(page.getByRole('img', { name: 'Available artwork cover', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Unavailable artwork: cover unavailable', exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Unavailable artwork cover', exact: true })).toHaveCount(0)
  await expect(page.getByText('May 2024')).toBeVisible()
  await expect(page.getByText('To be announced')).toBeVisible()
})

test('mobile reader scrolls cards while main navigation and footer stay visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('https://api.vndb.org/kana/vn', (route) => route.fulfill({ json: { results: Array.from({ length: 24 }, (_, index) => ({ id: `v${index + 1}`, title: `A different story ${index + 1}`, released: '2020', rating: 80, image: null })), more: false } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'A different story 1', exact: true })).toBeVisible()
  const homeBefore = await page.getByRole('link', { name: 'VNDB Explorer home' }).boundingBox()
  const footerBefore = await page.getByLabel('Page 1', { exact: true }).boundingBox()
  const cards = page.getByRole('article')
  const first = await cards.nth(0).boundingBox()
  const second = await cards.nth(1).boundingBox()
  expect(first?.y).toBe(second?.y)
  expect(second!.x).toBeGreaterThan(first!.x)
  await page.getByRole('region', { name: 'Catalog results' }).evaluate((element) => { element.scrollTop = 500 })
  expect(await page.getByRole('link', { name: 'VNDB Explorer home' }).boundingBox()).toEqual(homeBefore)
  expect(await page.getByLabel('Page 1', { exact: true }).boundingBox()).toEqual(footerBefore)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
