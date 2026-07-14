import { ComputeEngine } from '@cortex-js/compute-engine';
import { roundedApproxNumberValue } from '../display/notation/numeric-output';
import { printMathJson } from '../display/printer';
import type { LinearAlgebraCanonicalLeafEvidence } from './canonical-evidence';

const ce = new ComputeEngine();

const NUMERIC_EXPRESSION_OPERATORS = new Set([
  'Abs',
  'Add',
  'Divide',
  'Multiply',
  'Negate',
  'Power',
  'Rational',
  'Root',
  'Sqrt',
  'Subtract',
]);

type Approximation = {
  changed: boolean;
  mathJson: unknown;
};

function evaluatedRealNumber(mathJson: unknown): number | undefined {
  try {
    const numericJson = ce
      .box(mathJson as Parameters<typeof ce.box>[0], { form: 'structural' })
      .N()
      .json;
    if (typeof numericJson === 'number') {
      return Number.isFinite(numericJson) ? numericJson : undefined;
    }
    if (
      numericJson
      && typeof numericJson === 'object'
      && 'num' in numericJson
      && typeof numericJson.num === 'string'
    ) {
      const numeric = Number(numericJson.num);
      return Number.isFinite(numeric) ? numeric : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function approximateMathJson(mathJson: unknown, approxDigits: number): Approximation {
  if (typeof mathJson === 'number') {
    if (!Number.isFinite(mathJson) || Number.isInteger(mathJson)) {
      return { changed: false, mathJson };
    }
    return {
      changed: true,
      mathJson: roundedApproxNumberValue(mathJson, { approxDigits }) ?? mathJson,
    };
  }

  if (!Array.isArray(mathJson)) {
    return { changed: false, mathJson: structuredClone(mathJson) };
  }

  const operator = mathJson[0];
  if (typeof operator === 'string' && NUMERIC_EXPRESSION_OPERATORS.has(operator)) {
    const numeric = evaluatedRealNumber(mathJson);
    if (numeric !== undefined && !Number.isInteger(numeric)) {
      return {
        changed: true,
        mathJson: roundedApproxNumberValue(numeric, { approxDigits }) ?? numeric,
      };
    }
  }

  let changed = false;
  const entries = mathJson.map((entry, index) => {
    if (index === 0) return structuredClone(entry);
    const approximation = approximateMathJson(entry, approxDigits);
    changed ||= approximation.changed;
    return approximation.mathJson;
  });
  return { changed, mathJson: entries };
}

export function linearAlgebraDecimalReadback(
  evidence: LinearAlgebraCanonicalLeafEvidence | undefined,
  approxDigits = 6,
): string | undefined {
  if (!evidence) return undefined;
  const approximation = approximateMathJson(evidence.mathJson, approxDigits);
  if (!approximation.changed) return undefined;
  const printed = printMathJson({
    mathJson: approximation.mathJson,
    profile: 'pedagogical-v1',
    target: 'canonical-latex',
  });
  return printed.ok ? printed.canonicalLatex : undefined;
}
