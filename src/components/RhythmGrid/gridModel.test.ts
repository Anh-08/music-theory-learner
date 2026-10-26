import { describe, expect, it } from 'vitest'
import { formatStep, parsePattern, parseStep } from '../../audio/rhythms'
import { countLabels, paintCells, resubdivide, toggleCell, visibleRows, type GridRow } from './gridModel'


describe('gridModel', () => {
  it('the Strum row cycles and clears picked notes', () => {
    let s = parseStep('B+1')
    const seen: string[] = []
    for (let i = 0; i < 6; i++) {
      s = toggleCell(s, 'strum')
      seen.push(formatStep(s))
    }
    expect(seen).toEqual(['D', 'U', 'd', 'u', 'X', '-'])
  })

  it('the Bass row cycles none → B → B′ and keeps string notes', () => {
    let s = parseStep('3')
    s = toggleCell(s, 'bass')
    expect(formatStep(s)).toBe('B+3')
    s = toggleCell(s, 'bass')
    expect(formatStep(s)).toBe("B'+3")
    s = toggleCell(s, 'bass')
    expect(formatStep(s)).toBe('3')
  })

  it('string rows toggle on / off and clear strums', () => {
    expect(formatStep(toggleCell(parseStep('D'), 2))).toBe('2')
    expect(formatStep(toggleCell(parseStep('2'), 2))).toBe('-')
    expect(formatStep(toggleCell(parseStep('B+1'), 3))).toBe('B+13')
  })

  it('shows only the rows in use', () => {
    expect(visibleRows(parsePattern('D - D U - U D U'), false)).toEqual(['strum'])
    expect(visibleRows(parsePattern('B 3 2 3 1 3 2 3'), false)).toEqual(['bass', 1, 2, 3])
    expect(visibleRows(parsePattern('B - X - X -'), false)).toEqual(['strum', 'bass'])
    expect(visibleRows([], true)).toHaveLength(6)
  })

  it('beat count labels', () => {
    expect(countLabels(4, 2)).toEqual(['1', '&', '2', '&', '3', '&', '4', '&'])
    expect(countLabels(3, 2)).toEqual(['1', '&', '2', '&', '3', '&'])
    expect(countLabels(1, 4)).toEqual(['1', 'e', '&', 'a'])
    expect(countLabels(2, 3)).toEqual(['1', '·', '·', '2', '·', '·'])
  })
})

describe('paintCells (drag to paint)', () => {
  const ROWS: GridRow[] = ['strum', 'bass', 1, 2, 3, 4]
  const paint = (pattern: string, start: [GridRow, number], end: [GridRow, number]) =>
    paintCells(parsePattern(pattern), { row: start[0], step: start[1] }, { row: end[0], step: end[1] }, ROWS).map(formatStep).join(' ')

  it('a drag that stays on one cell is the same as a click', () => {
    for (const row of ROWS) {
      const steps = parsePattern("B+1 D - 2")
      for (let i = 0; i < steps.length; i++) {
        expect(paintCells(steps, { row, step: i }, { row, step: i }, ROWS), `${row} ${i}`).toEqual(steps.map((s, j) => (j === i ? toggleCell(s, row) : s)))
      }
    }
  })

  it('dragging down one step switches on strings 1, 2 and 3 together', () => {
    expect(paint('B - - -', [1, 1], [3, 1])).toBe('B 123 - -')
    // Dragging up works the same way.
    expect(paint('B - - -', [3, 2], [1, 2])).toBe('B - 123 -')
  })

  it('dragging across a row paints every step; a block covers rows and steps', () => {
    expect(paint('- - - -', [2, 0], [2, 3])).toBe('2 2 2 2')
    expect(paint('- - - -', ['bass', 0], [2, 1])).toBe('B+12 B+12 - -')
  })

  it('starting on a cell that is on switches every covered cell off', () => {
    expect(paint('123 123 B+3 -', [1, 0], [2, 3])).toBe('3 3 B+3 -')
    // On the Bass row, "on" means the next click would clear it (B′ → none).
    expect(paint("B'+3 B+2 B -", ['bass', 0], [3, 2])).toBe('- - - -')
  })

  it('the Bass row paints the first cell\'s B / B′ and leaves strings alone', () => {
    expect(paint('B 3 2 1', ['bass', 0], ['bass', 3])).toBe("B' B'+3 B'+2 B'+1")
    // From a string row, covered bass cells keep B′ when switching on.
    expect(paint("- B' - -", [1, 0], ['bass', 1])).toBe("B+1 B'+1 - -")
  })

  it('the Strum row paints the first cell\'s new strum and never touches pick rows', () => {
    expect(paint('- - - -', ['strum', 0], [3, 3])).toBe('D D D D')
    expect(paint('X B+1 - U', ['strum', 0], ['strum', 2])).toBe('- - - U')
  })

  it('dragging onto the Strum row from a pick row stops at the Bass row', () => {
    expect(paint('- - - -', [2, 0], ['strum', 0])).toBe('B+12 - - -')
  })

  it('re-divides a bar between eighths and sixteenths', () => {
    const eighths = parsePattern('D - D U - U D U')
    const sixteenths = resubdivide(eighths, 2, 4)
    expect(sixteenths.map(formatStep).join(' ')).toBe('D - - - D - U - - - U - D - U -')
    expect(resubdivide(sixteenths, 4, 2)).toEqual(eighths)
    // Hits on the in-between sixteenths are dropped when going back to eighths.
    expect(resubdivide(parsePattern('D U D U'), 4, 2).map(formatStep)).toEqual(['D', 'D'])
    expect(resubdivide(eighths, 2, 2)).toBe(eighths)
  })
})
