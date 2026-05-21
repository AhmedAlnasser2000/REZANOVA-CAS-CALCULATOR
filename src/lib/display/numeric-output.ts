import type { ScientificNotationStyle, Settings, NumericNotationMode } from '../../types/calculator';

const NEAR_ZERO_EPSILON = 1e-10;
const DEFAULT_APPROX_DIGITS = 6;
const DEFAULT_NOTATION_MODE: NumericNotationMode = 'decimal';
const DEFAULT_SCIENTIFIC_STYLE: ScientificNotationStyle = 'times10';
const AUTO_LARGE_THRESHOLD = 1e6;
const AUTO_SMALL_THRESHOLD = 1e-4;

export type NumericOutputSettings = Pick<
  Settings,
  'approxDigits' | 'numericNotationMode' | 'scientificNotationStyle'
>;

let currentNumericOutputSettings: NumericOutputSettings = {
  approxDigits: DEFAULT_APPROX_DIGITS,
  numericNotationMode: DEFAULT_NOTATION_MODE,
  scientificNotationStyle: DEFAULT_SCIENTIFIC_STYLE,
};

function normalizeZero(value: number) {
  return Math.abs(value) < NEAR_ZERO_EPSILON ? 0 : value;
}

function trimRoundedText(text: string) {
  return text.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '').replace(/\.$/, '');
}

function formatPlainDecimal(value: number, digits: number) {
  const rounded = normalizeZero(value);
  if (rounded === 0) {
    return '0';
  }

  const absValue = Math.abs(rounded);
  if (absValue >= 1) {
    return trimRoundedText(rounded.toFixed(digits));
  }

  const leadingFractionalZeros = Math.max(0, Math.ceil(-Math.log10(absValue)) - 1);
  return trimRoundedText(rounded.toFixed(leadingFractionalZeros + digits));
}

function formatScientific(value: number, digits: number, style: ScientificNotationStyle) {
  const normalized = normalizeZero(value);
  if (normalized === 0) {
    return '0';
  }

  const exponent = Math.floor(Math.log10(Math.abs(normalized)));
  const mantissa = normalized / (10 ** exponent);
  const mantissaText = trimRoundedText(mantissa.toFixed(digits));

  if (style === 'e') {
    return `${mantissaText}e${exponent}`;
  }

  return `${mantissaText} × 10^${exponent}`;
}

function resolveNumericOutputSettings(
  overrides?: Partial<NumericOutputSettings>,
): NumericOutputSettings {
  return {
    approxDigits: clampApproxDigits(overrides?.approxDigits ?? currentNumericOutputSettings.approxDigits),
    numericNotationMode: overrides?.numericNotationMode ?? currentNumericOutputSettings.numericNotationMode,
    scientificNotationStyle: overrides?.scientificNotationStyle ?? currentNumericOutputSettings.scientificNotationStyle,
  };
}

function shouldUseScientific(
  normalizedValue: number,
  notationMode: NumericNotationMode,
) {
  if (normalizedValue === 0) {
    return false;
  }

  if (notationMode === 'scientific') {
    return true;
  }

  if (notationMode === 'decimal') {
    return false;
  }

  const absValue = Math.abs(normalizedValue);
  return absValue >= AUTO_LARGE_THRESHOLD || absValue < AUTO_SMALL_THRESHOLD;
}

function isPlainNumericLiteral(text: string) {
  return /^[+-]?(?:\d+\.?\d*|\d*\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim());
}

export function clampApproxDigits(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_APPROX_DIGITS;
  }

  return Math.min(20, Math.max(0, Math.trunc(value)));
}

export function setNumericOutputSettings(settings: NumericOutputSettings) {
  currentNumericOutputSettings = resolveNumericOutputSettings(settings);
}

export function getNumericOutputSettings() {
  return currentNumericOutputSettings;
}

export function formatApproxNumber(
  value: number,
  overrides?: Partial<NumericOutputSettings>,
) {
  if (!Number.isFinite(value)) {
    return 'undefined';
  }

  const settings = resolveNumericOutputSettings(overrides);
  const normalized = normalizeZero(value);

  if (shouldUseScientific(normalized, settings.numericNotationMode)) {
    return formatScientific(normalized, settings.approxDigits, settings.scientificNotationStyle);
  }

  return formatPlainDecimal(normalized, settings.approxDigits);
}

export function formatApproxLiteral(text: string) {
  const trimmed = text.trim();
  if (!trimmed || !isPlainNumericLiteral(trimmed)) {
    return trimmed;
  }

  const numericValue = Number(trimmed);
  return Number.isFinite(numericValue) ? formatApproxNumber(numericValue) : trimmed;
}
