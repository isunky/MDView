import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const options = readOptions(process.argv.slice(2))
const requiredOptions = ['version', 'tag', 'repository', 'msi', 'signature', 'output']

for (const option of requiredOptions) {
  if (!options[option]) {
    throw new Error(`Missing required --${option} option.`)
  }
}

if (!/^\d+\.\d+\.\d+$/.test(options.version)) {
  throw new Error(`Version must use major.minor.patch format. Received: ${options.version}`)
}

if (basename(options.signature) !== `${basename(options.msi)}.sig`) {
  throw new Error('Updater signature must match the MSI filename.')
}

const signature = (await readFile(resolve(options.signature), 'utf8')).trim()
if (!signature) {
  throw new Error('Updater signature file is empty.')
}

const msiName = basename(options.msi)
const manifest = {
  version: options.version,
  notes: `MDView ${options.version}. See the GitHub release for details.`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/${options.repository}/releases/download/${options.tag}/${encodeURIComponent(msiName)}`,
    },
  },
}

await writeFile(resolve(options.output), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

function readOptions(argumentsList) {
  const options = {}

  for (let index = 0; index < argumentsList.length; index += 2) {
    const name = argumentsList[index]
    const value = argumentsList[index + 1]

    if (!name?.startsWith('--') || !value || options[name.slice(2)]) {
      throw new Error('Options must be provided once as --name value pairs.')
    }

    options[name.slice(2)] = value
  }

  return options
}
