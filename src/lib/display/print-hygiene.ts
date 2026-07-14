import type {
  CanonicalRuntimeOutcome,
  TableResponse,
} from '../../types/calculator';
import {
  resolveCanonicalResultForConsumer,
  type CanonicalResultPresentation,
} from '../result-contract';

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
  if (value !== undefined && value.length > 0) fragments.push({ path, kind, value });
}

function collectPeriodicFragments(
  presentation: CanonicalResultPresentation,
  fragments: MathematicalFragment[],
) {
  const periodic = presentation.periodicFamily;
  if (!periodic) return;

  appendFragment(fragments, 'canonicalResult.periodicFamily.carrier.canonicalLatex', 'periodic-carrier', periodic.carrierLatex);
  appendFragment(fragments, 'canonicalResult.periodicFamily.parameter.canonicalLatex', 'periodic-parameter', periodic.parameterLatex);
  periodic.parameterConstraintLatex?.forEach((value, index) =>
    appendFragment(fragments, 'canonicalResult.periodicFamily.parameterConstraints[' + index + '].canonicalLatex', 'periodic-constraint', value));
  periodic.branchesLatex.forEach((value, index) =>
    appendFragment(fragments, 'canonicalResult.periodicFamily.branches[' + index + '].canonicalLatex', 'periodic-branch', value));
  periodic.representatives?.forEach((representative, index) =>
    appendFragment(
      fragments,
      'canonicalResult.periodicFamily.representatives[' + index + '].exact.canonicalLatex',
      'periodic-representative',
      representative.exactLatex,
    ));
  periodic.suggestedIntervals?.forEach((interval, index) => {
    appendFragment(fragments, 'canonicalResult.periodicFamily.suggestedIntervals[' + index + '].start.canonicalLatex', 'periodic-interval-bound', interval.start);
    appendFragment(fragments, 'canonicalResult.periodicFamily.suggestedIntervals[' + index + '].end.canonicalLatex', 'periodic-interval-bound', interval.end);
  });
  periodic.piecewiseBranches?.forEach((branch, index) => {
    appendFragment(
      fragments,
      'canonicalResult.periodicFamily.piecewiseBranches[' + index + '].condition.canonicalLatex',
      'periodic-piecewise-condition',
      branch.conditionLatex,
    );
    appendFragment(
      fragments,
      'canonicalResult.periodicFamily.piecewiseBranches[' + index + '].result.canonicalLatex',
      'periodic-piecewise-result',
      branch.resultLatex,
    );
  });
  appendFragment(
    fragments,
    'canonicalResult.periodicFamily.principalRange.canonicalLatex',
    'periodic-principal-range',
    periodic.principalRangeLatex,
  );
  appendFragment(
    fragments,
    'canonicalResult.periodicFamily.reducedCarrier.canonicalLatex',
    'periodic-reduced-carrier',
    periodic.reducedCarrierLatex,
  );
}

function collectDetailFragments(
  presentation: CanonicalResultPresentation,
  fragments: MathematicalFragment[],
) {
  presentation.details?.forEach((section, sectionIndex) => {
    section.lines.forEach((parts, lineIndex) => {
      const mathParts = parts.flatMap((part, partIndex) =>
        part.kind === 'math' ? [{ part, partIndex }] : []);
      if (parts.length === 1 && parts[0]?.kind === 'math') {
        appendFragment(
          fragments,
          'canonicalResult.details[' + sectionIndex + '].lines[' + lineIndex + '][0].math.canonicalLatex',
          'detail-math-line',
          parts[0].latex,
        );
      } else {
        mathParts.forEach(({ part, partIndex }) =>
          appendFragment(
            fragments,
            'canonicalResult.details[' + sectionIndex + '].lines[' + lineIndex + '][' + partIndex + '].math.canonicalLatex',
            'detail-math-part',
            part.latex,
          ));
      }
    });
  });
  presentation.summaries?.solve?.forEach((parts, lineIndex) => {
    parts.forEach((part, partIndex) => {
      if (part.kind === 'math') {
        appendFragment(
          fragments,
          'canonicalResult.summaries.solve[' + lineIndex + '][' + partIndex + '].math.canonicalLatex',
          'solve-summary-math-part',
          part.latex,
        );
      }
    });
  });
}

export function collectCanonicalRuntimeMathFragments(
  outcome: CanonicalRuntimeOutcome,
): MathematicalFragment[] {
  const fragments: MathematicalFragment[] = [];
  if (outcome.kind === 'prompt') {
    appendFragment(fragments, 'carryLatex', 'prompt-carry', outcome.carryLatex);
    return fragments;
  }

  const resolution = resolveCanonicalResultForConsumer(outcome);
  if (!resolution.ok) {
    throw new Error(
      'Print hygiene canonical resolution failed: '
        + resolution.failure.reason
        + ': '
        + resolution.failure.message,
    );
  }
  const { presentation, semantics } = resolution;
  appendFragment(fragments, 'canonicalResult.primaryMath.canonicalLatex', 'primary-answer', presentation.primaryLatex);
  if (presentation.outcomeKind === 'success') {
    presentation.answerRows?.rows.forEach((row, index) =>
      appendFragment(fragments, 'canonicalResult.answerRows.rows[' + index + '].math.canonicalLatex', 'answer-row', row.latex));
    presentation.systemReadback?.variablesLatex.forEach((value, index) =>
      appendFragment(fragments, 'canonicalResult.systemReadback.variables[' + index + '].canonicalLatex', 'system-variable', value));
    presentation.systemReadback?.rows.forEach((row, rowIndex) =>
      row.valuesLatex.forEach((value, valueIndex) =>
        appendFragment(
          fragments,
          'canonicalResult.systemReadback.rows[' + rowIndex + '].values[' + valueIndex + '].canonicalLatex',
          'system-value',
          value,
        )));
    semantics.metadata?.variableSubstitutions?.forEach((substitution, index) =>
      appendFragment(
        fragments,
        'canonicalResult.metadata.variableSubstitutions[' + index + '].value.canonicalLatex',
        'substitution-value',
        substitution.value.canonicalLatex,
      ));
  }

  if (presentation.branchReadback) {
    appendFragment(fragments, 'canonicalResult.branchReadback.target.canonicalLatex', 'branch-target', presentation.branchReadback.targetLatex);
    presentation.branchReadback.branchesLatex.forEach((value, index) =>
      appendFragment(fragments, 'canonicalResult.branchReadback.branches[' + index + '].canonicalLatex', 'branch', value));
  }
  collectPeriodicFragments(presentation, fragments);
  presentation.supplements?.forEach((value, index) =>
    appendFragment(fragments, 'canonicalResult.supplements[' + index + '].canonicalLatex', 'supplement', value));
  appendFragment(
    fragments,
    'canonicalResult.summaries.transform.math.canonicalLatex',
    'transform-summary',
    presentation.summaries?.transform?.mathLatex,
  );
  outcome.actions?.forEach((action, index) =>
    appendFragment(
      fragments,
      'actions[' + index + '].math.canonicalLatex',
      'action',
      action.math.canonicalLatex,
    ));
  collectDetailFragments(presentation, fragments);
  appendFragment(
    fragments,
    'canonicalResult.metadata.resolvedInput.canonicalLatex',
    'resolved-input',
    presentation.requestLatex,
  );
  return fragments;
}

export function collectTableResponseMathFragments(
  response: TableResponse | undefined,
): MathematicalFragment[] {
  const fragments: MathematicalFragment[] = [];
  response?.rows.forEach((row, index) => {
    appendFragment(fragments, 'tableResponse.rows[' + index + '].x', 'table-x', row.x);
    appendFragment(fragments, 'tableResponse.rows[' + index + '].primary', 'table-primary', row.primary);
    appendFragment(fragments, 'tableResponse.rows[' + index + '].secondary', 'table-secondary', row.secondary);
  });
  return fragments;
}

function markersFor(fragment: MathematicalFragment): MalformedMathMarker[] {
  const markers: MalformedMathMarker[] = [];
  if (/(?<![\p{L}\p{N}_])NaN(?![\p{L}\p{N}_])/iu.test(fragment.value)) markers.push('nan');
  const hasUndefined = /(?<![\p{L}\p{N}_])undefined(?![\p{L}\p{N}_])/iu.test(fragment.value);
  const tableUndefined = fragment.kind.startsWith('table-')
    && fragment.value.trim().toLowerCase() === 'undefined';
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
