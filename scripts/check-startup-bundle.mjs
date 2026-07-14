import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = resolve(rootDirectory, 'dist')
const indexHtml = readFileSync(resolve(distDirectory, 'index.html'), 'utf8')
const startupAssetPattern = /<(?:script|link)\b[^>]*(?:src|href)="\/assets\/([^"]+\.js)"/g
const startupAssets = [...indexHtml.matchAll(startupAssetPattern)].map((match) => match[1])
const maximumStartupBytes = 550 * 1024
const deferredAssetPattern = /(markdown|mermaid|cytoscape|katex|exportdocx|exporthtml)/i

if (startupAssets.length === 0) {
  throw new Error('No startup JavaScript assets were found in dist/index.html.')
}

const uniqueStartupAssets = [...new Set(startupAssets)]
const deferredStartupAssets = uniqueStartupAssets.filter((asset) => deferredAssetPattern.test(asset))
const startupBytes = uniqueStartupAssets.reduce(
  (total, asset) => total + statSync(resolve(distDirectory, 'assets', asset)).size,
  0,
)

if (deferredStartupAssets.length > 0) {
  throw new Error(`Deferred assets were included in the startup bundle: ${deferredStartupAssets.join(', ')}`)
}

if (startupBytes > maximumStartupBytes) {
  throw new Error(
    `Startup JavaScript is ${(startupBytes / 1024).toFixed(1)} KB, exceeding the ${(maximumStartupBytes / 1024).toFixed(0)} KB budget.`,
  )
}

console.log(
  `Startup bundle check passed: ${(startupBytes / 1024).toFixed(1)} KB across ${uniqueStartupAssets.length} JavaScript assets.`,
)
