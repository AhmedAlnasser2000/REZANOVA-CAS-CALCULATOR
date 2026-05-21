import { describe, expect, it } from 'vitest'
import { getResultGuardError, getTooLargeResultMessage, getTooSmallResultMessage } from './result-guard'

describe('result guard', () => {
  it('allows values inside the supported display range', () => {
    expect(getResultGuardError('1.23×10^150')).toBeUndefined()
    expect(getResultGuardError('0.000001')).toBeUndefined()
  })

  it('rejects values above the supported display range', () => {
    expect(getResultGuardError('1×10^151')).toBe(getTooLargeResultMessage())
    expect(getResultGuardError('1' + '0'.repeat(151))).toBe(getTooLargeResultMessage())
  })

  it('rejects values below the supported display range', () => {
    expect(getResultGuardError('1×10^-151')).toBe(getTooSmallResultMessage())
    expect(getResultGuardError('10^-151')).toBe(getTooSmallResultMessage())
  })
})
