const PAGE_SELECTOR = 'section.document-viewer-docx, section.docx, .msdoc-page'
const BODY_CLASS = 'document-word-page-body'
const FIT_TOLERANCE = 1

interface Boundary { node: Node; offset: number }

function assertActive(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')
}

async function waitForAssets(container: HTMLElement, signal: AbortSignal) {
  assertActive(signal)
  let timeout: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  try {
    await Promise.race([
      Promise.allSettled([
        container.ownerDocument.fonts.ready,
        ...Array.from(container.querySelectorAll('img'), image => image.decode()),
      ]),
      new Promise<void>(resolve => { timeout = setTimeout(resolve, 5000) }),
      new Promise<never>((_, reject) => {
        abort = () => reject(new DOMException('Document load aborted', 'AbortError'))
        signal.addEventListener('abort', abort, { once: true })
      }),
    ])
  } finally {
    clearTimeout(timeout)
    if (abort) signal.removeEventListener('abort', abort)
  }
  assertActive(signal)
}

function clearIds(element: HTMLElement) {
  element.removeAttribute('id')
  element.querySelectorAll('[id]').forEach(child => child.removeAttribute('id'))
}

function fragmentAt(source: HTMLElement, boundary: Boundary, tail: boolean): HTMLElement {
  const range = source.ownerDocument.createRange()
  range.selectNodeContents(source)
  if (tail) range.setStart(boundary.node, boundary.offset)
  else range.setEnd(boundary.node, boundary.offset)
  const fragment = source.cloneNode(false) as HTMLElement
  fragment.append(range.cloneContents())
  if (tail) {
    // A paragraph continued on the next page must not restart its list marker.
    const paragraph = boundary.node.parentElement?.closest('p')
    if (paragraph && (source === paragraph || source.contains(paragraph))) {
      const continuation = fragment.matches('p') ? fragment : fragment.querySelector('p')
      continuation?.classList.add('document-word-paragraph-continuation')
    }
    const originalTables = source.matches('table') ? [source] : Array.from(source.querySelectorAll('table'))
    const tailTables = fragment.matches('table') ? [fragment] : Array.from(fragment.querySelectorAll('table'))
    // Column definitions and repeating headers are outside the remaining range.
    const originalTable = originalTables.find(table => table.contains(boundary.node))
    const tailTable = tailTables[0]
    if (originalTable && tailTable) {
      for (const child of Array.from(originalTable.children).reverse()) {
        if ((child.tagName === 'COLGROUP' || child.tagName === 'THEAD') &&
            !tailTable.querySelector(`:scope > ${child.tagName.toLowerCase()}`)) {
          tailTable.prepend(child.cloneNode(true))
        }
      }
    }
  }
  return fragment
}

function fits(body: HTMLElement): boolean {
  return body.scrollHeight <= body.clientHeight + FIT_TOLERANCE
}

function trimEmptyOverflow(body: HTMLElement) {
  // A break at the start of a run can leave an empty paragraph at the end
  // of the preceding page. It must not create another blank paper by itself.
  for (const article of Array.from(body.children).reverse()) {
    if (!article.matches('article, .msdoc-root')) continue
    while (!fits(body)) {
      const last = article.lastElementChild
      if (!last?.matches('p') || last.textContent?.trim() || last.id ||
          last.querySelector('[id], img, svg, canvas, video, audio, iframe, object, br, hr')) break
      const style = body.ownerDocument.defaultView!.getComputedStyle(last)
      if (style.backgroundImage !== 'none' ||
          !['transparent', 'rgba(0, 0, 0, 0)'].includes(style.backgroundColor) ||
          [style.borderTopWidth, style.borderBottomWidth, style.borderLeftWidth, style.borderRightWidth]
            .some(width => Number.parseFloat(width) > 0)) break
      last.remove()
    }
    if (fits(body)) break
  }
}

function trySplit(source: HTMLElement, body: HTMLElement, splitText: boolean): [HTMLElement, HTMLElement] | null {
  const after = (node: Node): Boundary => ({
    node: node.parentNode!, offset: Array.prototype.indexOf.call(node.parentNode!.childNodes, node) + 1,
  })
  const findBoundary = (length: number, at: (index: number) => Boundary): Boundary | null => {
    let low = 0
    let high = length - 1
    let result: Boundary | null = null
    while (low <= high) {
      const middle = Math.floor((low + high) / 2)
      const boundary = at(middle)
      const prefix = fragmentAt(source, boundary, false)
      source.replaceWith(prefix)
      const fitting = fits(body)
      prefix.replaceWith(source)
      if (fitting) { result = boundary; low = middle + 1 }
      else high = middle - 1
    }
    return result
  }

  const children = Array.from(source.children)
  const rows = source.matches('table')
    ? Array.from((source as HTMLTableElement).rows).filter(row => row.parentElement?.tagName !== 'THEAD')
    : []
  const blocks = rows.length ? rows : children
  let boundary = findBoundary(Math.max(0, blocks.length - 1), index => after(blocks[index]!))

  if (!boundary && splitText) {
    // If the first block is itself a long table, prefer complete rows.
    const firstTable = source.matches('table') ? source : source.firstElementChild
    if (firstTable?.matches('table')) {
      const tableRows = Array.from((firstTable as HTMLTableElement).rows)
        .filter(row => row.parentElement?.tagName !== 'THEAD')
      boundary = findBoundary(Math.max(0, tableRows.length - 1), index => after(tableRows[index]!))
    }
    if (!boundary) {
      const walker = source.ownerDocument.createTreeWalker(source, NodeFilter.SHOW_TEXT)
      const texts: Text[] = []
      let length = 0
      while (walker.nextNode()) {
        const text = walker.currentNode as Text
        texts.push(text)
        length += text.length
      }
      boundary = findBoundary(Math.max(0, length - 1), index => {
        let offset = index + 1
        for (const text of texts) {
          if (offset <= text.length) {
            // Keep UTF-16 surrogate pairs together.
            if (offset > 0 && /[\uD800-\uDBFF]/.test(text.data[offset - 1]!) && offset < text.length) offset -= 1
            return { node: text, offset }
          }
          offset -= text.length
        }
        return { node: source, offset: 0 }
      })
    }
  }

  if (!boundary) return null
  const head = fragmentAt(source, boundary, false)
  const tail = fragmentAt(source, boundary, true)
  if (!head.textContent?.trim() && !head.querySelector('p,li,img,svg,table,br')) return null
  if (!tail.textContent?.trim() && !tail.querySelector('p,li,img,svg,table,br')) return null
  const headIds = new Set([head, ...head.querySelectorAll('[id]')].map(element => element.id).filter(Boolean))
  for (const element of [tail, ...tail.querySelectorAll('[id]')]) {
    if (headIds.has(element.id)) element.removeAttribute('id')
  }
  return [head, tail]
}

function preparePage(page: HTMLElement) {
  const view = page.ownerDocument.defaultView!
  const legacyRoot = page.querySelector<HTMLElement>(':scope > .msdoc-root')
  if (legacyRoot) {
    const rootStyle = view.getComputedStyle(legacyRoot)
    page.style.padding = rootStyle.padding
    legacyRoot.style.padding = '0'
    legacyRoot.style.minHeight = '0'
    legacyRoot.style.width = 'auto'
  }
  const pageHeight = view.getComputedStyle(page).minHeight
  page.style.height = Number.parseFloat(pageHeight) > 0 ? pageHeight : '1123px'
  page.classList.add('document-page', 'document-word-page')
  const body = page.ownerDocument.createElement('div')
  body.className = BODY_CLASS
  for (const node of Array.from(page.children)) {
    if (node.tagName !== 'HEADER' && node.tagName !== 'FOOTER') body.append(node)
  }
  page.insertBefore(body, page.querySelector(':scope > footer'))
  return body
}

async function paginatePage(page: HTMLElement, signal: AbortSignal) {
  const body = preparePage(page)
  trimEmptyOverflow(body)
  if (fits(body) || body.clientHeight < 1) return

  const pending = Array.from(body.children) as HTMLElement[]
  const template = page.cloneNode(true) as HTMLElement
  template.querySelector(`.${BODY_CLASS}`)!.replaceChildren()
  clearIds(template)
  body.replaceChildren()
  let currentPage = page
  let currentBody = body
  let iterations = 0
  const nextPage = () => {
    const next = template.cloneNode(true) as HTMLElement
    currentPage.after(next)
    currentPage = next
    currentBody = next.querySelector<HTMLDivElement>(`.${BODY_CLASS}`)!
  }

  while (pending.length) {
    if (++iterations % 20 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    assertActive(signal)
    const block = pending.shift()!
    const hasPreviousContent = currentBody.childElementCount > 0
    currentBody.append(block)
    if (fits(currentBody)) continue

    const split = trySplit(block, currentBody, !hasPreviousContent)
    if (split) {
      block.replaceWith(split[0])
      pending.unshift(split[1])
      nextPage()
    } else if (hasPreviousContent) {
      block.remove()
      pending.unshift(block)
      nextPage()
    } else {
      // A single unbreakable object (for example a full-page image) must fit
      // inside the paper instead of being clipped or creating empty pages.
      const ratio = currentBody.clientHeight / Math.max(1, currentBody.scrollHeight)
      block.style.zoom = String(Math.min(1, ratio))
    }
  }
}

/** Convert overflowing Word flow sections into separate paper elements. */
export async function paginateWordDocument(container: HTMLElement, signal: AbortSignal): Promise<number> {
  await waitForAssets(container, signal)
  const wrapper = container.querySelector<HTMLElement>('.document-viewer-docx-wrapper, .docx-wrapper, .msdoc-stage')
  if (!wrapper) return 1

  // Measure independently of viewer zoom and hidden parent tabs/dialogs.
  const host = container.ownerDocument.createElement('div')
  host.className = 'document-viewer document-renderer document-renderer--word'
  if (container.classList.contains('document-renderer--doc')) host.classList.add('document-renderer--doc')
  host.style.cssText = 'position:absolute;left:-100000px;top:0;width:1000px;height:auto;min-height:0;visibility:hidden;overflow:visible;pointer-events:none;zoom:1'
  const inheritedStyle = container.ownerDocument.defaultView!.getComputedStyle(container)
  host.style.font = inheritedStyle.font
  host.style.letterSpacing = inheritedStyle.letterSpacing
  host.style.wordSpacing = inheritedStyle.wordSpacing
  host.style.direction = inheritedStyle.direction
  container.ownerDocument.body.append(host)
  host.append(wrapper)
  try {
    for (const page of Array.from(wrapper.querySelectorAll<HTMLElement>(`:scope > ${PAGE_SELECTOR.replaceAll(', ', ', :scope > ')}`))) {
      assertActive(signal)
      await paginatePage(page, signal)
    }
  } finally {
    if (!signal.aborted) container.append(wrapper)
    host.remove()
  }

  assertActive(signal)
  const pages = Array.from(wrapper.querySelectorAll<HTMLElement>(PAGE_SELECTOR))
  pages.forEach((page, index) => {
    page.dataset.page = String(index + 1)
    page.setAttribute('role', 'group')
    page.setAttribute('aria-label', `第 ${index + 1} 页，共 ${pages.length} 页`)
  })
  return Math.max(1, pages.length)
}
