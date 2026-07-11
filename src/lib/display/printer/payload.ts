import type { DisplayMathPayloadV1 } from '../../../types/calculator';
import { validateSerializableMathJson } from './math-json';

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
