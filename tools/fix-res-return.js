// tools/fix-res-returns.js
// Safe replacer: backs up pages -> pages.bak, then replaces common patterns
// that return res.* calls with calling res.* and then `return;` on the next line.

const fs = require('fs')
const path = require('path')

const root = process.cwd()
const pagesDir = path.join(root, 'pages')
const backupDir = path.join(root, 'pages.bak')

// backup pages
if (!fs.existsSync(backupDir)) {
  console.log('Creating backup of pages -> pages.bak')
  copyDir(pagesDir, backupDir)
} else {
  console.log('Backup already exists at pages.bak — skipping backup step')
}

const apiDir = path.join(pagesDir, 'api')
if (!fs.existsSync(apiDir)) {
  console.error('No pages/api directory found. Exiting.')
  process.exit(1)
}

const files = fs.readdirSync(apiDir).filter(f => f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.tsx'))
if (files.length === 0) {
  console.error('No API files found in pages/api. Exiting.')
  process.exit(1)
}

console.log('Files to check:', files.join(', '))

const patterns = [
  // return res.status(...).json(...);
  { re: /return\s+(res\.status\([^\)]*\)\.json\([^\)]*\)\s*;)/g, repl: '$1\n  return;' },
  // return res.status(...).end(...);
  { re: /return\s+(res\.status\([^\)]*\)\.end\([^\)]*\)\s*;)/g, repl: '$1\n  return;' },
  // return res.status(...).send(...);
  { re: /return\s+(res\.status\([^\)]*\)\.send\([^\)]*\)\s*;)/g, repl: '$1\n  return;' },
  // return res.json(...);
  { re: /return\s+(res\.json\([^\)]*\)\s*;)/g, repl: '$1\n  return;' },
  // return res.send(...);
  { re: /return\s+(res\.send\([^\)]*\)\s*;)/g, repl: '$1\n  return;' },
  // return res.end(...);
  { re: /return\s+(res\.end\([^\)]*\)\s*;)/g, repl: '$1\n  return;' }
]

files.forEach(file => {
  const full = path.join(apiDir, file)
  let src = fs.readFileSync(full, 'utf8')
  let changed = false

  patterns.forEach(p => {
    const newSrc = src.replace(p.re, p.repl)
    if (newSrc !== src) {
      changed = true
      src = newSrc
    }
  })

  if (changed) {
    fs.writeFileSync(full, src, 'utf8')
    console.log('Patched', file)
  } else {
    console.log('No changes for', file)
  }
})

console.log('Done. Please restart dev server: npm run dev')

// helper: copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (let e of entries) {
    const srcPath = path.join(src, e.name)
    const destPath = path.join(dest, e.name)
    if (e.isDirectory()) copyDir(srcPath, destPath)
    else fs.copyFileSync(srcPath, destPath)
  }
}
