import type { DisplayMathPayloadV1 } from '../../../types/calculator';
import { validateSerializableMathJson } from './math-json';
import {
  printCompatibilityLatex,
  printMathJson,
  type PrintedMath,
} from './printer';

export type ProfiledDisplayMath = {
  canonicalLatex: string;
  canonicalMath: DisplayMathPayloadV1;
  changed: boolean;
  source: Extract<PrintedMath, { ok: true }>['source'];
};

export function createDisplayMathPayload(
  canonicalLatex: string | undefined,
  mathJson: unknown,
): DisplayMathPayloadV1 | undefined {
  if (!canonicalLatex?.trim()) {
    return undefined;
  }

  const validation = validateSerializableMathJson(mathJson);
  return {
    version: 1,
    canonicalLatex,
    ...(validation.ok ? { mathJson: validation.validated.value } : {}),
  };
}

export function hasDisplayMathPayloadParity(input: {
  exactLatex?: string;
  canonicalMath?: DisplayMathPayloadV1;
}) {
  return !input.canonicalMath || input.canonicalMath.canonicalLatex === input.exactLatex;
}

export function profileDisplayMathPayload(
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
  const canonicalMath = createDisplayMathPayload(exactLatex, mathJson);
  if (!canonicalMath) return undefined;

  return {
    canonicalLatex: exactLatex,
    canonicalMath,
    changed: exactLatex !== compatibilityLatex,
    source: printed.ok ? printed.source : 'compatibility-fallback',
  };
}

export function profileDomainDisplayMathPayload(
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
  const canonicalMath = createDisplayMathPayload(exactLatex, mathJson);
  if (!canonicalMath) return undefined;

  return {
    canonicalLatex: exactLatex,
    canonicalMath,
    changed: false,
    source: printed.ok ? printed.source : 'compatibility-fallback',
  };
}
