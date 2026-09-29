import * as XLSX from 'xlsx'

import type { DocumentRenderer } from '../types'

type Sheet = XLSX.WorkSheet

const createElement = <K extends keyof HTMLElementTagNameMap>(
  documentRef: Document,
  tag: K,
  className?: string,
) => {
  const element = documentRef.createElement(tag)
  if (className) element.className = className
  return element
}

const renderSheet = (
  sheet: Sheet,
  host: HTMLDivElement,
  maxRows: number,
  maxColumns: number,
) => {
  host.replaceChildren()
  const documentRef = host.ownerDocument
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
  range.e.r = Math.min(range.e.r, range.s.r + maxRows - 1)
  range.e.c = Math.min(range.e.c, range.s.c + maxColumns - 1)

  const mergeRoots = new Map<string, { rows: number; columns: number }>()
  const mergedChildren = new Set<string>()
  for (const merge of sheet['!merges'] || []) {
    const root = XLSX.utils.encode_cell(merge.s)
    mergeRoots.set(root, {
      rows: merge.e.r - merge.s.r + 1,
      columns: merge.e.c - merge.s.c + 1,
    })
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      for (let column = merge.s.c; column <= merge.e.c; column += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: column })
        if (address !== root) mergedChildren.add(address)
      }
    }
  }

  const table = createElement(documentRef, 'table', 'document-sheet')
  const head = table.createTHead().insertRow()
  head.appendChild(createElement(documentRef, 'th', 'document-sheet__corner'))
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const header = createElement(documentRef, 'th')
    header.textContent = XLSX.utils.encode_col(column)
    head.appendChild(header)
  }

  const body = table.createTBody()
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const tr = body.insertRow()
    const rowHeader = createElement(documentRef, 'th', 'document-sheet__row-number')
    rowHeader.textContent = String(row + 1)
    tr.appendChild(rowHeader)

    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column })
      if (mergedChildren.has(address)) continue
      const td = tr.insertCell()
      const merge = mergeRoots.get(address)
      if (merge) {
        td.rowSpan = merge.rows
        td.colSpan = merge.columns
      }
      const cell = sheet[address]
      td.textContent = cell == null ? '' : String(cell.w ?? cell.v ?? '')
      if (cell?.t === 'n') td.classList.add('is-number')
      if (cell?.l?.Target) {
        const link = createElement(documentRef, 'a')
        link.href = cell.l.Target
        link.rel = 'noreferrer noopener'
        link.target = '_blank'
        link.textContent = td.textContent
        td.replaceChildren(link)
      }
    }
  }

  host.appendChild(table)
}

export const renderSpreadsheetDocument: DocumentRenderer = async ({
  buffer,
  container,
  options,
  signal,
  onProgress,
}) => {
  onProgress({ current: 0, total: 1, label: '正在解析 Excel 工作簿' })
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellText: true,
    dense: false,
  })
  if (signal.aborted) throw new DOMException('Document load aborted', 'AbortError')

  const documentRef = container.ownerDocument
  container.classList.add('document-renderer', 'document-renderer--spreadsheet')
  const shell = createElement(documentRef, 'div', 'document-workbook')
  const tabs = createElement(documentRef, 'div', 'document-workbook__tabs')
  const sheetHost = createElement(documentRef, 'div', 'document-workbook__sheet')
  shell.append(tabs, sheetHost)
  container.appendChild(shell)

  const maxRows = Math.max(1, options.spreadsheetMaxRows ?? 2000)
  const maxColumns = Math.max(1, options.spreadsheetMaxColumns ?? 200)
  let activeSheet = workbook.SheetNames[0] || ''

  const activate = (name: string) => {
    activeSheet = name
    tabs.querySelectorAll('button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.sheet === name)
    })
    const sheet = workbook.Sheets[name]
    if (sheet) renderSheet(sheet, sheetHost, maxRows, maxColumns)
  }

  for (const name of workbook.SheetNames) {
    const button = createElement(documentRef, 'button')
    button.type = 'button'
    button.dataset.sheet = name
    button.textContent = name
    button.addEventListener('click', () => activate(name))
    tabs.appendChild(button)
  }
  if (activeSheet) activate(activeSheet)
  onProgress({ current: 1, total: 1, label: 'Excel 工作簿已就绪' })

  return {
    pageCount: workbook.SheetNames.length,
    destroy() {
      container.replaceChildren()
      container.classList.remove('document-renderer', 'document-renderer--spreadsheet')
    },
  }
}
