export type EditableElement = HTMLInputElement | HTMLTextAreaElement | HTMLElement

export interface EditableSnapshot {
  element: EditableElement
  readOnly: boolean
  selectedText: string
  selectionStart?: number
  selectionEnd?: number
  selectionDirection?: 'forward' | 'backward' | 'none'
  range?: Range
}

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'tel', 'email', 'password'])

function editableElement(target: EventTarget | null): EditableElement | null {
  if (!(target instanceof Element)) return null
  const candidate = target.closest('input,textarea,[contenteditable="true"]')
  if (candidate instanceof HTMLTextAreaElement) return candidate
  if (candidate instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(candidate.type) ? candidate : null
  return candidate instanceof HTMLElement && candidate.isContentEditable ? candidate : null
}

export function captureEditableSnapshot(target: EventTarget | null): EditableSnapshot | null {
  const element = editableElement(target)
  if (element === null) return null
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? 0
    const end = element.selectionEnd ?? start
    return {
      element,
      readOnly: element.readOnly || element.disabled,
      selectedText: element.value.slice(start, end),
      selectionStart: start,
      selectionEnd: end,
      selectionDirection: element.selectionDirection ?? 'none',
    }
  }
  const selection = window.getSelection()
  const range = selection !== null && selection.rangeCount > 0 && element.contains(selection.anchorNode)
    ? selection.getRangeAt(0).cloneRange()
    : undefined
  return { element, readOnly: element.contentEditable === 'false', selectedText: range?.toString() ?? '', ...(range === undefined ? {} : { range }) }
}

function restoreSelection(snapshot: EditableSnapshot): void {
  snapshot.element.focus()
  if (snapshot.element instanceof HTMLInputElement || snapshot.element instanceof HTMLTextAreaElement) {
    snapshot.element.setSelectionRange(snapshot.selectionStart ?? 0, snapshot.selectionEnd ?? 0, snapshot.selectionDirection)
    return
  }
  if (snapshot.range === undefined) return
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(snapshot.range)
}

function dispatchInput(element: EditableElement, inputType: string, data: string | null): void {
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data }))
}

export function replaceEditableSelection(snapshot: EditableSnapshot, text: string, inputType = 'insertText'): void {
  restoreSelection(snapshot)
  if (document.execCommand('insertText', false, text)) return
  if (snapshot.element instanceof HTMLInputElement || snapshot.element instanceof HTMLTextAreaElement) {
    const start = snapshot.element.selectionStart ?? snapshot.selectionStart ?? 0
    const end = snapshot.element.selectionEnd ?? snapshot.selectionEnd ?? start
    snapshot.element.setRangeText(text, start, end, 'end')
    dispatchInput(snapshot.element, inputType, text)
    return
  }
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node); range.collapse(true)
  selection.removeAllRanges(); selection.addRange(range)
  dispatchInput(snapshot.element, inputType, text)
}

export function undoEditable(snapshot: EditableSnapshot): void {
  restoreSelection(snapshot)
  document.execCommand('undo')
}

export function selectAllEditable(snapshot: EditableSnapshot): void {
  snapshot.element.focus()
  if (snapshot.element instanceof HTMLInputElement || snapshot.element instanceof HTMLTextAreaElement) { snapshot.element.select(); return }
  const range = document.createRange()
  range.selectNodeContents(snapshot.element)
  const selection = window.getSelection()
  selection?.removeAllRanges(); selection?.addRange(range)
}
