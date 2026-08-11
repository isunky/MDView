import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceDirectory = resolve(projectRoot, 'dist-edge')
const outputDirectory = resolve(projectRoot, 'dist')
const output = resolve(outputDirectory, 'MDView-edge.zip')

await mkdir(outputDirectory, { recursive: true })
await rm(output, { force: true })

if (process.platform === 'win32') {
  await run('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${escapePowerShellPath(sourceDirectory)}\\*' -DestinationPath '${escapePowerShellPath(output)}' -Force`,
  ])
} else {
  await run('zip', ['-r', output, '.'], { cwd: sourceDirectory })
}

console.log(`Created ${relative(projectRoot, output)}`)

function escapePowerShellPath(path) {
  return path.replaceAll("'", "''")
}
