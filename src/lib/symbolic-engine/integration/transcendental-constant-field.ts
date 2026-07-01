import type {
  ExactSupplementEntry,
  ExactSupplementRelation,
} from '../../../types/calculator/exact-supplement-types';
import { mergeExactSupplementLatex } from '../../algebra/exact-supplements';
import { wrapGroupedLatex } from '../patterns';
import {
  parseSymbolicCoefficient,
  type SymbolicCoefficient,
  type SymbolicCoefficientFact,
  type SymbolicCoefficientStopReason,
} from '../primitives/coefficient-domain';

type RelationalExactSupplementEntry = Extract<ExactSupplementEntry, { kind: 'condition' | 'exclusion' }>;

export type TranscendentalConstantFieldFactKind =
  | 'nonzero'
  | 'positive'
  | 'negative'
  | 'nonnegative'
  | 'zero'
  | 'nonunit'
  | 'denominator-nonzero'
  | 'branch-domain'
  | 'branch-exclusion'
  | 'interval-open-unit'
  | 'greater-than-one';

export type TranscendentalConstantFieldFactRelation =
  | ExactSupplementRelation
  | '\\ne1'
  | '0<expr<1'
  | '>1';

export type TranscendentalConstantFieldFactSource =
  | 'constant-field'
  | 'denominator'
  | 'branch'
  | 'proof-obligation';

export type TranscendentalConstantFieldFact = {
  kind: TranscendentalConstantFieldFactKind;
  expressionLatex: string;
  relation: TranscendentalConstantFieldFactRelation;
  source: TranscendentalConstantFieldFactSource;
};

export type TranscendentalConstantFieldStopReason =
  | 'branch-sensitive-carrier'
  | 'decimal-coefficient'
  | 'node-limit'
  | 'selected-variable-dependent'
  | 'unsupported-transcendental-constant'
  | 'unrepresentable-fact'
  | 'zero-denominator';

export type TranscendentalConstantFieldSuccess = {
  kind: 'constant';
  variable: string;
  coefficient: SymbolicCoefficient;
  facts: TranscendentalConstantFieldFact[];
  exactSupplementEntries?: ExactSupplementEntry[];
  exactSupplementLatex?: string[];
};

export type TranscendentalConstantFieldStop = {
  kind: 'stop';
  variable: string;
  reason: TranscendentalConstantFieldStopReason;
  detail: string;
};

export type TranscendentalConstantFieldResult =
  | TranscendentalConstantFieldSuccess
  | TranscendentalConstantFieldStop;

const EXACT_RELATIONS = new Set<TranscendentalConstantFieldFactRelation>([
  '\\ge0',
  '>0',
  '\\ne0',
  '=0',
  '<0',
  '\\ne1',
  '0<expr<1',
  '>1',
]);

function normalizeLatexKey(value: string) {
  return value.replace(/\s+/g, '');
}

function stop(
  variable: string,
  reason: TranscendentalConstantFieldStopReason,
  detail: string,
): TranscendentalConstantFieldStop {
  return { kind: 'stop', variable, reason, detail };
}

function relationForKind(
  kind: TranscendentalConstantFieldFactKind,
): TranscendentalConstantFieldFactRelation {
  switch (kind) {
    case 'positive':
    case 'branch-domain':
      return '>0';
    case 'negative':
      return '<0';
    case 'nonnegative':
      return '\\ge0';
    case 'zero':
      return '=0';
    case 'nonunit':
      return '\\ne1';
    case 'interval-open-unit':
      return '0<expr<1';
    case 'greater-than-one':
      return '>1';
    case 'branch-exclusion':
    case 'denominator-nonzero':
    case 'nonzero':
      return '\\ne0';
    default:
      return '\\ne0';
  }
}

function sourceForKind(
  kind: TranscendentalConstantFieldFactKind,
): TranscendentalConstantFieldFactSource {
  if (kind === 'denominator-nonzero') {
    return 'denominator';
  }
  if (kind === 'branch-domain' || kind === 'branch-exclusion' || kind === 'interval-open-unit') {
    return 'branch';
  }
  return 'constant-field';
}

function offsetExpressionLatex(expressionLatex: string, offset: -1 | 1) {
  const grouped = wrapGroupedLatex(expressionLatex.trim());
  return offset === -1 ? `${grouped}-1` : `1-${grouped}`;
}

function exactEntry(
  expressionLatex: string,
  relation: ExactSupplementRelation,
): RelationalExactSupplementEntry {
  return {
    kind: relation === '\\ne0' ? 'exclusion' : 'condition',
    expressionLatex,
    relation,
    source: 'candidate-validation',
  };
}

function coefficientStopReason(
  reason: SymbolicCoefficientStopReason,
): TranscendentalConstantFieldStopReason {
  switch (reason) {
    case 'branch-sensitive':
      return 'branch-sensitive-carrier';
    case 'inexact-coefficient':
      return 'decimal-coefficient';
    case 'selected-variable-dependent-coefficient':
      return 'selected-variable-dependent';
    case 'unsupported-transcendental-coefficient':
      return 'unsupported-transcendental-constant';
    case 'zero-denominator':
      return 'zero-denominator';
    case 'node-limit':
    default:
      return 'node-limit';
  }
}

export function transcendentalConstantFieldFact(
  kind: TranscendentalConstantFieldFactKind,
  expressionLatex: string,
  options: {
    relation?: TranscendentalConstantFieldFactRelation;
    source?: TranscendentalConstantFieldFactSource;
  } = {},
): TranscendentalConstantFieldFact {
  return {
    kind,
    expressionLatex: expressionLatex.trim(),
    relation: options.relation ?? relationForKind(kind),
    source: options.source ?? sourceForKind(kind),
  };
}

export function coefficientFactsToTranscendentalConstantFacts(
  facts: SymbolicCoefficientFact[],
): TranscendentalConstantFieldFact[] {
  return facts.map((fact) =>
    transcendentalConstantFieldFact('denominator-nonzero', fact.expressionLatex, {
      relation: fact.relation,
      source: 'denominator',
    }));
}

export function mergeTranscendentalConstantFieldFacts(
  facts: TranscendentalConstantFieldFact[],
): TranscendentalConstantFieldFact[] {
  const merged = new Map<string, TranscendentalConstantFieldFact>();
  for (const fact of facts) {
    const key = [
      fact.kind,
      normalizeLatexKey(fact.expressionLatex),
      fact.relation,
      fact.source,
    ].join(':');
    if (!merged.has(key)) {
      merged.set(key, fact);
    }
  }
  return [...merged.values()];
}

export function validateTranscendentalConstantFieldFacts(
  facts: TranscendentalConstantFieldFact[],
): { kind: 'success' } | TranscendentalConstantFieldStop {
  for (const fact of facts) {
    if (!fact.expressionLatex.trim() || !EXACT_RELATIONS.has(fact.relation)) {
      return stop(
        'unknown',
        'unrepresentable-fact',
        'A transcendental proof fact could not be represented in the exact supplement relation set.',
      );
    }
  }
  return { kind: 'success' };
}

export function transcendentalConstantFactsToExactSupplementEntries(
  facts: TranscendentalConstantFieldFact[],
): ExactSupplementEntry[] {
  const entries = facts.flatMap((fact): RelationalExactSupplementEntry[] => {
    if (fact.relation === '\\ne1') {
      return [exactEntry(offsetExpressionLatex(fact.expressionLatex, -1), '\\ne0')];
    }
    if (fact.relation === '0<expr<1') {
      return [
        exactEntry(fact.expressionLatex, '>0'),
        exactEntry(offsetExpressionLatex(fact.expressionLatex, 1), '>0'),
      ];
    }
    if (fact.relation === '>1') {
      return [exactEntry(offsetExpressionLatex(fact.expressionLatex, -1), '>0')];
    }
    return [exactEntry(fact.expressionLatex, fact.relation)];
  });

  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${normalizeLatexKey(entry.expressionLatex)}:${entry.relation}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function transcendentalConstantFactsToExactSupplementLatex(
  facts: TranscendentalConstantFieldFact[],
): string[] | undefined {
  const validation = validateTranscendentalConstantFieldFacts(facts);
  if (validation.kind !== 'success') {
    return undefined;
  }

  const entries = transcendentalConstantFactsToExactSupplementEntries(
    mergeTranscendentalConstantFieldFacts(facts),
  );
  const lines = mergeExactSupplementLatex({
    entries,
    source: 'candidate-validation',
  });
  return lines.length > 0 ? lines : undefined;
}

export function classifyTranscendentalConstantExpression(
  node: unknown,
  variable = 'x',
): TranscendentalConstantFieldResult {
  const parsed = parseSymbolicCoefficient(node, variable);
  if (parsed.kind === 'stop') {
    const reason = coefficientStopReason(parsed.reason);
    return stop(
      variable,
      reason,
      parsed.detail ?? `Expression is outside the transcendental constant field: ${reason}.`,
    );
  }

  const facts = mergeTranscendentalConstantFieldFacts(
    coefficientFactsToTranscendentalConstantFacts(parsed.coefficient.facts),
  );
  const entries = transcendentalConstantFactsToExactSupplementEntries(facts);
  const latex = transcendentalConstantFactsToExactSupplementLatex(facts);

  return {
    kind: 'constant',
    variable,
    coefficient: parsed.coefficient,
    facts,
    exactSupplementEntries: entries.length > 0 ? entries : undefined,
    exactSupplementLatex: latex,
  };
}
