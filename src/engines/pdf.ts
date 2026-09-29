import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import type { DocumentRenderer } from '../types'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export const renderPdfDocument: DocumentRenderer = async ({
  buffer,
  container,
  signal,
  onProgress,
}) => {
  container.classList.add('document-renderer', 'document-renderer--pdf')
  let loadingTask: PDFDocumentLoadingTask | null = getDocument({ data: new Uint8Array(buffer) })
  let pdf: PDFDocumentProxy | null = null

  const abort = () => {
    void loadingTask?.destroy()
  }
  signal.addEventListener('abort', abort, { once: true })

  try {
    pdf = await loadingTask.promise
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')
      onProgress({
        current: pageNumber - 1,
        total: pdf.numPages,
        label: `正在渲染 PDF 第 ${pageNumber}/${pdf.numPages} 页`,
      })

      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.35 })
      const pixelRatio = Math.min(2, globalThis.devicePixelRatio || 1)
      const pageShell = container.ownerDocument.createElement('section')
      const canvas = container.ownerDocument.createElement('canvas')
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('当前浏览器无法创建 PDF Canvas。')

      pageShell.className = 'document-pdf-page'
      pageShell.dataset.page = String(pageNumber)
      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      canvas.style.width = `${viewport.width}px`
      canvas.style.height = `${viewport.height}px`
      pageShell.style.width = `${viewport.width}px`
      pageShell.appendChild(canvas)
      container.appendChild(pageShell)

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      }).promise
      page.cleanup()
    }

    onProgress({ current: pdf.numPages, total: pdf.numPages, label: 'PDF 已就绪' })
    const pageCount = pdf.numPages
    return {
      pageCount,
      async destroy() {
        signal.removeEventListener('abort', abort)
        await loadingTask?.destroy().catch(() => undefined)
        loadingTask = null
        pdf = null
        container.replaceChildren()
        container.classList.remove('document-renderer', 'document-renderer--pdf')
      },
    }
  } catch (error) {
    signal.removeEventListener('abort', abort)
    await loadingTask?.destroy().catch(() => undefined)
    throw error
  }
}
