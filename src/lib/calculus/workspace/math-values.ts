import type {
  CalculusScreen,
  DisplayDetailLinePart,
  DisplayDetailSection,
  ResultProducerDraft,
} from '../../../types/calculator';
import {
  tryProvenCanonicalMathValue,
  requireProvenCanonicalMathValueV2,
  type CanonicalResultProducerMathValuesV1,
  type CanonicalResultV2MathResolver,
  type ProvenCanonicalMathValue,
  type ProvenCanonicalMathValueV2,
} from '../../result-contract';
import type { MathJsonRouteId } from '../../result-contract/mathjson-route-registry';
import type { CalculusOwnedMathJsonLeaf } from '../engine/shared';

export type CalculusMathJsonRouteId = Extract<MathJsonRouteId, `calculus.${string}`>;

function unprovenMathValue(canonicalLatex: string) {
  return { canonicalLatex };
}

function detailParts(
  part: DisplayDetailLinePart,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return part.kind === 'math'
    ? { kind: 'math' as const, math: proven.get(part.latex) ?? unprovenMathValue(part.latex) }
    : { kind: 'text' as const, text: part.text };
}

function detailValues(
  sections: readonly DisplayDetailSection[] | undefined,
  proven: ReadonlyMap<string, ProvenCanonicalMathValue>,
) {
  return sections?.map((section, sectionIndex) => ({
    title: section.title,
    lines: section.lines.map((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      if (parts?.length) return parts.map((part) => detailParts(part, proven));
      const kind = section.lineKinds?.[lineIndex] ?? section.lineKind;
      if (kind === 'math') {
        return [{ kind: 'math' as const, math: proven.get(line) ?? unprovenMathValue(line) }];
      }
      if (kind === 'text') return [{ kind: 'text' as const, text: line }];
      throw new Error(`Calculus producer detail ${sectionIndex}:${lineIndex} has no typed intent.`);
    }),
  }));
}

export function calculusMathValuesFromOwnedLeaves(input: {
  outcome: Exclude<ResultProducerDraft, { kind: 'prompt' }>;
  routeId: CalculusMathJsonRouteId;
  leaves: readonly CalculusOwnedMathJsonLeaf[];
}): CanonicalResultProducerMathValuesV1 {
  const proven = new Map<string, ProvenCanonicalMathValue>();
  for (const leaf of input.leaves) {
    const value = tryProvenCanonicalMathValue({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'calculus',
      routeId: input.routeId,
      source: leaf.source,
    });
    if (!value) continue;
    const existing = proven.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Calculus producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    proven.set(leaf.canonicalLatex, value);
  }

  const values: CanonicalResultProducerMathValuesV1 = {};
  const success = input.outcome.kind === 'success' ? input.outcome : undefined;
  if (input.outcome.exactLatex) {
    values.primaryMath = proven.get(input.outcome.exactLatex)
      ?? unprovenMathValue(input.outcome.exactLatex);
  }
  if (success?.answerRows) {
    values.answerRows = {
      ...(success.answerRows.label ? { label: success.answerRows.label } : {}),
      rows: success.answerRows.rows.map((row) => ({
        math: proven.get(row.latex) ?? unprovenMathValue(row.latex),
        ...(row.label ? { label: row.label } : {}),
      })),
    };
  }
  if (input.outcome.exactSupplementLatex?.length) {
    values.supplements = input.outcome.exactSupplementLatex.map((latex) =>
      proven.get(latex) ?? unprovenMathValue(latex));
  }
  const details = detailValues(input.outcome.detailSections, proven);
  if (details?.length) values.details = details;
  if (input.outcome.resolvedInputLatex) {
    values.metadata = {
      resolvedInput: proven.get(input.outcome.resolvedInputLatex)
        ?? unprovenMathValue(input.outcome.resolvedInputLatex),
    };
  }
  if (success?.variableSubstitutions?.length) {
    values.metadata = {
      ...(values.metadata ?? {}),
      variableSubstitutions: success.variableSubstitutions.map((substitution) => ({
        name: substitution.name,
        value: proven.get(substitution.valueLatex)
          ?? unprovenMathValue(substitution.valueLatex),
        numericValue: substitution.numericValue,
      })),
    };
  }
  return values;
}

export function calculusV2MathResolverFromOwnedLeaves(input: {
  routeId: CalculusMathJsonRouteId;
  leaves: readonly CalculusOwnedMathJsonLeaf[];
}): CanonicalResultV2MathResolver {
  const proven = new Map<string, ProvenCanonicalMathValueV2>();
  for (const leaf of input.leaves) {
    const value = requireProvenCanonicalMathValueV2({
      canonicalLatex: leaf.canonicalLatex,
      mathJson: leaf.mathJson,
      owner: 'calculus',
      routeId: input.routeId,
      source: leaf.source,
    });
    const existing = proven.get(leaf.canonicalLatex);
    if (existing && JSON.stringify(existing.mathJson) !== JSON.stringify(value.mathJson)) {
      throw new Error(`Calculus V2 producer supplied conflicting trees for ${leaf.canonicalLatex}.`);
    }
    proven.set(leaf.canonicalLatex, value);
  }
  return (canonicalLatex, path) => {
    const value = proven.get(canonicalLatex);
    if (!value) {
      throw new Error(`Calculus V2 producer is missing MathJSON proof at ${path}.`);
    }
    return value;
  };
}

export function calculusMathJsonRouteForScreen(
  screen: CalculusScreen,
): CalculusMathJsonRouteId {
  if (
    screen === 'derivative'
    || screen === 'derivativePoint'
    || screen === 'implicitDerivative'
  ) return 'calculus.derivatives';
  if (screen === 'partialDerivative') return 'calculus.partials';
  if (
    screen === 'indefiniteIntegral'
    || screen === 'definiteIntegral'
    || screen === 'improperIntegral'
  ) return 'calculus.integrals';
  if (screen === 'limit' || screen === 'finiteLimit' || screen === 'infiniteLimit') {
    return 'calculus.limits';
  }
  if (screen === 'maclaurin' || screen === 'taylor' || screen === 'laplace') {
    return 'calculus.series-transforms';
  }
  return 'calculus.ode-ivp';
}
