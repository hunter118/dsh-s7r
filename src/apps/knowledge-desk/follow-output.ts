export interface ScrollPosition {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

export function isNearOutputEnd(position: ScrollPosition, threshold = 32): boolean {
  return position.scrollHeight - position.scrollTop - position.clientHeight <= threshold
}

