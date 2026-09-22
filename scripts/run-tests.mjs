import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const vitestPath = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const nodeOptions = process.env.NODE_OPTIONS?.trim() ?? ''
const webStorageOption = '--no-experimental-webstorage'

const result = spawnSync(process.execPath, [vitestPath, 'run', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions.includes(webStorageOption)
      ? nodeOptions
      : `${nodeOptions} ${webStorageOption}`.trim(),
  },
})

if (result.error) {
  console.error(result.error)
  process.exitCode = 1
} else {
  process.exitCode = result.status ?? 1
}
