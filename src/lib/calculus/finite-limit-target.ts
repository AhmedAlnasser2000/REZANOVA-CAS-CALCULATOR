import type { LimitDirection } from '../../types/calculator';
import {
  formatSignedNumberInput,
  parseSignedNumberInput,
} from '../signed-number';

export type ParsedFiniteLimitTarget = {
  value: number;
  normalizedTargetLatex: string;
  directionOverride?: Exclude<LimitDirection, 'two-sided'>;
};

const DIRECTIONAL_TARGET_PATTERN =
  /^(.+?)\^\s*(?:\{\s*([+-])\s*\}|([+-]))$/;

function compactTargetDraft(value: string) {
  return value
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replace(/\s+/g, '');
}

export function parseFiniteLimitTargetDraft(value: string): ParsedFiniteLimitTarget | null {
  const compact = compactTargetDraft(value);
  if (!compact) {
    return null;
  }

  const directionalMatch = compact.match(DIRECTIONAL_TARGET_PATTERN);
  const numericDraft = directionalMatch ? directionalMatch[1] : compact;
  const directionMark = directionalMatch?.[2] ?? directionalMatch?.[3];
  const parsed = parseSignedNumberInput(numericDraft);
  if (parsed === null) {
    return null;
  }

  return {
    value: parsed,
    normalizedTargetLatex: formatSignedNumberInput(parsed),
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
