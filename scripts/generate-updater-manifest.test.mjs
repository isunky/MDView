import { execFile as executeFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFile = promisify(executeFile)
const scriptPath = resolve(process.cwd(), 'scripts/generate-updater-manifest.mjs')
const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('generate-updater-manifest', () => {
  it('writes a Windows updater manifest from a matching MSI signature', async () => {
    const directory = await createTemporaryDirectory()
    const msi = join(directory, 'MDView_1.9.4_x64_en-US.msi')
    const signature = `${msi}.sig`
    const output = join(directory, 'latest.json')
    await writeFile(msi, 'msi', 'utf8')
    await writeFile(signature, 'signed-update', 'utf8')

    await execFile('node', [
      scriptPath,
      '--version', '1.9.4',
      '--tag', 'v1.9.4',
      '--repository', 'isunky/MDView',
      '--msi', msi,
      '--signature', signature,
      '--output', output,
    ])

    const manifest = JSON.parse(await readFile(output, 'utf8'))
    expect(manifest.version).toBe('1.9.4')
    expect(manifest.platforms['windows-x86_64'].signature).toBe('signed-update')
    expect(manifest.platforms['windows-x86_64'].url).toContain('/v1.9.4/MDView_1.9.4_x64_en-US.msi')
  })

  it('rejects a signature that does not match the MSI asset name', async () => {
    const directory = await createTemporaryDirectory()
    const msi = join(directory, 'MDView.msi')
    const signature = join(directory, 'other.msi.sig')
    await writeFile(msi, 'msi', 'utf8')
    await writeFile(signature, 'signed-update', 'utf8')

    await expect(execFile('node', [
      scriptPath,
      '--version', '1.9.4',
      '--tag', 'v1.9.4',
      '--repository', 'isunky/MDView',
      '--msi', msi,
      '--signature', signature,
      '--output', join(directory, 'latest.json'),
    ])).rejects.toMatchObject({ code: 1 })
  })
})

async function createTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'mdview-updater-'))
  temporaryDirectories.push(directory)
  return directory
}
