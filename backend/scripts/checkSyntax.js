const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const rootDir = path.resolve(__dirname, '..')
const skipDirs = new Set(['node_modules', 'uploads'])

function collectJsFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        collectJsFiles(path.join(dir, entry.name), files)
      }
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path.join(dir, entry.name))
    }
  }
  return files
}

const files = collectJsFiles(rootDir)
let hasError = false

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: rootDir,
    encoding: 'utf8'
  })

  if (result.status !== 0) {
    hasError = true
    console.error(result.stderr || result.stdout)
  }
}

if (hasError) {
  process.exit(1)
}

console.log(`Syntax check passed for ${files.length} backend JS file(s).`)
