import type { DocumentKind } from '../formats'
import type { DocumentRenderer } from '../types'

export async function loadDocumentRenderer(kind: DocumentKind): Promise<DocumentRenderer> {
  switch (kind) {
    case 'word':
      return (await import('./word')).renderWordDocument
    case 'spreadsheet':
      return (await import('./spreadsheet')).renderSpreadsheetDocument
    case 'pdf':
      return (await import('./pdf')).renderPdfDocument
    case 'presentation':
      return (await import('./presentation')).renderPresentationDocument
    case 'image':
      return (await import('./image')).renderImageDocument
  }
}
