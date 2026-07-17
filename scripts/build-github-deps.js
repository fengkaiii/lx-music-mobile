/**
 * GitHub 直装依赖的 prepare 常被跳过，导致缺 lib/ 产物、Metro 红屏。
 * 在 postinstall 里按需补建。
 */
const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { execSync } = require('node:child_process')

const root = join(__dirname, '..')
const nm = join(root, 'node_modules')

const packages = [
  {
    name: 'react-native-track-player',
    entry: 'lib/index.js',
    build: 'npm run build',
  },
  {
    name: 'react-native-file-system',
    entry: 'lib/commonjs/index.js',
    // 固定较旧 bob，避免新版本对 Node 版本要求过高
    build: 'npx --yes react-native-builder-bob@0.20.0 build',
  },
  {
    name: 'react-native-local-media-metadata',
    entry: 'lib/commonjs/index.js',
    build: 'npx --yes react-native-builder-bob@0.20.0 build',
  },
]

for (const pkg of packages) {
  const dir = join(nm, pkg.name)
  const entry = join(dir, pkg.entry)
  if (!existsSync(dir)) {
    console.log(`[build-github-deps] skip ${pkg.name} (not installed)`)
    continue
  }
  if (existsSync(entry)) {
    console.log(`[build-github-deps] ok ${pkg.name}`)
    continue
  }
  console.log(`[build-github-deps] building ${pkg.name} ...`)
  execSync(pkg.build, { cwd: dir, stdio: 'inherit' })
}

console.log('[build-github-deps] done')
