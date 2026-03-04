import { describe, expect, it } from 'vitest'
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities'
import {
  clampGuideIndex,
  getGuideListEntries,
  getGuideParentRoute,
  getGuideRouteMeta,
  moveGuideIndex,
} from './navigation'

describe('guide navigation', () => {
  it('returns route metadata for home and article flows', () => {
    expect(getGuideRouteMeta({ screen: 'home' }, ACTIVE_CAPABILITIES).breadcrumb).toEqual([
      'Guide',
      'Home',
    ])

    expect(
      getGuideRouteMeta(
        { screen: 'article', articleId: 'calculus-derivatives' },
        ACTIVE_CAPABILITIES,
      ).breadcrumb,
    ).toEqual(['Guide', 'Calculus', 'Derivatives and Derivative at a Point'])
  })

  it('derives list entries for domains and mode guide', () => {
    const algebraEntries = getGuideListEntries(
      { screen: 'domain', domainId: 'algebra' },
      ACTIVE_CAPABILITIES,
    )
    const modeEntries = getGuideListEntries({ screen: 'modeGuide' }, ACTIVE_CAPABILITIES)

    expect(algebraEntries.map((entry) => entry.id)).toContain('algebra-manipulation')
    expect(modeEntries.map((entry) => entry.id)).toContain('equation')
  })

  it('supports one-level back behavior', () => {
    expect(getGuideParentRoute({ screen: 'home' })).toBeNull()
    expect(getGuideParentRoute({ screen: 'modeGuide', modeId: 'matrix' })).toEqual({
      screen: 'modeGuide',
    })
    expect(
      getGuideParentRoute({ screen: 'article', articleId: 'discrete-operators' }),
    ).toEqual({
      screen: 'domain',
      domainId: 'discrete',
    })
  })

  it('clamps and moves guide selection indices', () => {
    expect(clampGuideIndex(-4, 6)).toBe(0)
    expect(clampGuideIndex(99, 6)).toBe(5)
    expect(moveGuideIndex(0, -1, 6)).toBe(0)
    expect(moveGuideIndex(2, 2, 6)).toBe(4)
  })
})
