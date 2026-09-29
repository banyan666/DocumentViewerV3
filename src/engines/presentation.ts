import JSZip from 'jszip'

import type { DocumentRenderer } from '../types'

const elementList = (root: ParentNode, localName: string): Element[] => (
  Array.from(root.querySelectorAll('*')).filter(node => node.localName === localName)
)

const firstElement = (root: ParentNode, localName: string): Element | undefined => (
  elementList(root, localName)[0]
)

const parseXml = (source: string, label: string) => {
  const xml = new DOMParser().parseFromString(source, 'application/xml')
  if (xml.querySelector('parsererror')) throw new Error(`${label} XML 解析失败。`)
  return xml
}

const resolvePartPath = (basePart: string, target: string) => {
  if (target.startsWith('/')) return target.slice(1)
  const segments = basePart.split('/')
  segments.pop()
  for (const segment of target.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.join('/')
}

const relationshipMap = (xml: Document, basePart: string) => {
  const map = new Map<string, string>()
  for (const relationship of elementList(xml, 'Relationship')) {
    const id = relationship.getAttribute('Id')
    const target = relationship.getAttribute('Target')
    if (id && target && relationship.getAttribute('TargetMode') !== 'External') {
      map.set(id, resolvePartPath(basePart, target))
    }
  }
  return map
}

const readText = (root: ParentNode) => (
  elementList(root, 'p').length
    ? elementList(root, 'p')
        .map(paragraph => elementList(paragraph, 't').map(node => node.textContent || '').join(''))
        .filter(Boolean)
        .join('\n')
        .trim()
    : elementList(root, 't').map(node => node.textContent || '').join('').trim()
)

const readColor = (root: ParentNode, fallback = '') => {
  const srgb = firstElement(root, 'srgbClr')?.getAttribute('val')
  return srgb ? `#${srgb}` : fallback
}

const readBounds = (root: ParentNode, slideWidth: number, slideHeight: number) => {
  const transform = firstElement(root, 'xfrm')
  const offset = transform && firstElement(transform, 'off')
  const extent = transform && firstElement(transform, 'ext')
  if (!offset || !extent) return null
  const x = Number(offset.getAttribute('x') || 0)
  const y = Number(offset.getAttribute('y') || 0)
  const width = Number(extent.getAttribute('cx') || 0)
  const height = Number(extent.getAttribute('cy') || 0)
  if (!width || !height) return null
  return {
    left: `${x / slideWidth * 100}%`,
    top: `${y / slideHeight * 100}%`,
    width: `${width / slideWidth * 100}%`,
    height: `${height / slideHeight * 100}%`,
  }
}

const mimeFromPath = (path: string) => {
  const extension = path.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'svg') return 'image/svg+xml'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'bmp') return 'image/bmp'
  return 'image/png'
}

const applyBounds = (element: HTMLElement, bounds: ReturnType<typeof readBounds>) => {
  if (!bounds) return false
  Object.assign(element.style, bounds)
  return true
}

const renderShape = (
  shape: Element,
  slide: HTMLElement,
  slideWidth: number,
  slideHeight: number,
) => {
  const text = readText(shape)
  const shapeProperties = firstElement(shape, 'spPr') || shape
  const bounds = readBounds(shapeProperties, slideWidth, slideHeight)
  if (!bounds) return

  const element = slide.ownerDocument.createElement('div')
  element.className = 'document-slide__shape'
  element.textContent = text
  applyBounds(element, bounds)

  const paragraph = firstElement(shape, 'pPr')
  const runProperties = firstElement(shape, 'rPr') || firstElement(shape, 'defRPr')
  const fontSize = Number(runProperties?.getAttribute('sz') || 1800) / 100
  const alignment = paragraph?.getAttribute('algn')
  element.style.fontSize = `clamp(8px, ${Math.max(1, fontSize / 7.2)}cqi, ${fontSize * 4 / 3}px)`
  element.style.fontWeight = runProperties?.getAttribute('b') === '1' ? '700' : '400'
  element.style.fontStyle = runProperties?.getAttribute('i') === '1' ? 'italic' : 'normal'
  element.style.color = readColor(runProperties || shape, '#1f2937')
  element.style.textAlign = alignment === 'ctr' ? 'center' : alignment === 'r' ? 'right' : 'left'

  const fill = readColor(shapeProperties)
  if (fill) element.style.background = fill
  const line = firstElement(shapeProperties, 'ln')
  const lineColor = line && readColor(line)
  if (lineColor) element.style.border = `1px solid ${lineColor}`
  if (firstElement(shapeProperties, 'prstGeom')?.getAttribute('prst') === 'ellipse') {
    element.style.borderRadius = '50%'
  }
  slide.appendChild(element)
}

const renderPicture = async (
  picture: Element,
  slide: HTMLElement,
  slidePart: string,
  relationships: Map<string, string>,
  zip: JSZip,
  slideWidth: number,
  slideHeight: number,
  objectUrls: string[],
) => {
  const bounds = readBounds(firstElement(picture, 'spPr') || picture, slideWidth, slideHeight)
  const blip = firstElement(picture, 'blip')
  const relationshipId = blip?.getAttribute('r:embed') || blip?.getAttributeNS(
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'embed',
  )
  const imagePart = relationshipId ? relationships.get(relationshipId) : undefined
  if (!bounds || !imagePart) return
  const file = zip.file(imagePart)
  if (!file) return

  const bytes = await file.async('uint8array')
  const imageBuffer = new Uint8Array(bytes).buffer
  const objectUrl = URL.createObjectURL(new Blob([imageBuffer], { type: mimeFromPath(imagePart) }))
  objectUrls.push(objectUrl)
  const image = slide.ownerDocument.createElement('img')
  image.className = 'document-slide__picture'
  image.alt = firstElement(picture, 'cNvPr')?.getAttribute('descr') || ''
  image.src = objectUrl
  applyBounds(image, bounds)
  slide.appendChild(image)
  void slidePart
}

export const renderPresentationDocument: DocumentRenderer = async ({
  buffer,
  container,
  signal,
  onProgress,
}) => {
  onProgress({ current: 0, total: 1, label: '正在解析 PowerPoint 文档' })
  const zip = await JSZip.loadAsync(buffer)
  const presentationPart = 'ppt/presentation.xml'
  const presentationFile = zip.file(presentationPart)
  const presentationRelsFile = zip.file('ppt/_rels/presentation.xml.rels')
  if (!presentationFile || !presentationRelsFile) {
    throw new Error('文件不是有效的 PowerPoint OpenXML 文档。')
  }

  const presentation = parseXml(await presentationFile.async('text'), 'presentation')
  const presentationRels = relationshipMap(
    parseXml(await presentationRelsFile.async('text'), 'presentation relationships'),
    presentationPart,
  )
  const slideSize = firstElement(presentation, 'sldSz')
  const slideWidth = Number(slideSize?.getAttribute('cx') || 12192000)
  const slideHeight = Number(slideSize?.getAttribute('cy') || 6858000)
  const slideParts = elementList(presentation, 'sldId')
    .map(slideId => (
      slideId.getAttribute('r:id') || slideId.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id',
      )
    ))
    .map(id => id ? presentationRels.get(id) : undefined)
    .filter((part): part is string => Boolean(part))

  if (!slideParts.length) throw new Error('PowerPoint 文档中没有可预览的幻灯片。')
  container.classList.add('document-renderer', 'document-renderer--presentation')
  const objectUrls: string[] = []

  for (let index = 0; index < slideParts.length; index += 1) {
    if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')
    const slidePart = slideParts[index]!
    const slideFile = zip.file(slidePart)
    if (!slideFile) continue
    onProgress({
      current: index,
      total: slideParts.length,
      label: `正在渲染幻灯片 ${index + 1}/${slideParts.length}`,
    })

    const slideXml = parseXml(await slideFile.async('text'), `slide ${index + 1}`)
    const relName = slidePart.replace(/([^/]+)$/, '_rels/$1.rels')
    const relFile = zip.file(relName)
    const relationships = relFile
      ? relationshipMap(parseXml(await relFile.async('text'), `slide ${index + 1} relationships`), slidePart)
      : new Map<string, string>()
    const slide = container.ownerDocument.createElement('section')
    slide.className = 'document-slide'
    slide.style.aspectRatio = `${slideWidth} / ${slideHeight}`
    slide.dataset.slide = String(index + 1)

    const background = firstElement(slideXml, 'bg')
    slide.style.background = background ? readColor(background, '#fff') : '#fff'
    const shapeTree = firstElement(slideXml, 'spTree')
    if (shapeTree) {
      for (const node of Array.from(shapeTree.children)) {
        if (node.localName === 'sp' || node.localName === 'graphicFrame') {
          renderShape(node, slide, slideWidth, slideHeight)
        } else if (node.localName === 'pic') {
          await renderPicture(
            node,
            slide,
            slidePart,
            relationships,
            zip,
            slideWidth,
            slideHeight,
            objectUrls,
          )
        }
      }
    }
    container.appendChild(slide)
  }

  onProgress({
    current: slideParts.length,
    total: slideParts.length,
    label: 'PowerPoint 已就绪',
  })
  return {
    pageCount: slideParts.length,
    destroy() {
      objectUrls.forEach(url => URL.revokeObjectURL(url))
      container.replaceChildren()
      container.classList.remove('document-renderer', 'document-renderer--presentation')
    },
  }
}
