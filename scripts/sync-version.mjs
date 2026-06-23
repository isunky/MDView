import { readFile, writeFile } from 'node:fs/promises'

const versionInput = process.argv[2]?.trim()
const version = versionInput?.replace(/^v/, '')

if (!version || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  console.error('Usage: npm run version:sync -- <major.minor.patch>')
  console.error('Example: npm run version:sync -- 1.4.1')
  process.exit(1)
}

const files = [
  updateJson('package.json', (json) => {
    json.version = version
  }),
  updateJson('package-lock.json', (json) => {
    json.version = version
    if (json.packages?.['']) {
      json.packages[''].version = version
    }
  }),
  updateText('src-tauri/Cargo.toml', (content) =>
    replaceRequired(
      content,
      /(\[package\][\s\S]*?\nversion\s*=\s*)"[^"]+"/,
      `$1"${version}"`,
      'src-tauri/Cargo.toml package version',
    ),
  ),
  updateText('src-tauri/Cargo.lock', (content) =>
    replaceRequired(
      content,
      /(\[\[package\]\]\r?\nname = "mdview"\r?\nversion = )"[^"]+"/,
      `$1"${version}"`,
      'src-tauri/Cargo.lock package version',
    ),
  ),
  updateText('src-tauri/tauri.conf.json', (content) =>
    replaceRequired(
      content,
      /"version":\s*"[^"]+"/,
      `"version": "${version}"`,
      'src-tauri/tauri.conf.json version',
    ),
  ),
  updateText('src/appInfo.ts', (content) =>
    replaceRequired(
      content,
      /version:\s*'[^']+'/,
      `version: '${version}'`,
      'src/appInfo.ts version',
    ),
  ),
  updateText('README.md', (content) => {
    let nextContent = content
    nextContent = replaceRequired(
      nextContent,
      /(<strong>Version \/ 版本：<\/strong>)[0-9]+\.[0-9]+\.[0-9]+/,
      `$1${version}`,
      'README header version',
    )
    nextContent = replaceRequired(
      nextContent,
      /(\| 当前版本 \| )[0-9]+\.[0-9]+\.[0-9]+( \|)/,
      `$1${version}$2`,
      'README Chinese version row',
    )
    nextContent = replaceRequired(
      nextContent,
      /(\| (?:Current version|Version) \| )[0-9]+\.[0-9]+\.[0-9]+( \|)/,
      `$1${version}$2`,
      'README English version row',
    )
    return nextContent
  }),
]

await Promise.all(files)

console.log(`Synchronized MDView version to ${version}`)

async function updateJson(path, mutate) {
  const content = await readFile(path, 'utf8')
  const eol = detectEol(content)
  const json = JSON.parse(content)
  mutate(json)
  await writeFile(path, withEol(`${JSON.stringify(json, null, 2)}\n`, eol))
}

async function updateText(path, transform) {
  const content = await readFile(path, 'utf8')
  const eol = detectEol(content)
  await writeFile(path, withEol(transform(content), eol))
}

function replaceRequired(content, pattern, replacement, label) {
  if (!pattern.test(content)) {
    throw new Error(`Unable to update ${label}`)
  }

  return content.replace(pattern, replacement)
}

function detectEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n'
}

function withEol(content, eol) {
  return content.replace(/\r?\n/g, eol)
}
