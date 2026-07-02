import type { LimitDirection } from '../../../types/calculator';
import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../../numeric/signed-number';

export type ParsedFiniteLimitTarget = {
  value: number;
  normalizedTargetLatex: string;
  directionOverride?: Exclude<LimitDirection, 'two-sided'>;
};

const DIRECTIONAL_TARGET_PATTERN =
  /^(.+?)\^\s*(?:\{\s*([+-])\s*\}|([+-]))$/;
const PLAIN_DIRECTIONAL_TARGET_PATTERN =
  /^(.+?)([+-])$/;

function compactTargetDraft(value: string) {
  return value
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replaceAll('π', '\\pi')
    .replaceAll('∞', '\\infty')
    .replace(/\s+/g, '');
}

function parseFracTarget(compact: string) {
  const match = compact.match(/^\\frac\{(.+)\}\{([1-9]\d*)\}$/u);
  if (!match) {
    return null;
  }

  return {
    numerator: match[1],
    denominator: Number(match[2]),
  };
}

function parsePiNumerator(value: string) {
  if (value === '\\pi' || value === 'pi') {
    return 1;
  }

  if (value === '-\\pi' || value === '-pi') {
    return -1;
  }

  const match = value.match(/^([+-]?\d+)\\?pi$/u);
  if (!match) {
    return null;
  }

  return Number(match[1]);
}

function parseExactConstantTarget(compact: string) {
  if (compact === 'e' || compact === '\\mathrm{e}') {
    return {
      value: Math.E,
      normalizedTargetLatex: 'e',
    };
  }

  if (compact === '-e' || compact === '-\\mathrm{e}') {
    return {
      value: -Math.E,
      normalizedTargetLatex: '-e',
    };
  }

  const frac = parseFracTarget(compact);
  if (frac) {
    const piNumerator = parsePiNumerator(frac.numerator);
    if (piNumerator !== null) {
      const sign = piNumerator < 0 ? '-' : '';
      const magnitude = Math.abs(piNumerator);
      const numeratorLatex = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
      return {
        value: (piNumerator * Math.PI) / frac.denominator,
        normalizedTargetLatex: `${sign}\\frac{${numeratorLatex}}{${frac.denominator}}`,
      };
    }
    return null;
  }

  const slashPi = compact.match(/^([+-]?(?:\d+)?)\\?pi\/([1-9]\d*)$/u);
  if (slashPi) {
    const rawCoefficient = slashPi[1];
    const coefficient =
      rawCoefficient === '' || rawCoefficient === '+'
        ? 1
        : rawCoefficient === '-'
          ? -1
          : Number(rawCoefficient);
    const denominator = Number(slashPi[2]);
    if (!Number.isFinite(coefficient) || !Number.isFinite(denominator)) {
      return null;
    }
    const sign = coefficient < 0 ? '-' : '';
    const magnitude = Math.abs(coefficient);
    const numeratorLatex = magnitude === 1 ? '\\pi' : `${magnitude}\\pi`;
    return {
      value: (coefficient * Math.PI) / denominator,
      normalizedTargetLatex: `${sign}\\frac{${numeratorLatex}}{${denominator}}`,
    };
  }

  const piCoefficient = parsePiNumerator(compact);
  if (piCoefficient !== null) {
    if (piCoefficient === 1) {
      return {
        value: Math.PI,
        normalizedTargetLatex: '\\pi',
      };
    }
    if (piCoefficient === -1) {
      return {
        value: -Math.PI,
        normalizedTargetLatex: '-\\pi',
      };
    }
    return {
      value: piCoefficient * Math.PI,
      normalizedTargetLatex: `${piCoefficient}\\pi`,
    };
  }

  return null;
}

export function parseFiniteLimitTargetDraft(value: string): ParsedFiniteLimitTarget | null {
  const compact = compactTargetDraft(value);
  if (!compact) {
    return null;
  }

  const directionalMatch = compact.match(DIRECTIONAL_TARGET_PATTERN);
  const plainDirectionalMatch = directionalMatch
    ? null
    : compact.match(PLAIN_DIRECTIONAL_TARGET_PATTERN);
  const numericDraft = directionalMatch ? directionalMatch[1] : compact;
  const effectiveDraft = plainDirectionalMatch ? plainDirectionalMatch[1] : numericDraft;
  const directionMark = directionalMatch?.[2] ?? directionalMatch?.[3] ?? plainDirectionalMatch?.[2];
  const parsedNumber = parseSignedNumberInput(effectiveDraft);
  const parsed = parsedNumber === null
    ? parseExactConstantTarget(effectiveDraft)
    : {
        value: parsedNumber,
        normalizedTargetLatex: formatSignedNumberInput(parsedNumber),
      };
  if (parsed === null) {
    return null;
  }

  return {
    value: parsed.value,
    normalizedTargetLatex: parsed.normalizedTargetLatex,
    directionOverride:
      directionMark === '+'
        ? 'right'
        : directionMark === '-'
          ? 'left'
          : undefined,
  };
}

export function finiteLimitTargetLatex(
  target: string,
  direction: LimitDirection,
) {
  const parsed = parseFiniteLimitTargetDraft(target);
  if (!parsed) {
    return '';
  }

  const effectiveDirection = parsed.directionOverride ?? direction;

  if (effectiveDirection === 'left') {
    return `${parsed.normalizedTargetLatex}^{-}`;
  }

  if (effectiveDirection === 'right') {
    return `${parsed.normalizedTargetLatex}^{+}`;
  }

  return parsed.normalizedTargetLatex;
}

export function finiteLimitTargetDirection(
  target: string,
  direction: LimitDirection,
): LimitDirection {
  return parseFiniteLimitTargetDraft(target)?.directionOverride ?? direction;
}

type DirectionalLimitNormalization = {
  latex: string;
  directionOverride?: Exclude<LimitDirection, 'two-sided'>;
};

const DIRECTIONAL_LIMIT_TARGET_PATTERN =
  /\\lim_\{\s*([a-zA-Z])\s*\\to\s*([+-]?(?:(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*\^\s*(?:\{\s*([+-])\s*\}|([+-]))\s*)\}/;

export function normalizeDirectionalLimitLatex(
  latex: string,
): DirectionalLimitNormalization {
  let directionOverride: Exclude<LimitDirection, 'two-sided'> | undefined;
  const normalizedLatex = latex.replace(
    DIRECTIONAL_LIMIT_TARGET_PATTERN,
    (fullMatch, variable: string, targetDraft: string) => {
      const parsed = parseFiniteLimitTargetDraft(targetDraft);
      if (!parsed?.directionOverride) {
        return fullMatch;
      }

      directionOverride = parsed.directionOverride;
      return `\\lim_{${variable}\\to ${parsed.normalizedTargetLatex}}`;
    },
  );

  return {
    latex: normalizedLatex,
    directionOverride,
  };
}
