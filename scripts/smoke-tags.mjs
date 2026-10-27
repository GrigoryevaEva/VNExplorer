import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'
const port = process.env.PLAYWRIGHT_PORT ?? '4176'
const origin = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'], { stdio: 'pipe', windowsHide: true })
let browser
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(origin)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${origin}/?tag=g96`)
  await page.getByRole('heading', { name: 'Romantic story' }).count()
  const result = await page.evaluate(async () => {
    async function query(endpoint, body) {
      const response = await fetch(`https://api.vndb.org/kana/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`)
      return response.json()
    }
    const tags = []
    for (const page of [1, 2]) tags.push(await query('tag', { fields: 'name,description,searchable', sort: 'id', results: 2, page }))
    const novels = await query('vn', { filters: ['tag', '=', ['g96', 0, 0]], fields: 'title,tags{id,spoiler,rating}', sort: 'rating', reverse: true, results: 2, count: true })
    return { directoryPages: tags.map(page => ({ tags: page.results.map(tag => tag.id), more: page.more })), catalogCount: novels.count, firstTitles: novels.results.map(novel => novel.title) }
  })
  console.log(JSON.stringify(result))
} finally { await browser?.close(); server.kill() }
