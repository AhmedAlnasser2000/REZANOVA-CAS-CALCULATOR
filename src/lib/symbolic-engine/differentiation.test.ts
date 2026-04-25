import { describe, expect, it } from 'vitest'
import { differentiateLatex, differentiateLatexWithMetadata } from './differentiation'

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

  it('classifies powered function derivatives without falling through to Compute Engine', () => {
    const directPower = differentiateLatexWithMetadata('\\sin^2\\left(x\\right)', 'x')
    expect(directPower.strategies).toContain('function-power')
    expect(directPower.strategies).not.toContain('compute-engine')
    expect(directPower.latex).toContain('2')
    expect(directPower.latex).toContain('\\sin')
    expect(directPower.latex).toContain('\\cos')

    const nestedPower = differentiateLatexWithMetadata(
      '\\sin^2\\left(\\cos^3\\left(x\\right)\\right)',
      'x',
    )
    expect(nestedPower.strategies).toContain('function-power')
    expect(nestedPower.strategies).toContain('chain-rule')
    expect(nestedPower.strategies).not.toContain('compute-engine')
    expect(nestedPower.latex).toContain('\\sin(x)')
    expect(nestedPower.latex).toContain('\\cos(x)^2')
  })

  it('classifies variable-exponent function powers through the general power rule', () => {
    const generalPower = differentiateLatexWithMetadata('\\cos^{2x}\\left(x\\right)', 'x')
    expect(generalPower.strategies).toContain('function-power')
    expect(generalPower.strategies).toContain('general-power')
    expect(generalPower.strategies).not.toContain('compute-engine')
    expect(generalPower.latex).toContain('\\ln')
    expect(generalPower.latex).toContain('\\cos')

    const nestedGeneralPower = differentiateLatexWithMetadata(
      '\\cos^{2x}\\left(\\sin^x\\left(5\\right)\\right)',
      'x',
    )
    expect(nestedGeneralPower.strategies).toContain('function-power')
    expect(nestedGeneralPower.strategies).toContain('general-power')
    expect(nestedGeneralPower.strategies).not.toContain('compute-engine')
    expect(nestedGeneralPower.latex).toContain('\\ln')
  })

  it('supports known inverse trig and inverse hyperbolic derivative families', () => {
    const arcsin = differentiateLatexWithMetadata('\\arcsin\\left(x\\right)', 'x')
    const arccos = differentiateLatexWithMetadata('\\arccos\\left(x\\right)', 'x')
    const arctan = differentiateLatexWithMetadata('\\arctan\\left(x\\right)', 'x')

    expect(arcsin.strategies).toContain('inverse-trig')
    expect(arccos.strategies).toContain('inverse-trig')
    expect(arctan.strategies).toContain('inverse-trig')
    expect(arcsin.latex).toContain('\\sqrt')
    expect(arccos.latex).toContain('-')
    expect(arctan.latex).toContain('x^2')

    const parserInverseSine = differentiateLatexWithMetadata('\\sin^{-1}\\left(x\\right)', 'x')
    expect(parserInverseSine.strategies).toContain('inverse-trig')
    expect(parserInverseSine.latex).toContain('\\sqrt')

    const arsinh = differentiateLatexWithMetadata('\\operatorname{arsinh}\\left(x\\right)', 'x')
    const arcosh = differentiateLatexWithMetadata('\\operatorname{arcosh}\\left(x\\right)', 'x')
    const artanh = differentiateLatexWithMetadata('\\operatorname{artanh}\\left(x\\right)', 'x')

    expect(arsinh.strategies).toContain('inverse-hyperbolic')
    expect(arcosh.strategies).toContain('inverse-hyperbolic')
    expect(artanh.strategies).toContain('inverse-hyperbolic')
    expect(arsinh.latex).toContain('\\sqrt')
    expect(arcosh.latex).toContain('\\sqrt')
    expect(artanh.latex).toContain('x^2')
  })

  it('keeps reciprocal sine distinct from inverse-trig notation', () => {
    const reciprocalSine = differentiateLatexWithMetadata('(\\sin\\left(x\\right))^{-1}', 'x')

    expect(reciprocalSine.strategies).not.toContain('inverse-trig')
    expect(reciprocalSine.latex).toContain('\\sin')
  })
})
