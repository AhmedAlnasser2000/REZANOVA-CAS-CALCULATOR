import { describe, expect, it } from 'vitest'
import { differentiateLatex } from './differentiation'

describe('symbolic-engine differentiation', () => {
  it('supports product, quotient, and chain-style derivatives', () => {
    expect(differentiateLatex('x\\sin(x)', 'x')).toContain('\\cos')
    expect(differentiateLatex('\\frac{x^2}{x+1}', 'x')).toContain('x+1')
    expect(differentiateLatex('\\sin(2x+1)', 'x')).toContain('2')
  })

  it('supports log and ln rules', () => {
    expect(differentiateLatex('\\ln(3x+1)', 'x')).toContain('3')
    expect(differentiateLatex('\\log(5x)', 'x')).toContain('x')
    expect(differentiateLatex('\\log(5x)', 'x')).toContain('\\ln(10)')
  })
})
