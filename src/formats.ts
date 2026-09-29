export const DOCUMENT_VIEWER_EXTENSIONS = [
  'doc',
  'dot',
  'docx',
  'docm',
  'dotx',
  'dotm',
  'xls',
  'xlsx',
  'xlsm',
  'xlsb',
  'xlt',
  'xltx',
  'xltm',
  'pdf',
  'pptx',
  'pptm',
  'pot',
  'potx',
  'potm',
  'ppsx',
  'ppsm',
] as const

export type DocumentKind = 'word' | 'spreadsheet' | 'pdf' | 'presentation'

export type DocumentViewerExtension = typeof DOCUMENT_VIEWER_EXTENSIONS[number]

const supportedExtensions = new Set<string>(DOCUMENT_VIEWER_EXTENSIONS)

export const DOCUMENT_VIEWER_ACCEPT = DOCUMENT_VIEWER_EXTENSIONS
  .map(extension => `.${extension}`)
  .join(',')

export function getDocumentExtension(filename: string): string {
  const cleanName = filename.split(/[?#]/, 1)[0] ?? ''
  const lastSegment = cleanName.split('/').pop() ?? cleanName
  const dotIndex = lastSegment.lastIndexOf('.')
  return dotIndex >= 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : ''
}

export function isSupportedDocumentName(filename: string): boolean {
  return supportedExtensions.has(getDocumentExtension(filename))
}

export function getDocumentKind(extension: string): DocumentKind | null {
  if (['doc', 'dot', 'docx', 'docm', 'dotx', 'dotm'].includes(extension)) return 'word'
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'xlt', 'xltx', 'xltm'].includes(extension)) return 'spreadsheet'
  if (extension === 'pdf') return 'pdf'
  if (['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'].includes(extension)) return 'presentation'
  return null
}
