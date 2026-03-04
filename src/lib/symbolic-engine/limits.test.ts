import { describe, expect, it } from 'vitest'
import { ComputeEngine } from '@cortex-js/compute-engine'
import { resolveFiniteLimitRule } from './limits'

const ce = new ComputeEngine()

describe('symbolic-engine limits', () => {
  it('resolves removable singularity limits', () => {
    const rational = resolveFiniteLimitRule(ce.parse('\\frac{x^2-1}{x-1}').json, 1, 'x')
    const trig = resolveFiniteLimitRule(ce.parse('\\frac{\\sin(x)}{x}').json, 0, 'x')

    expect(rational.kind).toBe('success')
    if (rational.kind === 'success') {
      expect(rational.value).toBeCloseTo(2, 8)
    }

    expect(trig.kind).toBe('success')
    if (trig.kind === 'success') {
      expect(trig.value).toBeCloseTo(1, 8)
    }
  })

  it('uses heuristic symbolic resolution for supported LHopital cases', () => {
    const result = resolveFiniteLimitRule(ce.parse('\\frac{1-\\cos(x)}{x^2}').json, 0, 'x')

    expect(result.kind).toBe('success')
    if (result.kind === 'success') {
      expect(result.origin).toBe('heuristic-symbolic')
      expect(result.value).toBeCloseTo(0.5, 6)
    }
  })
})
