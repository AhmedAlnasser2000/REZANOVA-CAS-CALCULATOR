import { describe, expect, it } from 'vitest'
import { analyzeLatex, isRelationalOperator } from './math-analysis'

describe('analyzeLatex', () => {
  it('classifies empty input', () => {
    expect(analyzeLatex('   ')).toEqual({
      kind: 'empty',
      containsSymbolX: false,
    })
  })

  it('classifies a standard expression', () => {
    const result = analyzeLatex('2+2')

    expect(result.kind).toBe('expression')
    expect(result.containsSymbolX).toBe(false)
    expect(result.topLevelOperator).not.toBe('Equal')
  })

  it('classifies a top-level equation with x', () => {
    const result = analyzeLatex('x^2-5x+6=0')

    expect(result.kind).toBe('equation')
    expect(result.containsSymbolX).toBe(true)
    expect(result.topLevelOperator).toBe('Equal')
  })

  it('classifies a top-level equation without x', () => {
    const result = analyzeLatex('2+2=4')

    expect(result.kind).toBe('equation')
    expect(result.containsSymbolX).toBe(false)
    expect(result.topLevelOperator).toBe('Equal')
  })

  it('recognizes relational operators separately from equations', () => {
    const result = analyzeLatex('x\\le 2')

    expect(result.kind).toBe('expression')
    expect(result.topLevelOperator).toBe('LessEqual')
    expect(isRelationalOperator(result.topLevelOperator)).toBe(true)
  })
})
