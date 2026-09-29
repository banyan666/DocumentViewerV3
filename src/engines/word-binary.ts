import createDOMPurify from 'dompurify'
import type { WindowLike } from 'dompurify'

import type { DocumentRenderer } from '../types'
import { parseMsDoc } from './legacy-doc/msdoc/parser'
import { defaultMsDocCss, renderMsDoc } from './legacy-doc/render/html'

const PAGE_BREAK_MARKER = '<span class="msdoc-page-break"></span>'
const EMPTY_PAGE_HTML = '<p class="msdoc-paragraph"><br></p>'

function splitIntoPages(html: string): string[] {
  const normalized = html.replace(
    /<(p|table|section)([^>]*?)style="([^"]*?\bbreak-before\s*:\s*page;?[^"]*?)"([^>]*)>/gi,
    match => `${PAGE_BREAK_MARKER}${match}`,
  )
  return normalized.split(PAGE_BREAK_MARKER)
}

export const renderBinaryWordDocument: DocumentRenderer = async ({
  buffer,
  container,
  signal,
  onProgress,
}) => {
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')

  container.classList.add('document-renderer', 'document-renderer--word', 'document-renderer--doc')
  onProgress({ current: 0, total: 1, label: '正在解析旧版 Word 文档' })

  const parsed = parseMsDoc(buffer)
  const rendered = renderMsDoc(parsed, {
    reviewMode: 'all',
    externalLinkPolicy: 'block',
    externalResourcePolicy: 'block',
    css: defaultMsDocCss(),
  })
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')

  const targetWindow = container.ownerDocument.defaultView
  if (!targetWindow) throw new Error('DOC 预览容器必须属于浏览器文档。')
  const purifier = createDOMPurify(targetWindow as unknown as WindowLike)
  const pages = splitIntoPages(rendered.html)
  const style = container.ownerDocument.createElement('style')
  style.dataset.msdoc = 'true'
  style.textContent = rendered.css
  const stage = container.ownerDocument.createElement('div')
  stage.className = 'msdoc-stage'

  for (const pageHtml of pages) {
    const page = container.ownerDocument.createElement('section')
    page.className = 'msdoc-page'
    const root = container.ownerDocument.createElement('div')
    root.className = 'msdoc-root'
    const sanitized = purifier.sanitize(pageHtml || EMPTY_PAGE_HTML, {
      RETURN_DOM_FRAGMENT: true,
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script', 'style', 'template'],
      FORBID_ATTR: ['action', 'formaction', 'srcdoc'],
    }) as DocumentFragment
    root.append(sanitized)
    page.append(root)
    stage.append(page)
  }

  container.replaceChildren(style, stage)
  onProgress({ current: 1, total: 1, label: '旧版 Word 文档已就绪' })

  return {
    pageCount: Math.max(1, pages.length),
    destroy() {
      container.replaceChildren()
      container.classList.remove(
        'document-renderer',
        'document-renderer--word',
        'document-renderer--doc',
      )
    },
  }
}
