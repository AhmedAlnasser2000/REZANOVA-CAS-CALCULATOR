import type {
  CanonicalResultDocumentV1,
  DisplayOutcome,
  TableResponse,
} from '../../types/calculator';
import { resolveCanonicalResultForConsumer } from '../result-contract';

export type MathematicalFragmentKind =
  | 'primary-answer'
  | 'canonical-payload'
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

  appendFragment(fragments, 'periodicFamily.carrierLatex', 'periodic-carrier', periodic.carrier.canonicalLatex);
  appendFragment(fragments, 'periodicFamily.parameterLatex', 'periodic-parameter', periodic.parameter.canonicalLatex);
  periodic.parameterConstraints?.forEach((value, index) =>
    appendFragment(fragments, `periodicFamily.parameterConstraintLatex[${index}]`, 'periodic-constraint', value.canonicalLatex));
  periodic.branches.forEach((value, index) =>
    appendFragment(fragments, `periodicFamily.branchesLatex[${index}]`, 'periodic-branch', value.canonicalLatex));
  periodic.representatives?.forEach((representative, index) =>
    appendFragment(
      fragments,
      `periodicFamily.representatives[${index}].exactLatex`,
      'periodic-representative',
      representative.exact?.canonicalLatex,
    ));
  periodic.suggestedIntervals?.forEach((interval, index) => {
    appendFragment(fragments, `periodicFamily.suggestedIntervals[${index}].start`, 'periodic-interval-bound', interval.start.canonicalLatex);
    appendFragment(fragments, `periodicFamily.suggestedIntervals[${index}].end`, 'periodic-interval-bound', interval.end.canonicalLatex);
  });
  periodic.piecewiseBranches?.forEach((branch, index) => {
    appendFragment(
      fragments,
      `periodicFamily.piecewiseBranches[${index}].conditionLatex`,
      'periodic-piecewise-condition',
      branch.condition.canonicalLatex,
    );
    appendFragment(
      fragments,
      `periodicFamily.piecewiseBranches[${index}].resultLatex`,
      'periodic-piecewise-result',
      branch.result.canonicalLatex,
    );
  });
  appendFragment(
    fragments,
    'periodicFamily.principalRangeLatex',
    'periodic-principal-range',
    periodic.principalRange?.canonicalLatex,
  );
  appendFragment(
    fragments,
    'periodicFamily.reducedCarrierLatex',
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
          `detailSections[${sectionIndex}].lines[${lineIndex}]`,
          'detail-math-line',
          parts[0].math.canonicalLatex,
        );
      } else if (mathParts.length > 0) {
        mathParts.forEach(({ part, partIndex }) =>
          appendFragment(
            fragments,
            `detailSections[${sectionIndex}].lineParts[${lineIndex}][${partIndex}].latex`,
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
          `solveSummaryParts[${lineIndex}][${partIndex}].latex`,
          'solve-summary-math-part',
          part.math.canonicalLatex,
        );
      }
    });
  });
}

export function collectDisplayOutcomeMathFragments(outcome: DisplayOutcome): MathematicalFragment[] {
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
  appendFragment(fragments, 'exactLatex', 'primary-answer', document.primaryMath?.canonicalLatex);
  if (document.primaryMath?.mathJson !== undefined) {
    appendFragment(
      fragments,
      'canonicalMath.canonicalLatex',
      'canonical-payload',
      document.primaryMath.canonicalLatex,
    );
  }
  if (document.outcomeKind === 'success') {
    document.answerRows?.rows.forEach((row, index) =>
      appendFragment(fragments, `answerRows.rows[${index}].latex`, 'answer-row', row.math.canonicalLatex));
    document.systemReadback?.variables.forEach((value, index) =>
      appendFragment(fragments, `systemReadback.variablesLatex[${index}]`, 'system-variable', value.canonicalLatex));
    document.systemReadback?.rows.forEach((row, rowIndex) =>
      row.values.forEach((value, valueIndex) =>
        appendFragment(
          fragments,
          `systemReadback.rows[${rowIndex}].valuesLatex[${valueIndex}]`,
          'system-value',
          value.canonicalLatex,
        )));
    document.metadata?.variableSubstitutions?.forEach((substitution, index) =>
      appendFragment(
        fragments,
        `variableSubstitutions[${index}].valueLatex`,
        'substitution-value',
        substitution.value.canonicalLatex,
      ));
  }

  if (document.branchReadback) {
    appendFragment(fragments, 'branchReadback.targetLatex', 'branch-target', document.branchReadback.target.canonicalLatex);
    document.branchReadback.branches.forEach((value, index) =>
      appendFragment(fragments, `branchReadback.branchesLatex[${index}]`, 'branch', value.canonicalLatex));
  }
  collectPeriodicFragments(document, fragments);
  document.supplements?.forEach((value, index) =>
    appendFragment(fragments, `exactSupplementLatex[${index}]`, 'supplement', value.canonicalLatex));
  appendFragment(
    fragments,
    'transformSummaryLatex',
    'transform-summary',
    document.summaries?.transform?.math?.canonicalLatex,
  );
  outcome.actions?.forEach((action, index) =>
    appendFragment(fragments, `actions[${index}].latex`, 'action', action.latex));
  collectDetailFragments(document, fragments);
  appendFragment(
    fragments,
    'resolvedInputLatex',
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
