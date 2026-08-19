export const SOLVED_PUZZLE = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0])

export function movableTileIndexes(tiles: readonly number[]): number[] {
  const empty = tiles.indexOf(0)
  if (empty < 0) return []
  const row = Math.floor(empty / 4)
  const column = empty % 4
  const indexes: number[] = []
  if (row > 0) indexes.push(empty - 4)
  if (row < 3) indexes.push(empty + 4)
  if (column > 0) indexes.push(empty - 1)
  if (column < 3) indexes.push(empty + 1)
  return indexes
}

export function movePuzzleTile(tiles: readonly number[], index: number): number[] {
  const empty = tiles.indexOf(0)
  if (!movableTileIndexes(tiles).includes(index)) return [...tiles]
  const next = [...tiles]
  next[empty] = next[index]!
  next[index] = 0
  return next
}

export function puzzleSolved(tiles: readonly number[]): boolean {
  return SOLVED_PUZZLE.every((tile, index) => tiles[index] === tile)
}

export function puzzleSolvable(tiles: readonly number[]): boolean {
  if (tiles.length !== 16 || new Set(tiles).size !== 16 || tiles.some(tile => !Number.isInteger(tile) || tile < 0 || tile > 15)) return false
  const numbered = tiles.filter(tile => tile !== 0)
  let inversions = 0
  for (let left = 0; left < numbered.length; left += 1) {
    for (let right = left + 1; right < numbered.length; right += 1) {
      if (numbered[left]! > numbered[right]!) inversions += 1
    }
  }
  const emptyRowFromBottom = 4 - Math.floor(tiles.indexOf(0) / 4)
  return (inversions + emptyRowFromBottom) % 2 === 1
}

export function shufflePuzzle(random: () => number = Math.random, steps = 180): number[] {
  let tiles = [...SOLVED_PUZZLE]
  let previousEmpty = -1
  for (let step = 0; step < steps; step += 1) {
    const candidates = movableTileIndexes(tiles).filter(index => index !== previousEmpty)
    const choice = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))]!
    previousEmpty = tiles.indexOf(0)
    tiles = movePuzzleTile(tiles, choice)
  }
  return puzzleSolved(tiles) ? movePuzzleTile(tiles, movableTileIndexes(tiles)[0]!) : tiles
}
