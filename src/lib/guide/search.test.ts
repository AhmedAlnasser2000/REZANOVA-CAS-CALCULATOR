import { describe, expect, it } from 'vitest'
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities'
import { searchGuide } from './search'

describe('guide search', () => {
  it('finds advanced calculus teaching terminology', () => {
    expect(searchGuide('antiderivative', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-integrals')).toBe(true)
    expect(searchGuide('convergence', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-integrals')).toBe(true)
    expect(searchGuide('Maclaurin', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-series')).toBe(true)
    expect(searchGuide('one-sided', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-limits')).toBe(true)
  })

  it('finds symbolic-engine teaching vocabulary', () => {
    expect(searchGuide('BIDMAS', ACTIVE_CAPABILITIES).some((result) => result.id === 'algebra-manipulation')).toBe(true)
    expect(searchGuide('precedence', ACTIVE_CAPABILITIES).some((result) => result.id === 'algebra-manipulation')).toBe(true)
    expect(searchGuide('product rule', ACTIVE_CAPABILITIES).some((result) => result.id === 'calculus-derivatives')).toBe(true)
    expect(searchGuide('quotient rule', ACTIVE_CAPABILITIES).some((result) => result.id === 'calculus-derivatives')).toBe(true)
    expect(searchGuide('chain rule', ACTIVE_CAPABILITIES).some((result) => result.id === 'calculus-derivatives')).toBe(true)
    expect(searchGuide('integration by parts', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-integrals')).toBe(true)
    expect(searchGuide('u-substitution', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-integrals')).toBe(true)
    expect(searchGuide('partial derivative', ACTIVE_CAPABILITIES).some((result) => result.id === 'advanced-partials')).toBe(true)
  })

  it('still finds linear algebra meaning terms', () => {
    expect(searchGuide('transpose', ACTIVE_CAPABILITIES).some((result) => result.id === 'linear-algebra-matrix-vector')).toBe(true)
    expect(searchGuide('dot', ACTIVE_CAPABILITIES).some((result) => result.id === 'linear-algebra-matrix-vector')).toBe(true)
  })

  it('distinguishes sigma from the summation operator', () => {
    const results = searchGuide('sigma', ACTIVE_CAPABILITIES)

    expect(results.some((result) => result.title.includes('Σ') || result.description.toLowerCase().includes('sigma'))).toBe(true)
  })
})
