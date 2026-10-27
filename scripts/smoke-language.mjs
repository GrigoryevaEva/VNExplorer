import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const port = process.env.PLAYWRIGHT_PORT ?? '4175'
const base = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort'], { stdio: 'pipe', windowsHide: true })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(base)).ok } catch { /* Wait for Vite. */ }
    if (ready) break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert(ready, 'Vite started')
  browser = await chromium.launch()
  const page = await browser.newPage()
  const responsePromise = page.waitForResponse(response => response.url() === 'https://api.vndb.org/kana/vn' && response.request().method() === 'POST')
  await page.goto(`${base}/?q=Soukou%20Akki%20Muramasa&language=ru`)
  const response = await responsePromise
  assert.equal(response.status(), 200)
  const catalog = await response.json()
  assert(catalog.results.some(vn => vn.id === 'v2016'), 'Published Russian demo qualifies in the live catalog')
  await page.getByRole('heading', { name: 'Soukou Akki Muramasa', exact: true }).waitFor()
  const evidence = []
  for (const [id, expectedType] of [['v2016', 'trial'], ['v632', 'partial']]) {
    const body = await page.evaluate(async id => {
      const response = await fetch('https://api.vndb.org/kana/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: ['and', ['vn', '=', ['id', '=', id]], ['lang', '=', 'ru'], ['released', '<=', 'today'], ['released', '!=', 'unknown']], fields: 'title,released,languages{lang,mtl},vns{id,rtype}', results: 100 }) })
      if (!response.ok) throw new Error(`Release API HTTP ${response.status}`)
      return response.json()
    }, id)
    assert(body.results.some(release => release.vns.some(vn => vn.id === id && vn.rtype === expectedType)), `Live ${expectedType} release retained`)
    evidence.push({ id, expectedType, releases: body.results.map(release => ({ id: release.id, released: release.released, languages: release.languages, vns: release.vns })) })
  }
  console.log(JSON.stringify({ status: response.status(), count: catalog.count, evidence }))
} finally {
  await browser?.close()
  server.kill()
}
