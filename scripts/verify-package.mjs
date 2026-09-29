import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const requiredFiles = [
  'document-viewer-vue3/document-viewer-vue3.js',
  'document-viewer-vue3/document-viewer-vue3.umd.cjs',
  'document-viewer-vue3/style.css',
  'document-viewer-vue3/types/index.d.ts',
  'document-viewer-vue3/README.md',
  'dist-examples/index.html',
  'docs/.vitepress/dist/index.html',
]

await Promise.all(requiredFiles.map(file => access(resolve(root, file))))

const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
if (packageJson.private === true) {
  throw new Error('package.json must not be private when preparing an npm package.')
}

for (const exportPath of ['.', './style.css']) {
  if (!packageJson.exports?.[exportPath]) {
    throw new Error(`Missing package export: ${exportPath}`)
  }
}

for (const forbidden of [
  '@file-viewer/core',
  '@file-viewer/doc',
  '@file-viewer/ppt',
  '@file-viewer/vue3',
  '@file-viewer/vue3-full',
]) {
  if (
    packageJson.dependencies?.[forbidden] ||
    packageJson.peerDependencies?.[forbidden] ||
    packageJson.devDependencies?.[forbidden]
  ) {
    throw new Error(`Forbidden package dependency found: ${forbidden}`)
  }
}

if (Object.keys(packageJson.dependencies || {}).length > 0) {
  throw new Error('The published package should remain self-contained and have no production dependencies.')
}

const library = await import(pathToFileURL(resolve(
  root,
  'document-viewer-vue3/document-viewer-vue3.js',
)).href)
for (const extension of ['doc', 'dot', 'docx', 'pdf', 'pptx', 'xls', 'xlsx']) {
  if (!library.DOCUMENT_VIEWER_EXTENSIONS?.includes(extension)) {
    throw new Error(`Missing required document extension: ${extension}`)
  }
}

console.log(`[document-viewer] verified ${requiredFiles.length} build files and dependency isolation`)
