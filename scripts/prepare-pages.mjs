import { access, cp, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const examplesOutput = resolve(root, 'dist-examples')
const docsOutput = resolve(root, 'docs/.vitepress/dist')
const docsDestination = resolve(examplesOutput, 'docs')

await Promise.all([
  access(resolve(examplesOutput, 'index.html')),
  access(resolve(docsOutput, 'index.html')),
])

await cp(docsOutput, docsDestination, { recursive: true })
await writeFile(resolve(examplesOutput, '.nojekyll'), '')

console.log('[document-viewer] assembled GitHub Pages output in dist-examples')
