export const MAX_RESULT_MAGNITUDE = 1e150
export const MIN_RESULT_MAGNITUDE = 1e-150

export function getTooLargeResultMessage() {
  return 'Result is too large to display safely. Supported magnitude is about 1×10^-150 to 1×10^150.'
}

export function getTooSmallResultMessage() {
  return 'Result is too small to display safely. Supported magnitude is about 1×10^-150 to 1×10^150.'
}

function normalizeNumericText(value: string) {
  return value
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replaceAll('\\cdot', '×')
    .replaceAll('\\times', '×')
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replace(/\s+/g, '')
    .trim()
}

function scientificLog10(value: string) {
  const powerOfTenMatch = value.match(/^([+-])?10\^([+-]?\d+)$/)
  if (powerOfTenMatch) {
    const exponent = Number(powerOfTenMatch[2])
    return Number.isFinite(exponent) ? exponent : undefined
  }

  const scientificMatch = value.match(/^([+-]?\d+(?:\.\d+)?)×10\^([+-]?\d+)$/)
    ?? value.match(/^([+-]?\d+(?:\.\d+)?)[eE]([+-]?\d+)$/)

  if (!scientificMatch) {
    return undefined
  }

  const coefficient = Number(scientificMatch[1])
  const exponent = Number(scientificMatch[2])
  if (!Number.isFinite(coefficient) || !Number.isFinite(exponent) || coefficient === 0) {
    return coefficient === 0 ? Number.NEGATIVE_INFINITY : undefined
  }

  return Math.log10(Math.abs(coefficient)) + exponent
}

function decimalLog10(value: string) {
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(value)) {
    return undefined
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    const normalized = value.replace(/^[+-]/, '')
    if (!normalized.includes('.')) {
      return normalized.replace(/^0+/, '').length - 1
    }
    const [whole, fraction] = normalized.split('.')
    if (whole && whole !== '0') {
      return whole.replace(/^0+/, '').length - 1
    }
    const firstNonZero = fraction?.search(/[1-9]/) ?? -1
    return firstNonZero >= 0 ? -(firstNonZero + 1) : Number.NEGATIVE_INFINITY
  }

  if (numeric === 0) {
    return Number.NEGATIVE_INFINITY
  }

  return Math.log10(Math.abs(numeric))
}

function parseMagnitudeLog10(value?: string) {
  if (!value) {
    return undefined
  }

  const normalized = normalizeNumericText(value)
  if (!normalized || /[a-df-zA-DF-Z]/.test(normalized) || normalized.includes('i')) {
    return undefined
  }

  return scientificLog10(normalized) ?? decimalLog10(normalized)
}

export function getResultGuardError(...values: Array<string | undefined>) {
  for (const value of values) {
    const log10Magnitude = parseMagnitudeLog10(value)
    if (log10Magnitude === undefined || log10Magnitude === Number.NEGATIVE_INFINITY) {
      continue
    }

    const orderOfMagnitude = Math.floor(log10Magnitude)

    if (orderOfMagnitude > 150) {
      return getTooLargeResultMessage()
    }

    if (orderOfMagnitude < -150) {
      return getTooSmallResultMessage()
    }
  }

  return undefined
}
