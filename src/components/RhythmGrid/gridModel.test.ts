import { describe, expect, it } from 'vitest'
import { formatStep, parsePattern, parseStep } from '../../audio/rhythms'
import { countLabels, toggleCell, visibleRows } from './gridModel'


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
