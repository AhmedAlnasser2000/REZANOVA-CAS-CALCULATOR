import type {
  CanonicalResultDocumentV1,
  CanonicalRuntimeOutcome,
  TableResponse,
} from '../../types/calculator';
import { resolveCanonicalResultForConsumer } from '../result-contract';

export type MathematicalFragmentKind =
  | 'primary-answer'
  | 'answer-row'
  | 'branch-target'
  | 'branch'
  | 'system-variable'
  | 'system-value'
  | 'periodic-carrier'
  | 'periodic-parameter'
  | 'periodic-constraint'
  | 'periodic-branch'
  | 'periodic-representative'
  | 'periodic-interval-bound'
  | 'periodic-piecewise-condition'
  | 'periodic-piecewise-result'
  | 'periodic-principal-range'
  | 'periodic-reduced-carrier'
  | 'supplement'
  | 'prompt-carry'
  | 'transform-summary'
  | 'action'
  | 'detail-math-line'
  | 'detail-math-part'
  | 'solve-summary-math-part'
  | 'resolved-input'
  | 'substitution-value'
  | 'table-x'
  | 'table-primary'
  | 'table-secondary';

export type MathematicalFragment = {
  path: string;
  kind: MathematicalFragmentKind;
  value: string;
};

export type MalformedMathMarker =
  | 'nan'
  | 'undefined'
  | 'object-object'
  | 'internal-error';

export type MalformedMathematicalFragment = MathematicalFragment & {
  marker: MalformedMathMarker;
};

function appendFragment(
  fragments: MathematicalFragment[],
  path: string,
  kind: MathematicalFragmentKind,
  value: string | undefined,
) {
  if (value !== undefined && value.length > 0) {
    fragments.push({ path, kind, value });
  }
}

function collectPeriodicFragments(
  document: CanonicalResultDocumentV1,
  fragments: MathematicalFragment[],
) {
  const periodic = document.periodicFamily;
  if (!periodic) return;

  appendFragment(fragments, 'canonicalResult.periodicFamily.carrier.canonicalLatex', 'periodic-carrier', periodic.carrier.canonicalLatex);
  appendFragment(fragments, 'canonicalResult.periodicFamily.parameter.canonicalLatex', 'periodic-parameter', periodic.parameter.canonicalLatex);
  periodic.parameterConstraints?.forEach((value, index) =>
    appendFragment(fragments, `canonicalResult.periodicFamily.parameterConstraints[${index}].canonicalLatex`, 'periodic-constraint', value.canonicalLatex));
  periodic.branches.forEach((value, index) =>
    appendFragment(fragments, `canonicalResult.periodicFamily.branches[${index}].canonicalLatex`, 'periodic-branch', value.canonicalLatex));
  periodic.representatives?.forEach((representative, index) =>
    appendFragment(
      fragments,
      `canonicalResult.periodicFamily.representatives[${index}].exact.canonicalLatex`,
      'periodic-representative',
      representative.exact?.canonicalLatex,
    ));
  periodic.suggestedIntervals?.forEach((interval, index) => {
    appendFragment(fragments, `canonicalResult.periodicFamily.suggestedIntervals[${index}].start.canonicalLatex`, 'periodic-interval-bound', interval.start.canonicalLatex);
    appendFragment(fragments, `canonicalResult.periodicFamily.suggestedIntervals[${index}].end.canonicalLatex`, 'periodic-interval-bound', interval.end.canonicalLatex);
  });
  periodic.piecewiseBranches?.forEach((branch, index) => {
    appendFragment(
      fragments,
      `canonicalResult.periodicFamily.piecewiseBranches[${index}].condition.canonicalLatex`,
      'periodic-piecewise-condition',
      branch.condition.canonicalLatex,
    );
    appendFragment(
      fragments,
      `canonicalResult.periodicFamily.piecewiseBranches[${index}].result.canonicalLatex`,
      'periodic-piecewise-result',
      branch.result.canonicalLatex,
    );
  });
  appendFragment(
    fragments,
    'canonicalResult.periodicFamily.principalRange.canonicalLatex',
    'periodic-principal-range',
    periodic.principalRange?.canonicalLatex,
  );
  appendFragment(
    fragments,
    'canonicalResult.periodicFamily.reducedCarrier.canonicalLatex',
    'periodic-reduced-carrier',
    periodic.reducedCarrier?.canonicalLatex,
  );
}

function collectDetailFragments(
  document: CanonicalResultDocumentV1,
  fragments: MathematicalFragment[],
) {
  document.details?.forEach((section, sectionIndex) => {
    section.lines.forEach((parts, lineIndex) => {
      const mathParts = parts.flatMap((part, partIndex) =>
        part.kind === 'math'
          ? [{ part, partIndex }]
          : []);

      if (parts.length === 1 && parts[0]?.kind === 'math') {
        appendFragment(
          fragments,
          `canonicalResult.details[${sectionIndex}].lines[${lineIndex}][0].math.canonicalLatex`,
          'detail-math-line',
          parts[0].math.canonicalLatex,
        );
      } else if (mathParts.length > 0) {
        mathParts.forEach(({ part, partIndex }) =>
          appendFragment(
            fragments,
            `canonicalResult.details[${sectionIndex}].lines[${lineIndex}][${partIndex}].math.canonicalLatex`,
            'detail-math-part',
            part.kind === 'math' ? part.math.canonicalLatex : undefined,
          ));
      }
    });
  });
  document.summaries?.solve?.forEach((parts, lineIndex) => {
    parts.forEach((part, partIndex) => {
      if (part.kind === 'math') {
        appendFragment(
          fragments,
          `canonicalResult.summaries.solve[${lineIndex}][${partIndex}].math.canonicalLatex`,
          'solve-summary-math-part',
          part.math.canonicalLatex,
        );
      }
    });
  });
}

export function collectCanonicalRuntimeMathFragments(outcome: CanonicalRuntimeOutcome): MathematicalFragment[] {
  const fragments: MathematicalFragment[] = [];
  if (outcome.kind === 'prompt') {
    appendFragment(fragments, 'carryLatex', 'prompt-carry', outcome.carryLatex);
    return fragments;
  }

  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(
      `Print hygiene canonical resolution failed: ${resolution.failure.reason}: ${resolution.failure.message}`,
    );
  }
  const document = resolution.document;
  appendFragment(fragments, 'canonicalResult.primaryMath.canonicalLatex', 'primary-answer', document.primaryMath?.canonicalLatex);
  if (document.outcomeKind === 'success') {
    document.answerRows?.rows.forEach((row, index) =>
      appendFragment(fragments, `canonicalResult.answerRows.rows[${index}].math.canonicalLatex`, 'answer-row', row.math.canonicalLatex));
    document.systemReadback?.variables.forEach((value, index) =>
      appendFragment(fragments, `canonicalResult.systemReadback.variables[${index}].canonicalLatex`, 'system-variable', value.canonicalLatex));
    document.systemReadback?.rows.forEach((row, rowIndex) =>
      row.values.forEach((value, valueIndex) =>
        appendFragment(
          fragments,
          `canonicalResult.systemReadback.rows[${rowIndex}].values[${valueIndex}].canonicalLatex`,
          'system-value',
          value.canonicalLatex,
        )));
    document.metadata?.variableSubstitutions?.forEach((substitution, index) =>
      appendFragment(
        fragments,
        `canonicalResult.metadata.variableSubstitutions[${index}].value.canonicalLatex`,
        'substitution-value',
        substitution.value.canonicalLatex,
      ));
  }

  if (document.branchReadback) {
    appendFragment(fragments, 'canonicalResult.branchReadback.target.canonicalLatex', 'branch-target', document.branchReadback.target.canonicalLatex);
    document.branchReadback.branches.forEach((value, index) =>
      appendFragment(fragments, `canonicalResult.branchReadback.branches[${index}].canonicalLatex`, 'branch', value.canonicalLatex));
  }
  collectPeriodicFragments(document, fragments);
  document.supplements?.forEach((value, index) =>
    appendFragment(fragments, `canonicalResult.supplements[${index}].canonicalLatex`, 'supplement', value.canonicalLatex));
  appendFragment(
    fragments,
    'canonicalResult.summaries.transform.math.canonicalLatex',
    'transform-summary',
    document.summaries?.transform?.math?.canonicalLatex,
  );
  outcome.actions?.forEach((action, index) =>
    appendFragment(
      fragments,
      `actions[${index}].math.canonicalLatex`,
      'action',
      action.math.canonicalLatex,
    ));
  collectDetailFragments(document, fragments);
  appendFragment(
    fragments,
    'canonicalResult.metadata.resolvedInput.canonicalLatex',
    'resolved-input',
    document.metadata?.resolvedInput?.canonicalLatex,
  );
  return fragments;
}

export function collectTableResponseMathFragments(response: TableResponse | undefined): MathematicalFragment[] {
  const fragments: MathematicalFragment[] = [];
  response?.rows.forEach((row, index) => {
    appendFragment(fragments, `tableResponse.rows[${index}].x`, 'table-x', row.x);
    appendFragment(fragments, `tableResponse.rows[${index}].primary`, 'table-primary', row.primary);
    appendFragment(fragments, `tableResponse.rows[${index}].secondary`, 'table-secondary', row.secondary);
  });
  return fragments;
}

function markersFor(fragment: MathematicalFragment): MalformedMathMarker[] {
  const markers: MalformedMathMarker[] = [];
  if (/(?<![\p{L}\p{N}_])NaN(?![\p{L}\p{N}_])/iu.test(fragment.value)) markers.push('nan');
  const hasUndefined = /(?<![\p{L}\p{N}_])undefined(?![\p{L}\p{N}_])/iu.test(fragment.value);
  const tableUndefined = fragment.kind.startsWith('table-') && fragment.value.trim().toLowerCase() === 'undefined';
  if (hasUndefined && !tableUndefined) markers.push('undefined');
  if (/\[object Object\]/u.test(fragment.value)) markers.push('object-object');
  if (/(?<![\p{L}\p{N}])internal(?:[\s_-]*)error(?![\p{L}\p{N}])/iu.test(fragment.value)) {
    markers.push('internal-error');
  }
  return markers;
}

export function findMalformedMathFragments(
  fragments: readonly MathematicalFragment[],
): MalformedMathematicalFragment[] {
  return fragments.flatMap((fragment) =>
    markersFor(fragment).map((marker) => ({ ...fragment, marker })));
}

export function normalizePrintHygieneValue(value: string) {
  return value.replace(/\s+/gu, ' ').trim();
}
