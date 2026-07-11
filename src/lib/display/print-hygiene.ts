import type { DisplayOutcome, TableResponse } from '../../types/calculator';
import { detailLineKindAt } from './result-detail-lines';

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
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
  fragments: MathematicalFragment[],
) {
  const periodic = outcome.periodicFamily;
  if (!periodic) return;

  appendFragment(fragments, 'periodicFamily.carrierLatex', 'periodic-carrier', periodic.carrierLatex);
  appendFragment(fragments, 'periodicFamily.parameterLatex', 'periodic-parameter', periodic.parameterLatex);
  periodic.parameterConstraintLatex?.forEach((value, index) =>
    appendFragment(fragments, `periodicFamily.parameterConstraintLatex[${index}]`, 'periodic-constraint', value));
  periodic.branchesLatex.forEach((value, index) =>
    appendFragment(fragments, `periodicFamily.branchesLatex[${index}]`, 'periodic-branch', value));
  periodic.representatives?.forEach((representative, index) =>
    appendFragment(
      fragments,
      `periodicFamily.representatives[${index}].exactLatex`,
      'periodic-representative',
      representative.exactLatex,
    ));
  periodic.suggestedIntervals?.forEach((interval, index) => {
    appendFragment(fragments, `periodicFamily.suggestedIntervals[${index}].start`, 'periodic-interval-bound', interval.start);
    appendFragment(fragments, `periodicFamily.suggestedIntervals[${index}].end`, 'periodic-interval-bound', interval.end);
  });
  periodic.piecewiseBranches?.forEach((branch, index) => {
    appendFragment(
      fragments,
      `periodicFamily.piecewiseBranches[${index}].conditionLatex`,
      'periodic-piecewise-condition',
      branch.conditionLatex,
    );
    appendFragment(
      fragments,
      `periodicFamily.piecewiseBranches[${index}].resultLatex`,
      'periodic-piecewise-result',
      branch.resultLatex,
    );
  });
  appendFragment(
    fragments,
    'periodicFamily.principalRangeLatex',
    'periodic-principal-range',
    periodic.principalRangeLatex,
  );
  appendFragment(
    fragments,
    'periodicFamily.reducedCarrierLatex',
    'periodic-reduced-carrier',
    periodic.reducedCarrierLatex,
  );
}

function collectDetailFragments(
  outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>,
  fragments: MathematicalFragment[],
) {
  outcome.detailSections?.forEach((section, sectionIndex) => {
    section.lines.forEach((line, lineIndex) => {
      const parts = section.lineParts?.[lineIndex];
      const mathParts = parts?.flatMap((part, partIndex) =>
        part.kind === 'math'
          ? [{ part, partIndex }]
          : []);

      if (mathParts && mathParts.length > 0) {
        mathParts.forEach(({ part, partIndex }) =>
          appendFragment(
            fragments,
            `detailSections[${sectionIndex}].lineParts[${lineIndex}][${partIndex}].latex`,
            'detail-math-part',
            part.latex,
          ));
      } else if (detailLineKindAt(section, lineIndex) === 'math') {
        appendFragment(
          fragments,
          `detailSections[${sectionIndex}].lines[${lineIndex}]`,
          'detail-math-line',
          line,
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

  appendFragment(fragments, 'exactLatex', 'primary-answer', outcome.exactLatex);
  if (outcome.kind === 'success') {
    appendFragment(
      fragments,
      'canonicalMath.canonicalLatex',
      'canonical-payload',
      outcome.canonicalMath?.canonicalLatex,
    );
    outcome.answerRows?.rows.forEach((row, index) =>
      appendFragment(fragments, `answerRows.rows[${index}].latex`, 'answer-row', row.latex));
    outcome.systemReadback?.variablesLatex.forEach((value, index) =>
      appendFragment(fragments, `systemReadback.variablesLatex[${index}]`, 'system-variable', value));
    outcome.systemReadback?.rows.forEach((row, rowIndex) =>
      row.valuesLatex.forEach((value, valueIndex) =>
        appendFragment(
          fragments,
          `systemReadback.rows[${rowIndex}].valuesLatex[${valueIndex}]`,
          'system-value',
          value,
        )));
    outcome.variableSubstitutions?.forEach((substitution, index) =>
      appendFragment(
        fragments,
        `variableSubstitutions[${index}].valueLatex`,
        'substitution-value',
        substitution.valueLatex,
      ));
  }

  if (outcome.branchReadback) {
    appendFragment(fragments, 'branchReadback.targetLatex', 'branch-target', outcome.branchReadback.targetLatex);
    outcome.branchReadback.branchesLatex.forEach((value, index) =>
      appendFragment(fragments, `branchReadback.branchesLatex[${index}]`, 'branch', value));
  }
  collectPeriodicFragments(outcome, fragments);
  outcome.exactSupplementLatex?.forEach((value, index) =>
    appendFragment(fragments, `exactSupplementLatex[${index}]`, 'supplement', value));
  appendFragment(fragments, 'transformSummaryLatex', 'transform-summary', outcome.transformSummaryLatex);
  outcome.actions?.forEach((action, index) =>
    appendFragment(fragments, `actions[${index}].latex`, 'action', action.latex));
  collectDetailFragments(outcome, fragments);
  appendFragment(fragments, 'resolvedInputLatex', 'resolved-input', outcome.resolvedInputLatex);
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
