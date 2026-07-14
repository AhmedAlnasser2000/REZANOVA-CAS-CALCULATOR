import type { CanonicalMathValueV1 } from '../../../types/calculator';
import { validateSerializableMathJson } from './math-json';
import {
  printCompatibilityLatex,
  printMathJson,
  type PrintedMath,
} from './printer';

export type ProfiledDisplayMath = {
  canonicalLatex: string;
  primaryMath: CanonicalMathValueV1;
  changed: boolean;
  source: Extract<PrintedMath, { ok: true }>['source'];
};

export function createProfiledMathValue(
  canonicalLatex: string | undefined,
  mathJson: unknown,
): CanonicalMathValueV1 | undefined {
  if (!canonicalLatex?.trim()) {
    return undefined;
  }

  const validation = validateSerializableMathJson(mathJson);
  return {
    canonicalLatex,
    ...(validation.ok ? { mathJson: validation.validated.value } : {}),
  };
}

export function hasPrimaryMathParity(input: {
  exactLatex?: string;
  primaryMath?: CanonicalMathValueV1;
}) {
  return !input.primaryMath || input.primaryMath.canonicalLatex === input.exactLatex;
}

export function profileMathValue(
  compatibilityLatex: string | undefined,
  mathJson: unknown,
): ProfiledDisplayMath | undefined {
  if (!compatibilityLatex?.trim()) return undefined;

  const printed = printMathJson({
    mathJson,
    compatibilityLatex,
    profile: 'pedagogical-v1',
    target: 'canonical-latex',
  });
  const exactLatex = printed.ok ? printed.canonicalLatex : compatibilityLatex;
  const primaryMath = createProfiledMathValue(exactLatex, mathJson);
  if (!primaryMath) return undefined;

  return {
    canonicalLatex: exactLatex,
    primaryMath,
    changed: exactLatex !== compatibilityLatex,
    source: printed.ok ? printed.source : 'compatibility-fallback',
  };
}

export function profileDomainMathValue(
  compatibilityLatex: string | undefined,
  mathJson: unknown,
): ProfiledDisplayMath | undefined {
  if (!compatibilityLatex?.trim()) return undefined;

  const printed = printCompatibilityLatex(
    compatibilityLatex,
    { profile: 'pedagogical-v1', target: 'canonical-latex' },
    'domain-adapter',
  );
  const exactLatex = printed.ok ? printed.canonicalLatex : compatibilityLatex;
  const primaryMath = createProfiledMathValue(exactLatex, mathJson);
  if (!primaryMath) return undefined;

  return {
    canonicalLatex: exactLatex,
    primaryMath,
    changed: false,
    source: printed.ok ? printed.source : 'compatibility-fallback',
  };
}
