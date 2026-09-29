import type { App, Plugin } from 'vue'

import DocumentViewer from './components/DocumentViewer.vue'
import './style.css'

export interface DocumentViewerPluginOptions {
  componentName?: string
}

export const DocumentViewerPlugin: Plugin<[DocumentViewerPluginOptions?]> = {
  install(app: App, options: DocumentViewerPluginOptions = {}) {
    app.component(options.componentName ?? 'DocumentViewer', DocumentViewer)
  },
}

export { DocumentViewer }
export {
  DOCUMENT_VIEWER_ACCEPT,
  DOCUMENT_VIEWER_EXTENSIONS,
  getDocumentExtension,
  getDocumentKind,
  isSupportedDocumentName,
} from './formats'
export type {
  DocumentViewerExtension,
  DocumentKind,
} from './formats'
export type {
  DocumentViewerEventMap,
  DocumentViewerInstance,
  DocumentLoadContext,
  DocumentViewerOptions,
  DocumentViewerProps,
  DocumentProgress,
  DocumentViewerTheme,
  DocumentZoomState,
} from './types'

export default DocumentViewerPlugin
