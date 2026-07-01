import { describe, expect, it } from 'vitest'
import {
  differentiateAstWithMetadata,
  differentiateLatex,
  differentiateLatexWithMetadata,
  UnsupportedDifferentiationFallbackError,
} from './differentiation'

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

  it('supports exact-rational numeric-base exponential derivatives', () => {
    expect(differentiateLatex('2^{2x+1}', 'x')).toContain('\\ln(2)')
    expect(differentiateLatex('(\\frac{1}{2})^{3x-1}', 'x')).toContain('\\ln(\\frac{1}{2})')
    expect(differentiateLatexWithMetadata('(\\frac{1}{2})^{3x-1}', 'x').strategies).not.toContain('compute-engine')
  })

  it('supports exact erf and erfi special-function derivatives', () => {
    const erf = differentiateLatexWithMetadata('\\operatorname{erf}(2x+1)', 'x')
    const erfi = differentiateLatexWithMetadata('\\operatorname{erfi}(2x+1)', 'x')
    const internalErf = differentiateAstWithMetadata(['Erf', 'x'], 'x', { computeEngineFallback: 'deny' })

    expect(erf.strategies).not.toContain('compute-engine')
    expect(erf.latex).toContain('\\sqrt{\\pi}')
    expect(erf.latex).toContain('\\exp(-(2x+1)^2)')
    expect(erfi.strategies).not.toContain('compute-engine')
    expect(erfi.latex).toContain('\\sqrt{\\pi}')
    expect(erfi.latex).toContain('\\exp((2x+1)^2)')
    expect(JSON.stringify(internalErf.ast)).toContain('ExponentialE')
  })

  it('supports exact Si and Ci special-function derivatives', () => {
    const si = differentiateLatexWithMetadata('\\operatorname{Si}(2x+1)', 'x')
    const ci = differentiateLatexWithMetadata('\\operatorname{Ci}(2x+1)', 'x')
    const internalSi = differentiateAstWithMetadata(['Si', 'x'], 'x', { computeEngineFallback: 'deny' })
    const internalCi = differentiateAstWithMetadata(['Ci', 'x'], 'x', { computeEngineFallback: 'deny' })

    expect(si.strategies).not.toContain('compute-engine')
    expect(si.latex).toContain('\\sin(2x+1)')
    expect(si.latex).toContain('2x+1')
    expect(ci.strategies).not.toContain('compute-engine')
    expect(ci.latex).toContain('\\cos(2x+1)')
    expect(ci.latex).toContain('2x+1')
    expect(JSON.stringify(internalSi.ast)).toContain('"Sin"')
    expect(JSON.stringify(internalCi.ast)).toContain('"Cos"')
  })

  it('supports exact Ei and li special-function derivatives', () => {
    const ei = differentiateLatexWithMetadata('\\operatorname{Ei}(2x+1)', 'x')
    const li = differentiateLatexWithMetadata('\\operatorname{li}(2x+1)', 'x')
    const internalEi = differentiateAstWithMetadata(['Ei', 'x'], 'x', { computeEngineFallback: 'deny' })
    const internalLi = differentiateAstWithMetadata(['li', 'x'], 'x', { computeEngineFallback: 'deny' })

    expect(ei.strategies).not.toContain('compute-engine')
    expect(ei.latex).toContain('2x+1')
    expect(ei.latex).toMatch(/(?:e\^\{2x\+1\}|\\exp\(2x\+1\))/)
    expect(li.strategies).not.toContain('compute-engine')
    expect(li.latex).toContain('\\ln(2x+1)')
    expect(JSON.stringify(internalEi.ast)).toContain('ExponentialE')
    expect(JSON.stringify(internalLi.ast)).toContain('"Ln"')
  })

  it('supports exact Fresnel special-function derivatives', () => {
    const fresnelS = differentiateLatexWithMetadata('\\operatorname{FresnelS}(2x+1)', 'x')
    const fresnelC = differentiateLatexWithMetadata('\\operatorname{FresnelC}(2x+1)', 'x')
    const internalS = differentiateAstWithMetadata(['FresnelS', 'x'], 'x', { computeEngineFallback: 'deny' })
    const internalC = differentiateAstWithMetadata(['FresnelC', 'x'], 'x', { computeEngineFallback: 'deny' })

    expect(fresnelS.strategies).not.toContain('compute-engine')
    expect(fresnelS.latex).toContain('\\sin')
    expect(fresnelS.latex).toContain('\\pi')
    expect(fresnelC.strategies).not.toContain('compute-engine')
    expect(fresnelC.latex).toContain('\\cos')
    expect(fresnelC.latex).toContain('\\pi')
    expect(JSON.stringify(internalS.ast)).toContain('"Sin"')
    expect(JSON.stringify(internalS.ast)).toContain('"Pi"')
    expect(JSON.stringify(internalC.ast)).toContain('"Cos"')
    expect(JSON.stringify(internalC.ast)).toContain('"Pi"')
  })

  it('supports direct trig reciprocal derivative families', () => {
    expect(differentiateLatex('\\tan(2x+1)', 'x')).toContain('\\sec')
    expect(differentiateLatex('\\cot(2x+1)', 'x')).toContain('\\csc')
    expect(differentiateLatex('\\sec(2x+1)', 'x')).toContain('\\tan')
    expect(differentiateLatex('\\csc(2x+1)', 'x')).toContain('\\cot')
    expect(differentiateLatex('\\ln(\\cos(2x+1))', 'x')).toContain('\\tan')
    expect(differentiateLatex('\\ln(\\sin(2x+1))', 'x')).toContain('\\cot')
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

  it('allows Compute Engine fallback by default but can deny it for unsupported heads', () => {
    const fallback = differentiateAstWithMetadata(['UnknownHead', 'x'], 'x')

    expect(fallback.strategies).toContain('compute-engine')
    expect(() =>
      differentiateAstWithMetadata(['UnknownHead', 'x'], 'x', { computeEngineFallback: 'deny' }),
    ).toThrow(UnsupportedDifferentiationFallbackError)
  })
})
