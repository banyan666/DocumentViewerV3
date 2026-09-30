import type { DocumentKind } from './formats'

export type DocumentViewerTheme = 'light' | 'dark' | 'system'

export interface DocumentViewerOptions {
  /** Show the built-in compact toolbar. */
  toolbar?: boolean
  /** Color theme used by the component chrome and render surface. */
  theme?: DocumentViewerTheme
  /** Initial CSS zoom ratio. */
  initialZoom?: number
  /** Lowest permitted zoom ratio. */
  minZoom?: number
  /** Highest permitted zoom ratio. */
  maxZoom?: number
  /** Rows rendered per spreadsheet sheet. */
  spreadsheetMaxRows?: number
  /** Columns rendered per spreadsheet sheet. */
  spreadsheetMaxColumns?: number
  /** Extra init options passed to fetch() for remote URLs. */
  fetchOptions?: RequestInit
}

export interface DocumentViewerProps {
  file?: File
  url?: string
  filename?: string
  height?: string | number
  strict?: boolean
  emptyText?: string
  /** Text shown and emitted when a document cannot be loaded or parsed. */
  errorText?: string
  options?: DocumentViewerOptions
}

export interface DocumentLoadContext {
  filename: string
  extension: string
  kind: DocumentKind
  byteLength?: number
  pageCount?: number
}

export interface DocumentProgress {
  current: number
  total: number
  label?: string
}

export interface DocumentZoomState {
  scale: number
  percent: number
}

export interface DocumentRendererController {
  pageCount?: number
  destroy(): void | Promise<void>
}

export interface DocumentRenderContext {
  container: HTMLDivElement
  buffer: ArrayBuffer
  extension: string
  filename: string
  signal: AbortSignal
  options: DocumentViewerOptions
  onProgress(progress: DocumentProgress): void
}

export type DocumentRenderer = (
  context: DocumentRenderContext,
) => Promise<DocumentRendererController>

export interface DocumentViewerEventMap {
  'load-start': DocumentLoadContext
  'load-complete': DocumentLoadContext
  'unload-start': DocumentLoadContext
  'unload-complete': DocumentLoadContext
  progress: DocumentProgress
  'zoom-change': DocumentZoomState
  error: string
}

export interface DocumentViewerInstance {
  reload(): Promise<void>
  destroy(): Promise<void>
  zoomIn(): DocumentZoomState
  zoomOut(): DocumentZoomState
  resetZoom(): DocumentZoomState
  setZoom(scale: number): DocumentZoomState
  getZoomState(): DocumentZoomState
  downloadOriginalFile(): void
  print(): void
  getScrollContainer(): HTMLDivElement | null
}
