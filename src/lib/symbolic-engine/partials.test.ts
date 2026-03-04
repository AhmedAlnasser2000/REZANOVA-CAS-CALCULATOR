import { describe, expect, it } from 'vitest'
import { parsePartialDerivativeLatex, resolvePartialDerivative } from './partials'

describe('symbolic-engine partial derivatives', () => {
  it('parses textbook partial-derivative notation', () => {
    const parsed = parsePartialDerivativeLatex('\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)')

    expect(parsed).toEqual({
      variable: 'x',
      bodyLatex: 'x^2y+y^3',
    })
  })

  it('computes first-order symbolic partial derivatives', () => {
    const byX = resolvePartialDerivative({
      variable: 'x',
      bodyLatex: 'x^2y+y^3',
    })
    const byY = resolvePartialDerivative({
      variable: 'y',
      bodyLatex: 'x^2y+y^3',
    })

    expect(byX.kind).toBe('success')
    if (byX.kind === 'success') {
      expect(byX.exactLatex.replaceAll(' ', '')).toContain('2xy')
    }

    expect(byY.kind).toBe('success')
    if (byY.kind === 'success') {
      expect(byY.exactLatex.replaceAll(' ', '')).toContain('x^2+3y^2')
    }
  })
})
