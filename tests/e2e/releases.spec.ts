import { expect, test } from '@playwright/test'

test('complete language directory stays light until expansion and loads every release automatically', async ({ page }) => {
  const manifest = Array.from({ length: 103 }, (_, i) => ({ id: `r${i + 1}`, languages: [{ lang: 'en' }, ...(i === 0 ? [{ lang: 'ru' }] : [])] }))
  const requests: { fields: string; filters: unknown[]; results: number; page?: number }[] = []
  let finish!: () => void
  const gate = new Promise<void>(resolve => { finish = resolve })
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ id: 'v17', title: 'Release story', image: null, titles: [], aliases: [], screenshots: [] }], more: false } }))
  await page.route('https://api.vndb.org/kana/release', async route => {
    const body = route.request().postDataJSON()
    requests.push(body)
    if (!body.fields.includes('title')) {
      expect(body.filters).toEqual(['vn', '=', ['id', '=', 'v17']])
      expect(body.fields).toBe('id,languages.lang')
      return route.fulfill({ json: { results: body.page === 1 ? manifest.slice(0, 100) : manifest.slice(100), more: body.page === 1 } })
    }
    expect(['or', 'id']).toContain(body.filters[0])
    const ids = body.filters[0] === 'id' ? [body.filters[2] as string] : (body.filters.slice(1) as [string, string, string][]).map(filter => filter[2])
    if (body.filters[0] === 'or') expect(ids.length).toBeGreaterThan(1)
    for (const id of ids) expect(id).toMatch(/^r[1-9]\d*$/)
    expect(ids.length).toBeLessThanOrEqual(100)
    if (ids.includes('r101')) await gate
    return route.fulfill({ json: { results: ids.map(id => ({ id, title: `Edition ${id}`, released: '2020', minage: null, official: false, platforms: ['win'], extlinks: [] })), more: false } })
  })
  await page.goto('/vn/v17')
  const english = page.getByRole('button', { name: 'English · 103 releases' })
  await expect(english).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByRole('button', { name: 'Russian · 1 release' })).toHaveAttribute('aria-expanded', 'false')
  expect(requests.filter(request => request.fields.includes('title'))).toHaveLength(0)
  await english.click()
  const group = page.getByRole('region', { name: 'English releases' })
  await expect(group.getByRole('status')).toHaveText('Loading releases: 100 / 103')
  await expect(group.getByText('Edition r1', { exact: true })).toBeVisible()
  finish()
  await expect(group.getByText('Edition r103', { exact: true })).toBeVisible()
  await expect(group.getByRole('listitem')).toHaveCount(103)
  await english.click()
  await english.click()
  await page.getByRole('button', { name: 'Russian · 1 release' }).click()
  await expect(page.getByRole('region', { name: 'Russian releases' }).getByText('Edition r1', { exact: true })).toBeVisible()
  expect(requests.filter(request => request.fields.includes('title'))).toHaveLength(2)
  await expect(page.getByRole('button', { name: /Show more/ })).toHaveCount(0)
})

test('failed release batch keeps loaded rows and retry preserves dates, ages and appropriate websites', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const manifest = Array.from({ length: 101 }, (_, i) => ({ id: `r${i + 1}`, languages: [{ lang: 'en' }] }))
  const batches: string[][] = []
  let fail = true
  await page.route('https://api.vndb.org/kana/vn', route => route.fulfill({ json: { results: [{ id: 'v17', title: 'Release story', image: null, titles: [], aliases: [], screenshots: [] }], more: false } }))
  await page.route('https://api.vndb.org/kana/release', route => {
    const body = route.request().postDataJSON()
    if (!body.fields.includes('title')) return route.fulfill({ json: { results: body.page === 1 ? manifest.slice(0, 100) : manifest.slice(100), more: body.page === 1 } })
    expect(['or', 'id']).toContain(body.filters[0])
    const ids = body.filters[0] === 'id' ? [body.filters[2] as string] : (body.filters.slice(1) as [string, string, string][]).map(filter => filter[2])
    if (body.filters[0] === 'or') expect(ids.length).toBeGreaterThan(1)
    for (const id of ids) expect(id).toMatch(/^r[1-9]\d*$/)
    batches.push(ids)
    if (ids.includes('r101') && fail) { fail = false; return route.fulfill({ status: 503, json: { error: 'offline' } }) }
    const records = ids.map(id => ({ id, title: `Edition ${id}`, released: 'unknown', minage: null as number | null, official: false, platforms: ['win'], extlinks: [] as { name: string; label: string; url: string }[] }))
    for (const record of records) {
      if (record.id === 'r1') Object.assign(record, { title: 'Future demo', released: '2099-05', minage: 18, official: true, extlinks: [{ name: 'website', label: 'Official website', url: 'https://translation.example/demo' }, { name: 'steam', label: 'Steam', url: 'https://store.example/demo' }] })
      if (record.id === 'r2') Object.assign(record, { title: 'Partial patch', released: '2024', extlinks: [{ name: 'website', label: 'Official website', url: 'http://translation.example/patch' }, { name: 'website', label: 'Mirror', url: 'https://mirror.example/patch' }] })
      if (record.id === 'r3') Object.assign(record, { title: 'Machine translation', released: '2023-02-03', minage: 0, extlinks: [{ name: 'website', label: 'Invalid', url: 'javascript:alert(1)' }, { name: 'steam', label: 'Steam', url: 'https://store.example/game' }] })
      if (record.id === 'r101') Object.assign(record, { title: 'Pending edition', released: 'TBA' })
    }
    return route.fulfill({ json: { results: records, more: false } })
  })
  await page.goto('/vn/v17')
  await page.getByRole('button', { name: 'English · 101 releases' }).click()
  const group = page.getByRole('region', { name: 'English releases' })
  await expect(group.getByRole('alert')).toContainText('Could not load English releases.')
  await expect(group.getByRole('alert')).toContainText('Loaded 100 / 101')
  await expect(group.getByRole('listitem')).toHaveCount(100)
  await group.getByRole('button', { name: 'Retry English releases' }).click()
  await expect(group.getByRole('alert')).toHaveCount(0)
  await expect(group.getByRole('listitem')).toHaveCount(101)
  expect(batches.map(ids => ids.length)).toEqual([100, 1, 1])
  const rows = group.locator('.release-row')
  await expect(rows.nth(0)).toContainText('Future demo')
  await expect(rows.nth(0)).toContainText('May 2099')
  await expect(rows.nth(0)).toContainText('Planned')
  await expect(rows.nth(0)).toContainText('18+')
  await expect(rows.nth(0)).toContainText('Windows')
  await expect(rows.nth(0)).toContainText('Official')
  await expect(rows.nth(0).getByRole('link', { name: 'Future demo' })).toHaveAttribute('href', 'https://translation.example/demo')
  await expect(rows.nth(1)).toContainText('2024')
  await expect(rows.nth(1)).toContainText('Age unknown')
  await expect(rows.nth(1)).toContainText('Unofficial')
  await group.locator('summary').filter({ hasText: 'Partial patch' }).click()
  await expect(group.getByRole('link', { name: 'Official website' })).toHaveAttribute('href', 'http://translation.example/patch')
  await expect(group.getByRole('link', { name: 'Mirror' })).toHaveAttribute('href', 'https://mirror.example/patch')
  await expect(rows.nth(2)).toContainText('Feb 3, 2023')
  await expect(rows.nth(2)).toContainText('All ages')
  await expect(group.getByRole('link', { name: 'Machine translation' })).toHaveCount(0)
  await expect(group.getByRole('link', { name: /Steam|Invalid/ })).toHaveCount(0)
  await expect(rows.last()).toContainText('Pending edition')
  await expect(rows.last()).toContainText('To be announced')
  await expect(rows.last()).toContainText('Planned')
  await rows.last().scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})




