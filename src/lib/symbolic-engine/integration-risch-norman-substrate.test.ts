import { ComputeEngine } from '@cortex-js/compute-engine'
import { describe, expect, it } from 'vitest'
import { profileRischNormanCandidate } from './integration/risch-norman'

const ce = new ComputeEngine()

function profile(latex: string, variable = 'x') {
  return profileRischNormanCandidate(ce.parse(latex).json, variable)
}

describe('Risch-Norman substrate profile', () => {
  it('recognizes polynomial times symbolic affine exponential readiness', () => {
    const result = profile('x^3 e^{a*x+b}')

    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') {
      throw new Error('expected ready profile')
    }
    expect(result.family).toBe('affine-exp')
    expect(result.polynomialDegree).toBe(3)
    expect(result.coefficientScope).toBe('exact-rational-target-free-symbolic')
    expect(result.requiredFacts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'a',
      relation: '\\ne0',
    })
    expect(result.basis).toEqual([
      {
        kind: 'polynomial-times-extension',
        polynomialDegree: 3,
        span: ['P(v)extension(u)'],
        closure: 'derivative-closed',
      },
    ])
  })

  it('recognizes positive exact-base affine exponential readiness', () => {
    const result = profile('x^2 2^{3*x-1}')

    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') {
      throw new Error('expected ready profile')
    }
    expect(result.family).toBe('positive-base-exp')
    expect(result.polynomialDegree).toBe(2)
    expect(result.requiredFacts).toEqual(expect.arrayContaining([
      { kind: 'nonzero', expressionLatex: '3', relation: '\\ne0' },
      { kind: 'positive', expressionLatex: '2', relation: '>0' },
      { kind: 'nonunit', expressionLatex: '2', relation: '\\ne1' },
    ]))
  })

  it('recognizes affine sine and cosine as one derivative-closed pair family', () => {
    const sine = profile('x^4\\sin(a*x+b)')
    const cosine = profile('x^4\\cos(a*x+b)')

    for (const result of [sine, cosine]) {
      expect(result.kind).toBe('ready')
      if (result.kind !== 'ready') {
        throw new Error('expected ready profile')
      }
      expect(result.family).toBe('affine-sin-cos')
      expect(result.polynomialDegree).toBe(4)
      expect(result.basis[0]).toEqual({
        kind: 'polynomial-times-sin-cos-pair',
        polynomialDegree: 4,
        span: ['P(v)sin(u)', 'Q(v)cos(u)'],
        closure: 'derivative-closed',
      })
    }
  })

  it('recognizes affine logarithm readiness without claiming closure', () => {
    const natural = profile('x\\ln(a*x+b)')
    const common = profile('x\\log(a*x+b)')

    for (const result of [natural, common]) {
      expect(result.kind).toBe('ready')
      if (result.kind !== 'ready') {
        throw new Error('expected ready profile')
      }
      expect(result.family).toBe('affine-log')
      expect(result.polynomialDegree).toBe(1)
      expect(result.basis[0]).toEqual({
        kind: 'affine-log-prerequisite',
        polynomialDegree: 1,
        span: ['P(v)log(u)', 'rational correction over u'],
        closure: 'requires-rational-correction',
      })
    }
  })

  it('treats non-selected symbols as target-free in arbitrary selected variables', () => {
    const result = profile('t e^{a*t+b}', 't')

    expect(result.kind).toBe('ready')
    if (result.kind !== 'ready') {
      throw new Error('expected ready profile')
    }
    expect(result.variable).toBe('t')
    expect(result.family).toBe('affine-exp')
    expect(result.polynomialDegree).toBe(1)
    expect(result.requiredFacts).toContainEqual({
      kind: 'nonzero',
      expressionLatex: 'a',
      relation: '\\ne0',
    })
  })

  it('rejects unsupported or unsafe first-slice shapes', () => {
    expect(profile('\\sin(x^2)')).toMatchObject({
      kind: 'stop',
      reason: 'non-affine-argument',
    })
    expect(profile('e^{\\sin(x)}')).toMatchObject({
      kind: 'stop',
      reason: 'nested-transcendental-tower',
    })
    expect(profile('x\\sec(x)')).toMatchObject({
      kind: 'stop',
      reason: 'unsupported-head',
    })
    expect(profile('|x|e^x')).toMatchObject({
      kind: 'stop',
      reason: 'branch-sensitive',
    })
    expect(profile('e^{a*x+b}\\sin(c*x+d)')).toMatchObject({
      kind: 'stop',
      reason: 'mixed-transcendental-tower',
    })
    expect(profile('\\sqrt{x}e^x')).toMatchObject({
      kind: 'stop',
      reason: 'selected-variable-dependent-coefficient',
    })
    expect(profile('2.5^x')).toMatchObject({
      kind: 'stop',
      reason: 'inexact-coefficient',
    })
  })
})
