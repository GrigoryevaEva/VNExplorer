import { expect, test } from '@playwright/test'

const novel = { id: 'v1', title: 'Cached story', released: '2020', rating: 80, image: null }
test.beforeEach(async ({ page }) => {
  await page.route('https://api.vndb.org/kana/tag', route => route.fulfill({ json: { results: [], more: false } }))
})

test('fresh Catalog responses survive reload without another API request', async ({ page }) => {
  let requests = 0
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests++
    return route.fulfill({ json: { results: [novel], more: false, count: 1 } })
  })
  await page.goto('/?q=kept&language=en&tag=g96&exclude=g2&strict=0&sort=released&page=2')
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  expect(requests).toBe(1)
})

test('Catalog expires after five minutes and identifies an older fallback during a temporary outage', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
  let requests = 0
  let unavailable = false
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests++
    return unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [novel], more: false, count: 1 } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await page.clock.fastForward(298_000)
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  expect(requests).toBe(1)
  unavailable = true
  await page.clock.fastForward(3_000)
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  expect(requests).toBe(2)
  unavailable = false
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.')).toHaveCount(0)
  expect(requests).toBe(3)
})

test('returning to an identical pending selection shares transport even when its earlier consumer leaves', async ({ page }) => {
  let finish!: () => void
  const gate = new Promise<void>(resolve => { finish = resolve })
  let initialRequests = 0
  await page.route('https://api.vndb.org/kana/vn', async route => {
    const body = route.request().postDataJSON()
    const search = body.filters[2]
    if (!search) { initialRequests++; await gate }
    await route.fulfill({ json: { results: [{ ...novel, title: search ? 'Other story' : novel.title }], more: false, count: 1 } })
  })
  await page.goto('/')
  await expect.poll(() => initialRequests).toBe(1)
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('other')
  await page.getByRole('searchbox', { name: 'Search titles' }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Other story' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('')
  await page.getByRole('searchbox', { name: 'Search titles' }).press('Enter')
  await expect(page).toHaveURL(/\/$/)
  finish()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  expect(initialRequests).toBe(1)
})

test('detail and release data stay fresh for six hours and expose stale provenance after expiry', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00Z'))
  let unavailable = false
  const requests = { details: 0, directory: 0, releases: 0 }
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests.details++
    return unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [{ ...novel, tags: [], titles: [], aliases: [], screenshots: [] }], more: false } })
  })
  await page.route('https://api.vndb.org/kana/release', route => {
    const detail = route.request().postDataJSON().fields.includes('title')
    requests[detail ? 'releases' : 'directory']++
    return unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: detail
      ? [{ id: 'r1', title: 'Cached edition', released: '2020', minage: null, official: true, platforms: ['win'], extlinks: [] }]
      : [{ id: 'r1', languages: [{ lang: 'en' }, { lang: 'ru' }] }], more: false } })
  })
  await page.goto('/vn/v1')
  await page.getByRole('button', { name: 'English · 1 release' }).click()
  await expect(page.getByText('Cached edition', { exact: true })).toBeVisible()
  await page.clock.setFixedTime(new Date('2026-10-27T15:59:59Z'))
  await page.reload()
  await page.getByRole('button', { name: 'English · 1 release' }).click()
  await expect(page.getByText('Cached edition', { exact: true })).toBeVisible()
  expect(requests).toEqual({ details: 1, directory: 1, releases: 1 })
  unavailable = true
  await page.clock.setFixedTime(new Date('2026-10-27T16:00:01Z'))
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title, level: 1 })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.').first()).toBeVisible()
  await page.getByRole('button', { name: 'English · 1 release' }).click()
  const group = page.getByRole('region', { name: 'English releases' })
  await expect(group.getByText('Cached edition', { exact: true })).toBeVisible()
  await expect(group.getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  await page.getByRole('button', { name: 'Russian · 1 release' }).click()
  await expect(page.getByRole('region', { name: 'Russian releases' }).getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  expect(requests).toEqual({ details: 2, directory: 2, releases: 2 })
})

test('the tag directory expires after seven days even without reloading the application', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00Z'))
  let unavailable = false
  let requests = 0
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [novel], more: false, count: 1 } }))
  await page.route('https://api.vndb.org/kana/tag', route => {
    requests++
    return unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [{ id: 'g96', name: 'Romance', description: 'A love story.', searchable: true }], more: false } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Browse tags' }).click()
  await expect(page.getByRole('button', { name: 'Include Romance', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.clock.setFixedTime(new Date('2026-11-03T09:59:59Z'))
  await page.getByRole('button', { name: 'Browse tags' }).click()
  await expect(page.getByRole('button', { name: 'Include Romance', exact: true })).toBeVisible()
  expect(requests).toBe(1)
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  unavailable = true
  await page.clock.setFixedTime(new Date('2026-11-03T10:00:01Z'))
  await page.getByRole('button', { name: 'Browse tags' }).click()
  await expect(page.getByRole('button', { name: 'Include Romance', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Discover tags' }).getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  expect(requests).toBe(2)
})

test('a stale title-only diagnostic count is identified even when filtered results are fresh', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00Z'))
  let failCount = false
  let counts = 0
  await page.route('https://api.vndb.org/kana/vn', route => {
    const body = route.request().postDataJSON()
    if (body.results === 0) {
      counts++
      return failCount ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [], count: 47, more: false } })
    }
    return route.fulfill({ json: { results: [], count: 0, more: false } })
  })
  await page.goto('/?q=needle&language=ru')
  await expect(page.getByRole('heading', { name: '47 matches hidden by filters.' })).toBeVisible()
  failCount = true
  await page.clock.setFixedTime(new Date('2026-10-27T10:05:01Z'))
  await page.reload()
  await expect(page.getByRole('heading', { name: '47 matches hidden by filters.' })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  expect(counts).toBe(2)
})

test('Saved identifies stale refreshes and remains readable after disposable cache eviction', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00Z'))
  let unavailable = false
  await page.route('https://api.vndb.org/kana/vn', route => unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [novel], count: 1, more: false } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Save Cached story', exact: true }).click()
  await page.getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Showing saved details while checking VNDB…')).toHaveCount(0)
  unavailable = true
  await page.clock.setFixedTime(new Date('2026-10-27T16:00:01Z'))
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  await page.evaluate(async () => {
    for (const database of await indexedDB.databases()) await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase(database.name!)
      deletion.onsuccess = () => resolve()
      deletion.onerror = () => reject(deletion.error)
    })
  })
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Could not refresh from VNDB. Showing your last-known saved details.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Saved Cached story', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('multilingual release records are reused across reload and differently sized language batches', async ({ page }) => {
  let details = 0
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ ...novel, screenshots: [] }], more: false } }))
  await page.route('https://api.vndb.org/kana/release', route => {
    const body = route.request().postDataJSON()
    if (!body.fields.includes('title')) return route.fulfill({ json: { results: [
      { id: 'r1', languages: [{ lang: 'en' }, { lang: 'ru' }] }, { id: 'r2', languages: [{ lang: 'en' }] },
    ], more: false } })
    details++
    const ids: string[] = body.filters[0] === 'id' ? [body.filters[2]] : body.filters.slice(1).map((filter: string[]) => filter[2])
    return route.fulfill({ json: { results: ids.map(id => ({ id, title: `Edition ${id}`, released: '2020', minage: null, official: false, platforms: ['win'], extlinks: [] })), more: false } })
  })
  await page.goto('/vn/v1')
  await page.getByRole('button', { name: 'English · 2 releases' }).click()
  await expect(page.getByText('Edition r2', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Russian · 1 release' }).click()
  await expect(page.getByText('Edition r1', { exact: true })).toBeVisible()
  expect(details).toBe(1)
})

test('cache keys isolate search, language, tag modes, sort and numbered pages', async ({ page }) => {
  let requests = 0
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests++
    return route.fulfill({ json: { results: [{ ...novel, title: `Variant ${requests}` }], count: 100, more: true } })
  })
  const variants = [
    '/?q=one', '/?q=two', '/?q=two&language=ru', '/?q=two&language=ru&tag=g2&tag=g96&exclude=g3',
    '/?q=two&language=ru&tag=g2&tag=g96&exclude=g3&strict=0',
    '/?q=two&language=ru&tag=g2&tag=g96&exclude=g3&strict=0&sort=released',
    '/?q=two&language=ru&tag=g2&tag=g96&exclude=g3&strict=0&sort=released&page=2',
  ]
  for (const [index, url] of variants.entries()) {
    await page.goto(url)
    await expect(page.getByRole('heading', { name: `Variant ${index + 1}` })).toBeVisible()
  }
  await page.goto('/?exclude=g3&tag=g96&language=ru&q=two&tag=g2')
  await expect(page.getByRole('heading', { name: 'Variant 4' })).toBeVisible()
  expect(requests).toBe(7)
})

test('unavailable IndexedDB degrades to live data and never prevents Saved persistence', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get: () => { throw new DOMException('Unavailable', 'SecurityError') } }) })
  let unavailable = false
  await page.route('https://api.vndb.org/kana/vn', route => unavailable ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { results: [novel], count: 1, more: false } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Save Cached story', exact: true }).click()
  await page.getByRole('link', { name: 'Saved', exact: true }).click()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  unavailable = true
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Could not refresh from VNDB. Showing your last-known saved details.')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('throttling has a bounded retry path and falls back only when cached results exist', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-27T10:00:00Z') })
  let throttled = true
  let requests = 0
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests++
    return throttled ? route.fulfill({ status: 429, headers: { 'Retry-After': '1' }, json: {} }) : route.fulfill({ json: { results: [novel], more: false, count: 1 } })
  })
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('VNDB needs a little time')
  await expect(page.getByRole('heading', { name: 'No stories here yet.' })).toHaveCount(0)
  await page.clock.fastForward(60_000)
  expect(requests).toBe(1)
  throttled = false
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  throttled = true
  await page.clock.setFixedTime(new Date('2026-10-27T10:10:00Z'))
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByText('Showing older cached data. VNDB could not be reached.')).toBeVisible()
  await page.clock.fastForward(60_000)
  expect(requests).toBe(3)
})

test('an incomplete release batch stays retriable instead of becoming a cached empty success', async ({ page }) => {
  let attempts = 0
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ ...novel, screenshots: [] }], more: false } }))
  await page.route('https://api.vndb.org/kana/release', route => {
    const body = route.request().postDataJSON()
    if (!body.fields.includes('title')) return route.fulfill({ json: { results: [{ id: 'r1', languages: [{ lang: 'en' }] }], more: false } })
    attempts++
    return route.fulfill({ json: { results: attempts === 1 ? [] : [{ id: 'r1', title: 'Recovered edition', released: '2020', minage: null, official: true, platforms: [], extlinks: [] }], more: false } })
  })
  await page.goto('/vn/v1')
  await page.getByRole('button', { name: 'English · 1 release' }).click()
  const group = page.getByRole('region', { name: 'English releases' })
  await expect(group.getByRole('alert')).toContainText('Some release details are unavailable')
  await group.getByRole('button', { name: 'Retry English releases' }).click()
  await expect(group.getByText('Recovered edition', { exact: true })).toBeVisible()
  expect(attempts).toBe(2)
})

test('a cache write failure does not hide a successful response or a saved collection', async ({ page }) => {
  await page.addInitScript(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('Full', 'QuotaExceededError') } })
  let requests = 0
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests++
    return route.fulfill({ json: { results: [novel], count: 1, more: false } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Save Cached story', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: novel.title })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Saved Cached story', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(requests).toBe(2)
  await expect(page.getByRole('alert')).toHaveCount(0)
})
