import { describe, expect, it } from 'vitest'
import { movableTileIndexes, movePuzzleTile, puzzleSolvable, puzzleSolved, shufflePuzzle, SOLVED_PUZZLE } from '../src/apps/accessories/puzzle.ts'

describe('Puzzle desk accessory', () => {
  it('moves only a tile adjacent to the empty square', () => {
    expect(movableTileIndexes(SOLVED_PUZZLE)).toEqual([11, 14])
    expect(movePuzzleTile(SOLVED_PUZZLE, 14).slice(12)).toEqual([13, 14, 0, 15])
    expect(movePuzzleTile(SOLVED_PUZZLE, 0)).toEqual([...SOLVED_PUZZLE])
  })

  it('shuffles through legal moves into a solvable non-solved board', () => {
    const shuffled = shufflePuzzle(() => 0.37, 80)
    expect(shuffled).toHaveLength(16)
    expect([...shuffled].sort((a, b) => a - b)).toEqual([...SOLVED_PUZZLE].sort((a, b) => a - b))
    expect(puzzleSolved(shuffled)).toBe(false)
    expect(puzzleSolvable(shuffled)).toBe(true)
  })

  it('preserves 4×4 solvability across varied legal shuffles', () => {
    for (let seed = 1; seed <= 128; seed += 1) {
      let state = seed
      const random = () => {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 0x1_0000_0000
      }
      expect(puzzleSolvable(shufflePuzzle(random, 180))).toBe(true)
    }
    const impossible = [...SOLVED_PUZZLE]
    ;[impossible[0], impossible[1]] = [impossible[1]!, impossible[0]!]
    expect(puzzleSolvable(impossible)).toBe(false)
  })
})
