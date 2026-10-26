import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

// Scope trust to this checkout for the CLI's Git subprocesses; do not change global Git settings.
const env = { ...process.env }
const index = Number(env.GIT_CONFIG_COUNT || 0)
env.GIT_CONFIG_COUNT = String(index + 1)
env[`GIT_CONFIG_KEY_${index}`] = 'safe.directory'
env[`GIT_CONFIG_VALUE_${index}`] = process.cwd().replaceAll('\\', '/')
const cli = createRequire(import.meta.url).resolve('@changesets/cli/bin.js')
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { env, stdio: 'inherit' })
if (result.error) throw result.error
process.exit(result.status ?? 1)
