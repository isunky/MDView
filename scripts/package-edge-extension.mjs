import { execFile } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)
const output = 'dist/MDView-edge.zip'

await rm(output, { force: true })

if (process.platform === 'win32') {
  await run('powershell.exe', [
    '-NoProfile',
    '-Command',
    "Compress-Archive -Path 'dist-edge\\*' -DestinationPath 'dist\\MDView-edge.zip' -Force",
  ])
} else {
  await run('zip', ['-r', '../dist/MDView-edge.zip', '.'], { cwd: 'dist-edge' })
}

console.log(`Created ${output}`)
