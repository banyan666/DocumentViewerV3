import type { DocumentRenderer } from '../types'

const MAX_TIFF_SOURCE_BYTES = 32 * 1024 * 1024
const MAX_TIFF_PAGES = 64
const MAX_TIFF_DIMENSION = 16_384
const MAX_TIFF_PAGE_PIXELS = 32_000_000
const MAX_TIFF_TOTAL_PIXELS = 128_000_000

const imageMimeTypes: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  ico: 'image/x-icon',
  jxl: 'image/jxl',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
}

type TiffIfd = Record<string, unknown>

interface UtifModule {
  decode(buffer: ArrayBuffer): TiffIfd[]
  decodeImage(buffer: ArrayBuffer, ifd: TiffIfd): void
  toRGBA8(ifd: TiffIfd): Uint8Array
}

interface ImagePage {
  frame: HTMLDivElement
  image: HTMLImageElement
  objectUrl: string
  width: number
  height: number
}

const normalizeRotation = (rotation: number) => (
  ((Math.round(rotation / 90) * 90) % 360 + 360) % 360
)

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')
}

const hasTiffSignature = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer, 0, 4)
  return (
    (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00)
    || (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a)
  )
}

const firstNumber = (value: unknown) => {
  if (Array.isArray(value)) return Number(value[0])
  if (ArrayBuffer.isView(value)) return Number((value as unknown as ArrayLike<number>)[0])
  return Number(value)
}

const getTiffDimension = (ifd: TiffIfd, tag: string, fallback: string) => {
  const resolved = firstNumber(ifd[tag] ?? ifd[fallback])
  return Number.isFinite(resolved) ? resolved : 0
}

const assertTiffPageDimensions = (width: number, height: number, pageNumber: number) => {
  if (
    !Number.isInteger(width)
    || !Number.isInteger(height)
    || width <= 0
    || height <= 0
    || width > MAX_TIFF_DIMENSION
    || height > MAX_TIFF_DIMENSION
    || width * height > MAX_TIFF_PAGE_PIXELS
  ) {
    throw new Error(`TIFF page ${pageNumber} exceeds the image safety limit.`)
  }
}

const validateTiffPages = (ifds: TiffIfd[]) => {
  if (!ifds.length) throw new Error('TIFF does not contain a decodable page.')
  if (ifds.length > MAX_TIFF_PAGES) {
    throw new Error(`TIFF contains more than ${MAX_TIFF_PAGES} pages.`)
  }

  let totalPixels = 0
  ifds.forEach((ifd, index) => {
    const width = getTiffDimension(ifd, 't256', 'width')
    const height = getTiffDimension(ifd, 't257', 'height')
    assertTiffPageDimensions(width, height, index + 1)
    totalPixels += width * height
    if (totalPixels > MAX_TIFF_TOTAL_PIXELS) {
      throw new Error('TIFF cumulative decoded pixels exceed the image safety limit.')
    }
  })
}

const waitForImage = async (image: HTMLImageElement, signal: AbortSignal) => {
  throwIfAborted(signal)
  if (image.complete) {
    if (image.naturalWidth > 0 && image.naturalHeight > 0) return
    throw new Error('The browser could not decode this image format.')
  }

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener('load', onLoad)
      image.removeEventListener('error', onError)
      signal.removeEventListener('abort', onAbort)
    }
    const onLoad = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('The browser could not decode this image format.'))
    }
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Document load aborted', 'AbortError'))
    }
    image.addEventListener('load', onLoad, { once: true })
    image.addEventListener('error', onError, { once: true })
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

const canvasToPng = async (
  documentRef: Document,
  rgba: Uint8Array,
  width: number,
  height: number,
) => {
  const canvas = documentRef.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is unavailable for TIFF conversion.')
  const imageData = context.createImageData(width, height)
  imageData.data.set(rgba)
  context.putImageData(imageData, 0, 0)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  canvas.width = 1
  canvas.height = 1
  if (!blob) throw new Error('Unable to encode the TIFF page as PNG.')
  return blob
}

const resolveImageBlob = async (buffer: ArrayBuffer, extension: string) => {
  const mimeType = imageMimeTypes[extension] ?? 'image/*'
  if (extension !== 'heic' && extension !== 'heif') {
    return new Blob([buffer], { type: mimeType })
  }

  const { default: heic2any } = await import('heic2any')
  const result = await heic2any({
    blob: new Blob([buffer], { type: mimeType }),
    toType: 'image/png',
  })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) throw new Error('HEIC/HEIF conversion returned no image.')
  return blob
}

const createLightbox = (documentRef: Document, host: HTMLElement) => {
  const element = documentRef.createElement('div')
  element.className = 'document-image-lightbox'
  element.dataset.open = 'false'
  element.setAttribute('role', 'dialog')
  element.setAttribute('aria-modal', 'true')
  element.setAttribute('aria-hidden', 'true')

  const image = documentRef.createElement('img')
  image.alt = '图片大图预览'
  const closeButton = documentRef.createElement('button')
  closeButton.type = 'button'
  closeButton.title = '关闭大图预览'
  closeButton.setAttribute('aria-label', '关闭大图预览')
  closeButton.textContent = '×'
  element.append(image, closeButton)
  host.appendChild(element)

  let rotation = 0
  let previousFocus: HTMLElement | null = null

  const fitImage = () => {
    if (!image.naturalWidth || !image.naturalHeight) return
    const availableWidth = Math.max(1, element.clientWidth - 80)
    const availableHeight = Math.max(1, element.clientHeight - 80)
    const swapsAxes = rotation % 180 !== 0
    const visualWidth = swapsAxes ? image.naturalHeight : image.naturalWidth
    const visualHeight = swapsAxes ? image.naturalWidth : image.naturalHeight
    const scale = Math.min(1, availableWidth / visualWidth, availableHeight / visualHeight)
    image.style.width = `${Math.max(1, Math.round(image.naturalWidth * scale))}px`
    image.style.height = `${Math.max(1, Math.round(image.naturalHeight * scale))}px`
  }

  const close = () => {
    if (element.dataset.open !== 'true') return
    element.dataset.open = 'false'
    element.setAttribute('aria-hidden', 'true')
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    previousFocus = null
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && element.dataset.open === 'true') {
      event.preventDefault()
      close()
    }
  }
  const onBackdropClick = (event: MouseEvent) => {
    if (event.target === element) close()
  }

  image.addEventListener('load', fitImage)
  closeButton.addEventListener('click', close)
  element.addEventListener('click', onBackdropClick)
  documentRef.addEventListener('keydown', onKeyDown)
  documentRef.defaultView?.addEventListener('resize', fitImage)

  return {
    open(page: ImagePage) {
      previousFocus = page.image
      image.src = page.objectUrl
      element.dataset.open = 'true'
      element.setAttribute('aria-hidden', 'false')
      fitImage()
      closeButton.focus({ preventScroll: true })
    },
    setRotation(value: number) {
      rotation = normalizeRotation(value)
      image.style.setProperty('--document-image-rotation', `${rotation}deg`)
      fitImage()
    },
    destroy() {
      image.removeEventListener('load', fitImage)
      closeButton.removeEventListener('click', close)
      element.removeEventListener('click', onBackdropClick)
      documentRef.removeEventListener('keydown', onKeyDown)
      documentRef.defaultView?.removeEventListener('resize', fitImage)
      element.remove()
    },
  }
}

export const renderImageDocument: DocumentRenderer = async ({
  buffer,
  container,
  extension,
  signal,
  onProgress,
}) => {
  throwIfAborted(signal)
  const documentRef = container.ownerDocument
  const urlApi = documentRef.defaultView?.URL ?? URL
  const stage = documentRef.createElement('div')
  stage.className = 'document-image-stage'
  const lightboxHost = container.closest<HTMLElement>('.document-viewer') ?? container
  const lightbox = createLightbox(documentRef, lightboxHost)
  const pages: ImagePage[] = []
  const listenerCleanups: Array<() => void> = []
  let rotation = 0
  let destroyed = false

  container.classList.add('document-renderer', 'document-renderer--image')
  container.appendChild(stage)

  const addPage = async (blob: Blob, pageNumber: number, total: number) => {
    throwIfAborted(signal)
    const objectUrl = urlApi.createObjectURL(blob)
    const frame = documentRef.createElement('div')
    frame.className = 'document-image-frame'
    frame.dataset.page = String(pageNumber)
    const image = documentRef.createElement('img')
    image.src = objectUrl
    image.alt = total > 1 ? `图片第 ${pageNumber} 页` : '图片预览'
    image.tabIndex = 0
    image.setAttribute('role', 'button')
    image.setAttribute('aria-haspopup', 'dialog')
    frame.appendChild(image)
    stage.appendChild(frame)

    try {
      await waitForImage(image, signal)
    } catch (error) {
      urlApi.revokeObjectURL(objectUrl)
      frame.remove()
      throw error
    }

    const page: ImagePage = {
      frame,
      image,
      objectUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
    }
    pages.push(page)
    const open = () => lightbox.open(page)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    }
    image.addEventListener('click', open)
    image.addEventListener('keydown', onKeyDown)
    listenerCleanups.push(() => {
      image.removeEventListener('click', open)
      image.removeEventListener('keydown', onKeyDown)
    })
  }

  const applyLayout = () => {
    if (!pages.length || destroyed) return
    const padding = container.clientWidth <= 640 ? 24 : 48
    const availableWidth = Math.max(1, container.clientWidth - padding)
    const availableHeight = Math.max(1, container.clientHeight - padding)
    const swapsAxes = rotation % 180 !== 0
    const visualWidths = pages.map(page => swapsAxes ? page.height : page.width)
    const visualHeights = pages.map(page => swapsAxes ? page.width : page.height)
    const widthScale = availableWidth / Math.max(...visualWidths)
    const heightScale = pages.length === 1 ? availableHeight / visualHeights[0]! : 1
    const scale = Math.min(1, widthScale, heightScale)

    pages.forEach(page => {
      const imageWidth = Math.max(1, Math.round(page.width * scale))
      const imageHeight = Math.max(1, Math.round(page.height * scale))
      page.image.style.width = `${imageWidth}px`
      page.image.style.height = `${imageHeight}px`
      page.image.style.setProperty('--document-image-rotation', `${rotation}deg`)
      page.frame.style.width = `${swapsAxes ? imageHeight : imageWidth}px`
      page.frame.style.height = `${swapsAxes ? imageWidth : imageHeight}px`
    })
  }

  const ResizeObserverConstructor = documentRef.defaultView?.ResizeObserver
  const resizeObserver = ResizeObserverConstructor
    ? new ResizeObserverConstructor(applyLayout)
    : null
  resizeObserver?.observe(container)

  const cleanup = () => {
    if (destroyed) return
    destroyed = true
    resizeObserver?.disconnect()
    listenerCleanups.forEach(dispose => dispose())
    lightbox.destroy()
    pages.forEach(page => urlApi.revokeObjectURL(page.objectUrl))
    pages.length = 0
    container.replaceChildren()
    container.classList.remove('document-renderer', 'document-renderer--image')
  }

  const onAbort = () => cleanup()
  signal.addEventListener('abort', onAbort, { once: true })

  const setRotation = (value: number) => {
    rotation = normalizeRotation(value)
    lightbox.setRotation(rotation)
    applyLayout()
    return rotation
  }

  try {
    if ((extension === 'tif' || extension === 'tiff') && hasTiffSignature(buffer)) {
      if (buffer.byteLength <= 0 || buffer.byteLength > MAX_TIFF_SOURCE_BYTES) {
        throw new Error('TIFF source exceeds the image safety limit.')
      }
      onProgress({ current: 0, total: 1, label: '正在解析 TIFF 图片' })
      const imported = await import('utif') as unknown as UtifModule & { default?: UtifModule }
      throwIfAborted(signal)
      const utif = imported.default ?? imported
      const ifds = utif.decode(buffer)
      validateTiffPages(ifds)
      stage.classList.add('is-multipage')

      for (let index = 0; index < ifds.length; index += 1) {
        throwIfAborted(signal)
        const ifd = ifds[index]!
        const width = getTiffDimension(ifd, 't256', 'width')
        const height = getTiffDimension(ifd, 't257', 'height')
        onProgress({
          current: index,
          total: ifds.length,
          label: `正在渲染 TIFF 第 ${index + 1}/${ifds.length} 页`,
        })
        utif.decodeImage(buffer, ifd)
        throwIfAborted(signal)
        const rgba = utif.toRGBA8(ifd)
        if (rgba.byteLength !== width * height * 4) {
          throw new Error(`TIFF page ${index + 1} returned an unexpected pixel buffer.`)
        }
        const blob = await canvasToPng(documentRef, rgba, width, height)
        for (const key of ['data', 'rgba', 'pixels']) delete ifd[key]
        await addPage(blob, index + 1, ifds.length)
        applyLayout()
        onProgress({
          current: index + 1,
          total: ifds.length,
          label: index + 1 === ifds.length ? 'TIFF 已就绪' : `已渲染 ${index + 1}/${ifds.length} 页`,
        })
      }
      ifds.length = 0
    } else {
      onProgress({ current: 0, total: 1, label: '正在解码图片' })
      const blob = await resolveImageBlob(buffer, extension)
      throwIfAborted(signal)
      await addPage(blob, 1, 1)
      applyLayout()
      onProgress({ current: 1, total: 1, label: '图片已就绪' })
    }

    return {
      pageCount: pages.length,
      getRotation: () => rotation,
      setRotation,
      rotateLeft: () => setRotation(rotation - 90),
      rotateRight: () => setRotation(rotation + 90),
      destroy() {
        signal.removeEventListener('abort', onAbort)
        cleanup()
      },
    }
  } catch (error) {
    signal.removeEventListener('abort', onAbort)
    cleanup()
    throw error
  }
}
