import { expect, test } from '@playwright/test'

test('included combinations use strict all or any, and always exclude unwanted tags before paging', async ({ page }) => {
  const requests: any[] = []
  await page.route('https://api.vndb.org/kana/vn', route => {
    const query = route.request().postDataJSON()
    requests.push(query)
    const stories = [
      { id: 'v1', title: 'Selected story', tags: ['g2', 'g96'] },
      { id: 'v2', title: 'Fantasy without romance', tags: ['g2'] },
      { id: 'v3', title: 'Violent fantasy romance', tags: ['g2', 'g96', 'g3'] },
    ]
    function matches(predicate: any[], tags: string[]): boolean {
      if (!predicate.length) return true
      if (predicate[0] === 'and') return predicate.slice(1).every(child => matches(child, tags))
      if (predicate[0] === 'or') return predicate.slice(1).some(child => matches(child, tags))
      return predicate[1] === '=' ? tags.includes(predicate[2][0]) : !tags.includes(predicate[2][0])
    }
    const results = stories.filter(story => matches(query.filters, story.tags)).map(({ tags, ...story }) => ({ ...story, image: null }))
    return route.fulfill({ json: { results, more: false, count: results.length } })
  })
  await page.route('https://api.vndb.org/kana/tag', route => route.fulfill({ json: { results: [
    { id: 'g2', name: 'Fantasy', searchable: true }, { id: 'g96', name: 'Romance', searchable: true },
    { id: 'g3', name: 'Violence', searchable: true },
  ], more: false } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Selected story' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Strict match' })).toBeChecked()
  await page.getByRole('button', { name: 'Browse tags' }).click()
  const picker = page.getByRole('dialog', { name: 'Discover tags' })
  await picker.getByRole('button', { name: 'All tags', exact: true }).click()
  await picker.getByRole('button', { name: 'Include Fantasy', exact: true }).click()
  await picker.getByRole('button', { name: 'Include Romance', exact: true }).click()
  await picker.getByRole('button', { name: 'Exclude Violence', exact: true }).click()
  await picker.getByRole('button', { name: 'Done', exact: true }).click()
  expect(requests).toHaveLength(1)
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect.poll(() => requests.length).toBe(2)
  expect(requests.at(-1).filters).toEqual(['and', ['and', ['tag', '=', ['g2', 0, 0]], ['tag', '=', ['g96', 0, 0]]], ['tag', '!=', ['g3', 0, 0]]])
  await expect(page.getByRole('heading', { name: 'Fantasy without romance' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Violent fantasy romance' })).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'Strict match' }).uncheck()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect.poll(() => requests.length).toBe(3)
  expect(requests.at(-1).filters).toEqual(['and', ['or', ['tag', '=', ['g2', 0, 0]], ['tag', '=', ['g96', 0, 0]]], ['tag', '!=', ['g3', 0, 0]]])
  await expect(page.getByRole('heading', { name: 'Fantasy without romance' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Violent fantasy romance' })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Strict match' })).not.toBeChecked()
  await expect(page.getByRole('button', { name: 'Remove excluded tag Violence' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove included tag Fantasy' }).click()
  await page.getByRole('button', { name: 'Remove included tag Romance' }).click()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect.poll(() => requests.at(-1).filters).toEqual(['tag', '!=', ['g3', 0, 0]])
  await page.getByRole('button', { name: 'Remove excluded tag Violence' }).click()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('heading', { name: 'Violent fantasy romance' })).toBeVisible()
  expect(requests.at(-1).filters).toEqual([])
})

test('opposite actions replace and toggle while sort, page, and title submission preserve pending filters', async ({ page }) => {
  const requests: any[] = []
  await page.route('https://api.vndb.org/kana/vn', route => {
    requests.push(route.request().postDataJSON())
    return route.fulfill({ json: { results: [{ id: 'v1', title: 'Available story', image: null }], more: true, count: 72 } })
  })
  await page.route('https://api.vndb.org/kana/tag', route => route.fulfill({ json: { results: [
    { id: 'g2', name: 'Fantasy', searchable: true }, { id: 'g96', name: 'Romance', searchable: true },
  ], more: false } }))
  await page.goto('/?tag=g96&language=ru')
  await expect(page.getByRole('heading', { name: 'Available story' })).toBeVisible()
  await page.getByRole('button', { name: 'Browse tags' }).click()
  const picker = page.getByRole('dialog', { name: 'Discover tags' })
  await picker.getByRole('button', { name: 'Exclude Romance', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Include Romance', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(picker.getByRole('button', { name: 'Exclude Romance', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await picker.getByRole('button', { name: 'Exclude Romance', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Exclude Romance', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await picker.getByRole('button', { name: 'Exclude Romance', exact: true }).click()
  await picker.getByRole('button', { name: 'Include Fantasy', exact: true }).click()
  await picker.getByRole('button', { name: 'Include Fantasy', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Include Fantasy', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await picker.getByRole('button', { name: 'Exclude Fantasy', exact: true }).click()
  await picker.getByRole('button', { name: 'Include Fantasy', exact: true }).click()
  await expect(picker.getByRole('button', { name: 'Exclude Fantasy', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await picker.getByRole('button', { name: 'Done', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Strict match' }).uncheck()
  await page.getByRole('radio', { name: 'English', exact: true }).check()
  expect(requests).toHaveLength(1)
  await page.getByRole('combobox', { name: 'Sort stories' }).selectOption('released')
  await expect.poll(() => requests.length).toBe(2)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await expect.poll(() => requests.length).toBe(3)
  await page.getByRole('searchbox', { name: 'Search titles' }).fill('Alias')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect.poll(() => requests.length).toBe(4)
  expect(requests.at(-1).filters).toEqual(['and', ['search', '=', 'Alias'], ['tag', '=', ['g96', 0, 0]], ['release', '=', ['and', ['lang', '=', 'ru'], ['released', '<=', 'today'], ['released', '!=', 'unknown']]]])
  await expect(page.getByRole('button', { name: 'Remove included tag Fantasy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove excluded tag Romance' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Strict match' })).not.toBeChecked()
  await expect(page.getByRole('radio', { name: 'English', exact: true })).toBeChecked()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect.poll(() => requests.length).toBe(5)
  expect(requests.at(-1).filters).toEqual(['and', ['search', '=', 'Alias'], ['tag', '=', ['g2', 0, 0]], ['tag', '!=', ['g96', 0, 0]], ['release', '=', ['and', ['lang', '=', 'en'], ['released', '<=', 'today'], ['released', '!=', 'unknown']]]])
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Remove included tag Romance' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Strict match' })).toBeChecked()
  await page.goForward()
  await expect(page.getByRole('button', { name: 'Remove excluded tag Romance' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Strict match' })).not.toBeChecked()
})

test.describe('touch tag combinations', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 740 } })
  test('mobile draft exclusions and match mode apply together and filter recovery clears them all', async ({ page }) => {
    const requests: any[] = []
    await page.route('https://api.vndb.org/kana/vn', route => {
      const query = route.request().postDataJSON(); requests.push(query)
      return route.fulfill({ json: query.results === 0 ? { results: [], more: false, count: 3 } : { results: [], more: false, count: 0 } })
    })
    await page.route('https://api.vndb.org/kana/tag', route => route.fulfill({ json: { results: [
      { id: 'g96', name: 'Romance', searchable: true },
    ], more: false } }))
    await page.goto('/?q=story&tag=g96&language=ru')
    await expect(page.getByRole('button', { name: 'Show without filters' })).toBeVisible()
    await page.getByRole('button', { name: 'Filters', exact: true }).tap()
    await page.getByRole('button', { name: 'Browse tags' }).tap()
    const picker = page.getByRole('dialog', { name: 'Discover tags' })
    await picker.getByRole('button', { name: 'Exclude Romance', exact: true }).tap()
    await picker.getByRole('button', { name: 'Done', exact: true }).tap()
    await expect(page.getByRole('button', { name: 'Browse tags' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Remove included tag Romance' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remove excluded tag Romance' })).toBeVisible()
    await page.getByRole('checkbox', { name: 'Strict match' }).uncheck()
    expect(requests).toHaveLength(2)
    await page.getByRole('button', { name: 'Apply filters' }).tap()
    await expect(page.getByRole('dialog', { name: 'Catalog filters', exact: true })).not.toBeVisible()
    await expect(page).toHaveURL(/exclude=g96&strict=0/)
    await page.getByRole('button', { name: 'Show without filters' }).tap()
    await expect(page).toHaveURL(/\/?q=story$/)
    await expect.poll(() => requests.at(-1).filters).toEqual(['search', '=', 'story'])
    await page.getByRole('button', { name: 'Filters', exact: true }).tap()
    await expect(page.getByRole('checkbox', { name: 'Strict match' })).toBeChecked()
    await expect(page.getByRole('button', { name: 'Remove excluded tag Romance' })).toHaveCount(0)
  })
})
