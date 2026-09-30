import { renderAsync } from 'docx-preview'

import type { DocumentRenderer } from '../types'

type WordContainer = 'openxml' | 'wordml' | 'binary'

function resolveWordContainer(buffer: ArrayBuffer): WordContainer {
  if (buffer.byteLength < 2) return 'binary'
  const bytes = new Uint8Array(buffer, 0, 2)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'openxml'

  const prefix = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 8192))
  const utf16le = (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0x3c && bytes[1] === 0)
  const utf16be = (bytes[0] === 0xfe && bytes[1] === 0xff) ||
    (bytes[0] === 0 && bytes[1] === 0x3c)
  const text = new TextDecoder(
    utf16le ? 'utf-16le' : utf16be ? 'utf-16be' : 'utf-8',
  ).decode(prefix)

  return /<(?:[\w.-]+:)?wordDocument(?:\s|>)/.test(text) &&
    text.includes('http://schemas.microsoft.com/office/word/2003/wordml')
    ? 'wordml'
    : 'binary'
}

export const renderWordDocument: DocumentRenderer = async ({
  buffer,
  container,
  extension,
  signal,
  onProgress,
}) => {
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')

  container.classList.add('document-renderer', 'document-renderer--word')
  onProgress({ current: 0, total: 1, label: '正在解析 Word 文档' })

  if (extension === 'doc' || extension === 'dot') {
    const wordContainer = resolveWordContainer(buffer)
    if (wordContainer === 'binary') {
      const { renderBinaryWordDocument } = await import('./word-binary')
      return renderBinaryWordDocument({
        buffer,
        container,
        extension,
        filename: '',
        signal,
        options: {},
        onProgress,
      })
    }
    if (wordContainer === 'wordml') {
      const { convertWordMlToDocx } = await import('./word-ml')
      buffer = await convertWordMlToDocx(buffer, container)
    }
  }

  await renderAsync(buffer, container, undefined, {
    className: 'document-viewer-docx',
    inWrapper: true,
    breakPages: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    useBase64URL: true,
    trimXmlDeclaration: true,
  })

  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')
  const pageCount = Math.max(
    1,
    container.querySelectorAll('section.document-viewer-docx > article').length ||
      container.querySelectorAll('section.document-viewer-docx').length ||
      container.querySelectorAll('section.docx > article').length ||
      container.querySelectorAll('section.docx').length,
  )
  onProgress({ current: 1, total: 1, label: 'Word 文档已就绪' })

  return {
    pageCount,
    destroy() {
      container.replaceChildren()
      container.classList.remove('document-renderer', 'document-renderer--word')
    },
  }
}
