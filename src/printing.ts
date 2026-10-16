const frames = new WeakMap<Document, HTMLIFrameElement>()

const PRINT_CSS = `
@page { size: A4; margin: 0; }
html, body { display: block !important; position: static !important; margin: 0 !important; padding: 0 !important; width: auto !important; min-width: 0 !important; max-width: none !important; height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; transform: none !important; zoom: 1 !important; }
.document-viewer-print-root, .document-viewer-print-root * { visibility: visible !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.document-viewer-print-root { display: block !important; position: static !important; width: auto !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; border: 0 !important; border-radius: 0 !important; background: #fff !important; zoom: 1 !important; --document-viewer-zoom: 1; --document-viewer-page-padding: 0px; --document-viewer-page-gap: 0px; }
.document-viewer-print-root .document-viewer__content { height: auto !important; min-height: 0 !important; overflow: visible !important; zoom: 1 !important; }
.document-viewer-print-root[data-paged], .document-viewer-print-root[data-paged] :is(.document-viewer__content, .document-viewer-docx-wrapper, .docx-wrapper, .msdoc-stage, .document-image-stage) { display: contents !important; }
.document-viewer-print-root :is(.document-viewer__toolbar, .document-viewer__loading, .document-image-lightbox, .document-workbook__tabs) { display: none !important; }
.document-viewer-print-sheet { position: relative; display: block; margin: 0 !important; padding: 0 !important; border: 0 !important; overflow: hidden; box-sizing: border-box; break-inside: avoid; break-after: page; background: #fff; }
.document-viewer-print-sheet:last-child { break-after: auto; }
.document-viewer-print-sheet > * { position: absolute !important; top: 0 !important; left: 0 !important; margin: 0 !important; box-shadow: none !important; outline: none !important; break-after: auto !important; break-before: auto !important; transform-origin: 0 0 !important; }
`

export interface PreparedDocumentPrint {
  frame: HTMLIFrameElement
  window: Window
  dispose(): void
}

async function waitForResources(document: Document, links: Promise<void>[]) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      (async () => {
        await Promise.all(links)
        await Promise.allSettled([
          document.fonts.ready,
          ...Array.from(document.images, image => image.decode()),
        ])
      })(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('打印资源加载超时。')), 15000)
      }),
    ])
  } finally {
    clearTimeout(timeout)
  }
}

/** Prepare an isolated snapshot; canvas pixels are not copied by cloneNode(). */
export async function prepareDocumentPrint(container: HTMLElement): Promise<PreparedDocumentPrint> {
  const owner = container.ownerDocument
  frames.get(owner)?.remove()
  const frame = owner.createElement('iframe')
  frame.dataset.documentViewerPrint = 'true'
  frame.title = '文档打印'
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;left:-100000px;top:0;width:1200px;height:900px;border:0;pointer-events:none'
  frames.set(owner, frame)
  const dispose = () => {
    frame.remove()
    if (frames.get(owner) === frame) frames.delete(owner)
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('文档打印页面创建超时。')), 10000)
      frame.addEventListener('load', () => { clearTimeout(timeout); resolve() }, { once: true })
      frame.addEventListener('error', () => {
        clearTimeout(timeout)
        reject(new Error('无法创建文档打印页面。'))
      }, { once: true })
      frame.src = 'about:blank'
      owner.body.append(frame)
    })
    const document = frame.contentDocument
    const printWindow = frame.contentWindow
    if (!document || !printWindow) throw new Error('无法访问文档打印页面。')

    document.title = ''
    const base = document.createElement('base')
    base.href = owner.baseURI
    document.head.append(base)

    const links: Promise<void>[] = []
    for (const source of [
      ...owner.head.querySelectorAll('style, link[rel="stylesheet"]'),
      ...container.querySelectorAll('style, link[rel="stylesheet"]'),
    ]) {
      const copy = source.cloneNode(true) as HTMLStyleElement | HTMLLinkElement
      if (copy.tagName === 'LINK') {
        const link = copy as HTMLLinkElement
        link.href = (source as HTMLLinkElement).href
        links.push(new Promise<void>((resolve, reject) => {
          link.addEventListener('load', () => resolve(), { once: true })
          link.addEventListener('error', () => reject(new Error('打印样式加载失败。')), { once: true })
        }))
      }
      document.head.append(copy)
    }

    const root = document.createElement('main')
    root.className = 'document-viewer document-viewer-print-root'
    const inherited = owner.defaultView!.getComputedStyle(container)
    root.style.font = inherited.font
    root.style.letterSpacing = inherited.letterSpacing
    root.style.wordSpacing = inherited.wordSpacing
    root.style.direction = inherited.direction
    const copy = container.cloneNode(true) as HTMLElement
    // Styles belong in the print head, ahead of the final print overrides.
    copy.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => style.remove())
    root.append(copy)
    document.body.append(root)

    const sourceCanvases = container.querySelectorAll('canvas')
    const copiedCanvases = copy.querySelectorAll('canvas')
    sourceCanvases.forEach((canvas, index) => {
      const target = copiedCanvases[index]
      const context = target?.getContext('2d')
      if (!target || !context) throw new Error('无法复制文档打印画布。')
      target.width = canvas.width
      target.height = canvas.height
      context.drawImage(canvas, 0, 0)
    })

    const pageSelector = '.document-page, .document-slide, .document-image-frame'
    const sourcePages = Array.from(container.querySelectorAll<HTMLElement>(pageSelector))
    const copiedPages = Array.from(copy.querySelectorAll<HTMLElement>(pageSelector))
    const rules: string[] = [PRINT_CSS]
    if (sourcePages.length) root.dataset.paged = 'true'
    sourcePages.forEach((page, index) => {
      const target = copiedPages[index]!
      const style = owner.defaultView!.getComputedStyle(page)
      const width = Number.parseFloat(style.width) || page.offsetWidth
      const height = Number.parseFloat(style.height) || page.offsetHeight
      const paperWidth = Number(page.dataset.printWidth) || width
      const paperHeight = Number(page.dataset.printHeight) || height
      if (width <= 0 || height <= 0 || paperWidth <= 0 || paperHeight <= 0) {
        throw new Error('无法读取文档打印页面尺寸。')
      }

      const name = `document-viewer-page-${index + 1}`
      rules.push(`@page ${name} { size: ${paperWidth}px ${paperHeight}px; margin: 0; }`)
      const sheet = document.createElement('section')
      sheet.className = 'document-viewer-print-sheet'
      sheet.style.page = name
      sheet.style.width = `${paperWidth}px`
      sheet.style.height = `${paperHeight}px`
      target.replaceWith(sheet)
      sheet.append(target)
      target.style.width = `${width}px`
      target.style.height = `${height}px`
      target.style.minHeight = '0'
      target.style.maxWidth = 'none'
      target.style.transform = `scale(${Math.min(paperWidth / width, paperHeight / height)})`
    })

    const style = document.createElement('style')
    style.dataset.documentViewerPrint = 'true'
    style.textContent = rules.join('\n')
    document.head.append(style)
    await waitForResources(document, links)
    if (!frame.isConnected) throw new Error('打印任务已被新的打印任务替换。')
    return { frame, window: printWindow, dispose }
  } catch (error) {
    dispose()
    throw error
  }
}

export async function printDocument(container: HTMLElement): Promise<void> {
  const prepared = await prepareDocumentPrint(container)
  prepared.window.addEventListener('afterprint', () => {
    setTimeout(prepared.dispose, 0)
  }, { once: true })
  try {
    prepared.window.focus()
    prepared.window.print()
  } catch (error) {
    prepared.dispose()
    throw error
  }
}
