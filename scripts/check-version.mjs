import { readFile } from 'node:fs/promises'

const { version: expectedVersion } = await readJsonVersion('package.json')
const versions = await Promise.all([
  readJsonVersion('package-lock.json', 'package-lock.json root version'),
  readPackageLockWorkspaceVersion(),
  readTextVersion('src-tauri/Cargo.toml', /\[package\][\s\S]*?\nversion\s*=\s*"([^"]+)"/, 'src-tauri/Cargo.toml package version'),
  readTextVersion('src-tauri/Cargo.lock', /\[\[package\]\]\r?\nname = "mdview"\r?\nversion = "([^"]+)"/, 'src-tauri/Cargo.lock mdview version'),
  readJsonVersion('src-tauri/tauri.conf.json', 'src-tauri/tauri.conf.json version'),
  readTextVersion('src/appInfo.ts', /version:\s*'([^']+)'/, 'src/appInfo.ts version'),
  readJsonVersion('edge/public/manifest.json', 'edge/public/manifest.json version'),
  readTextVersion('README.md', /<strong>Version \/ 版本：<\/strong>([0-9]+\.[0-9]+\.[0-9]+)/, 'README.md header version'),
  readTextVersion('README.md', /\| 当前版本 \| ([0-9]+\.[0-9]+\.[0-9]+) \|/, 'README.md Chinese version row'),
  readTextVersion('README.md', /\| (?:Current version|Version) \| ([0-9]+\.[0-9]+\.[0-9]+) \|/, 'README.md English version row'),
])

const mismatches = versions.filter(({ version }) => version !== expectedVersion)
if (mismatches.length > 0) {
  console.error(`Version mismatch: package.json is ${expectedVersion}.`)
  for (const mismatch of mismatches) console.error(`- ${mismatch.label}: ${mismatch.version}`)
  console.error('Run npm run version:sync -- <major.minor.patch> to synchronize versions.')
  process.exit(1)
}

console.log(`Version check passed: all MDView version files use ${expectedVersion}.`)

async function readJsonVersion(path, label = `${path} version`) {
  const json = JSON.parse(await readFile(path, 'utf8'))
  return requiredVersion(json.version, label)
}

async function readPackageLockWorkspaceVersion() {
  const json = JSON.parse(await readFile('package-lock.json', 'utf8'))
  return requiredVersion(json.packages?.['']?.version, 'package-lock.json workspace version')
}

async function readTextVersion(path, pattern, label) {
  const match = (await readFile(path, 'utf8')).match(pattern)
  return requiredVersion(match?.[1], label)
}

function requiredVersion(version, label) {
  if (typeof version !== 'string' || !version) throw new Error(`Unable to read ${label}.`)
  return { label, version }
}
