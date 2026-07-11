import type { DisplayDetailSection } from '../../../types/calculator';
import type { AngleUnit } from '../../../types/calculator/mode-types';
import {
  detailLineFromParts,
  equationLabelLineParts,
} from '../../display/result-detail-lines';
import { solveEquationAlgebraicIsolation } from './algebraic';
import {
  type EquationSelectedTargetSearchTraceRecorder,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
  recordSelectedTargetFamilyAttempt,
  recordSelectedTargetFamilySuccess,
  recordSelectedTargetFinalStop,
  recordSelectedTargetRoutePlan,
  shouldAttemptSelectedTargetRoute,
} from '../equation-target-shape';
import { solveParameterizedCarrierEquation } from '../parameterized/carrier';
import { solveParameterizedCompositionEquation } from '../parameterized/composition';
import { solveParameterizedExpLogEquation } from '../parameterized/exp-log';
import { solveParameterizedFactorablePolynomialEquation } from '../parameterized/factorable-polynomial';
import { solveParameterizedLinearEquation } from '../parameterized/linear';
import { solveParameterizedMixedAlgebraicEquation } from '../parameterized/mixed-algebraic';
import { solveParameterizedPolynomialEquation } from '../parameterized/polynomial';
import { solveParameterizedRationalEquation } from '../parameterized/rational';
import {
  buildParameterizedSolveTargetSection,
  normalizeParameterizedDetailSections,
  normalizeParameterizedSupplementLatex,
} from '../parameterized/readback';
import { solveParameterizedTrigEquation } from '../parameterized/trig';
import {
  equationLatex,
  hasTarget,
  isArrayNode,
  latexForNode,
  unique,
  type MathJson,
} from './math-json';
import { peelOnce, type PeelPolicy, type PeelStep } from './peeling';
import { hasAmbiguousAdjacentProduct, parseIsolationEquation } from './target-context';
import { profileEquationResult } from '../../display/printer';

export type SelectedTargetIsolationStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'target-on-both-sides'
  | 'multiple-target-islands'
  | 'target-in-shell-factor'
  | 'target-in-denominator'
  | 'target-in-unsupported-operation'
  | 'unsupported-shell'
  | 'generated-equation-unsupported'
  | 'isolation-depth-limit'
  | 'no-isolation';

export type SelectedTargetIsolationSuccess = {
  kind: 'success';
  target: string;
  parameterNames: string[];
  generatedEquationLatex: string;
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

export type SelectedTargetIsolationStop = {
  kind: 'unsupported';
  reason: SelectedTargetIsolationStopReason;
  message: string;
  target: string;
  parameterNames: string[];
};

export type SelectedTargetIsolationResult =
  | SelectedTargetIsolationSuccess
  | SelectedTargetIsolationStop;

export type SelectedTargetIsolationOptions = {
  allowGeneratedImplicitProducts?: boolean;
  maxPeels?: number;
  compactTargetMaxLatexLength?: number;
  searchTrace?: EquationSelectedTargetSearchTraceRecorder;
};

type HandoffSolveSuccess = {
  kind: 'success';
  exactLatex: string;
  exactSupplementLatex?: string[];
  detailSections: DisplayDetailSection[];
};

const DEFAULT_MAX_PEELS = 6;
const DEFAULT_COMPACT_TARGET_MAX_LATEX_LENGTH = 220;

const SELECTED_TARGET_PEEL_POLICY: PeelPolicy<SelectedTargetIsolationStopReason> = {
  multipleTargetIslandsReason: 'multiple-target-islands',
  targetInShellFactorReason: 'target-in-shell-factor',
  targetInDenominatorReason: 'target-in-denominator',
  unsupportedShellReason: 'unsupported-shell',
  noIsolationReason: 'no-isolation',
  multipleAdditiveTargetMessage: 'The selected target appears in more than one additive island.',
  noAdditiveTargetMessage: 'No selected-target term was found in this additive shell.',
  multipleFactorTargetMessage: 'The selected target appears in more than one multiplicative factor.',
  noFactorTargetMessage: 'No selected-target factor was found in this multiplicative shell.',
  invalidQuotientMessage: 'Only simple quotient shells are supported by this isolation pass.',
  denominatorTargetMessage: 'The selected target appears in a denominator shell that this isolation pass does not invert.',
  denominatorAndNumeratorTargetMessage: 'The selected target appears in both parts of a quotient shell.',
  noNumeratorTargetMessage: 'No selected-target numerator was found in this quotient shell.',
  noIsolationMessage: 'No target-free shell remains to isolate.',
};

function stop(
  reason: SelectedTargetIsolationStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): SelectedTargetIsolationStop {
  return {
    kind: 'unsupported',
    reason,
    message,
    target,
    parameterNames,
  };
}

function tryDelegatedSolvers(
  generatedEquationLatex: string,
  target: string,
  angleUnit: AngleUnit,
  allowGeneratedImplicitProducts: boolean,
  searchTrace?: EquationSelectedTargetSearchTraceRecorder,
): HandoffSolveSuccess | null {
  const options = { allowGeneratedImplicitProducts };
  const routePlan = planSelectedTargetRouteFamilies(
    profileEquationTargetShape(generatedEquationLatex, target, options),
    { phase: 'generated-handoff' },
  );
  recordSelectedTargetRoutePlan(searchTrace, routePlan);
  if (shouldAttemptSelectedTargetRoute(routePlan, 'linear')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'linear');
    const linear = solveParameterizedLinearEquation(generatedEquationLatex, target, options);
    if (linear.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'linear');
      return linear;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'polynomial')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'polynomial');
    const polynomial = solveParameterizedPolynomialEquation(generatedEquationLatex, target, options);
    if (polynomial.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'polynomial');
      return polynomial;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'rational')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'rational');
    const rational = solveParameterizedRationalEquation(generatedEquationLatex, target, options);
    if (rational.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'rational');
      return rational;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'factorable-polynomial')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'factorable-polynomial');
    const factorable = solveParameterizedFactorablePolynomialEquation(generatedEquationLatex, target, options);
    if (factorable.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'factorable-polynomial');
      return factorable;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'algebraic-isolation')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'algebraic-isolation');
    const algebraic = solveEquationAlgebraicIsolation(generatedEquationLatex, target, options);
    if (algebraic.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'algebraic-isolation');
      return algebraic;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'carrier')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'carrier');
    const carrier = solveParameterizedCarrierEquation(generatedEquationLatex, target, options);
    if (carrier.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'carrier');
      return carrier;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'exp-log')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'exp-log');
    const expLog = solveParameterizedExpLogEquation(generatedEquationLatex, target, {
      ...options,
      searchTrace,
    });
    if (expLog.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'exp-log');
      return expLog;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'trig')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'trig');
    const trig = solveParameterizedTrigEquation(generatedEquationLatex, target, angleUnit, options);
    if (trig.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'trig');
      return trig;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'composition')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'composition');
    const composition = solveParameterizedCompositionEquation(generatedEquationLatex, target, angleUnit, options);
    if (composition.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'composition');
      return composition;
    }
  }

  if (shouldAttemptSelectedTargetRoute(routePlan, 'mixed-algebraic')) {
    recordSelectedTargetFamilyAttempt(searchTrace, 'generated-handoff', 'mixed-algebraic');
    const mixedAlgebraic = solveParameterizedMixedAlgebraicEquation(generatedEquationLatex, target, options);
    if (mixedAlgebraic.kind === 'success') {
      recordSelectedTargetFamilySuccess(searchTrace, 'generated-handoff', 'mixed-algebraic');
      return mixedAlgebraic;
    }
  }

  return null;
}

function detailSectionsForSuccess(
  target: string,
  parameterNames: string[],
  steps: PeelStep[],
  generatedEquationLatex: string,
  facts: string[],
  delegatedSections: DisplayDetailSection[],
) {
  const delegatedWithoutTarget = delegatedSections.filter((section) => section.title !== 'Solve Target');
  const generatedEquationRow = detailLineFromParts(
    equationLabelLineParts('Generated equation', generatedEquationLatex),
  );
  return normalizeParameterizedDetailSections([
    buildParameterizedSolveTargetSection(target, parameterNames),
    {
      title: 'Target Isolation',
      lineKind: 'text',
      lines: [
        `Isolated one selected-target expression through ${steps.length} target-free algebra step${steps.length === 1 ? '' : 's'}.`,
        generatedEquationRow.line,
        ...(
          facts.length > 0
            ? [`Isolation facts: ${unique(facts).join(', ')}`]
            : []
        ),
      ],
      lineParts: [
        [],
        generatedEquationRow.parts,
        ...(facts.length > 0 ? [[]] : []),
      ],
    },
    ...delegatedWithoutTarget,
  ]);
}

export function solveSelectedTargetIsolationEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit = 'rad',
  options: SelectedTargetIsolationOptions = {},
): SelectedTargetIsolationResult {
  const parsed = parseIsolationEquation(equationLatex, target);
  const sourceLatex = parsed.sourceLatex;
  const parameterNames = parsed.parameterNames;
  const allowGeneratedImplicitProducts = Boolean(options.allowGeneratedImplicitProducts);
  const searchTrace = options.searchTrace;

  if (!allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(sourceLatex)) {
    recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'ambiguous-adjacent-product');
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before selected-target isolation.',
      target,
      parameterNames,
    );
  }

  if (parsed.kind === 'parse-error') {
    recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'parse-error');
    return stop('parse-error', 'The equation could not be parsed for selected-target isolation.', target, parameterNames);
  }

  if (parsed.kind === 'non-equation') {
    recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'non-equation');
    return stop('non-equation', 'Enter an = equation before selected-target isolation.', target, parameterNames);
  }

  const json = parsed.json;
  const left = json[1] as MathJson;
  const right = json[2] as MathJson;
  const leftHasTarget = hasTarget(left, target);
  const rightHasTarget = hasTarget(right, target);

  if (!leftHasTarget && !rightHasTarget) {
    recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'target-not-found');
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (leftHasTarget && rightHasTarget) {
    recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'target-on-both-sides');
    return stop(
      'target-on-both-sides',
      'The selected target appears on both sides of the equation, so this one-island isolation pass cannot choose one island.',
      target,
      parameterNames,
    );
  }

  let expression = leftHasTarget ? left : right;
  let otherSide = leftHasTarget ? right : left;
  const steps: PeelStep[] = [];
  const facts: string[] = [];
  const maxPeels = options.maxPeels ?? DEFAULT_MAX_PEELS;

  for (let depth = 0; depth < maxPeels; depth += 1) {
    const peel = peelOnce(expression, otherSide, target, SELECTED_TARGET_PEEL_POLICY);
    if (peel.kind === 'unsupported') {
      const generatedEquationLatex = equationLatexForAttempt(expression, otherSide);
      const delegated = tryDelegatedSolvers(
        generatedEquationLatex,
        target,
        angleUnit,
        allowGeneratedImplicitProducts,
        searchTrace,
      );

      if (delegated) {
        const exactSupplementLatex = normalizeParameterizedSupplementLatex([
          ...unique(facts),
          ...(delegated.exactSupplementLatex ?? []),
        ]);
        return {
          kind: 'success',
          target,
          parameterNames,
          generatedEquationLatex,
          exactLatex: delegated.exactLatex,
          exactSupplementLatex,
          detailSections: detailSectionsForSuccess(
            target,
            parameterNames,
            steps,
            generatedEquationLatex,
            unique(facts),
            delegated.detailSections,
          ),
        };
      }

      if (peel.reason === 'no-isolation' && steps.length > 0) {
        recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'generated-equation-unsupported');
        return stop(
          'generated-equation-unsupported',
          'The selected-target island was isolated, but the generated equation is outside the current exact solvers.',
          target,
          parameterNames,
        );
      }

      recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', peel.reason, peel.message);
      return stop(peel.reason, peel.message, target, parameterNames);
    }

    steps.push(peel.step);
    facts.push(...peel.step.facts);
    expression = peel.step.expression;
    otherSide = peel.step.otherSide;

    const generatedEquationLatex = equationLatexForAttempt(expression, otherSide);
    const delegated = tryDelegatedSolvers(
      generatedEquationLatex,
      target,
      angleUnit,
      allowGeneratedImplicitProducts,
      searchTrace,
    );

    if (delegated) {
      const exactSupplementLatex = normalizeParameterizedSupplementLatex([
        ...unique(facts),
        ...(delegated.exactSupplementLatex ?? []),
      ]);
      return {
        kind: 'success',
        target,
        parameterNames,
        generatedEquationLatex,
        exactLatex: delegated.exactLatex,
        exactSupplementLatex,
        detailSections: detailSectionsForSuccess(
          target,
          parameterNames,
          steps,
          generatedEquationLatex,
          unique(facts),
          delegated.detailSections,
        ),
      };
    }
  }

  recordSelectedTargetFinalStop(searchTrace, 'generated-handoff', 'isolation-depth-limit');
  return stop(
    'isolation-depth-limit',
    'The selected-target isolation pass reached its bounded shell depth before finding a supported generated equation.',
    target,
    parameterNames,
  );
}

function equationLatexForAttempt(expression: MathJson, otherSide: MathJson) {
  return equationLatex(expression, otherSide);
}

function isPositiveIntegerNode(node: unknown): node is number {
  return typeof node === 'number' && Number.isInteger(node) && node > 0;
}

function rootFormulaLatex(rhsLatex: string, exponent: number) {
  return exponent === 2 ? `\\sqrt{${rhsLatex}}` : `\\sqrt[${exponent}]{${rhsLatex}}`;
}

function formulaTargetLatex(
  expression: MathJson,
  otherSide: MathJson,
  target: string,
  maxLatexLength: number,
): {
  latex: string;
  facts: string[];
  branchRows: ReturnType<typeof detailLineFromParts>[];
} | null {
  const rhsLatex = latexForNode(otherSide);
  let candidate: string | null = null;
  const facts: string[] = [];
  const branchRows: ReturnType<typeof detailLineFromParts>[] = [];
  const formattedTarget = formatTargetLatex(target);

  if (typeof expression === 'string' && expression === target) {
    candidate = `${formattedTarget}=${rhsLatex}`;
  } else if (
    isArrayNode(expression)
    && expression[0] === 'Power'
    && expression.length === 3
    && expression[1] === target
    && isPositiveIntegerNode(expression[2])
  ) {
    const exponent = expression[2];
    if (exponent === 1) {
      candidate = `${formattedTarget}=${rhsLatex}`;
    } else if (exponent % 2 === 0) {
      const root = rootFormulaLatex(rhsLatex, exponent);
      candidate = `${formattedTarget}=\\pm ${root}`;
      branchRows.push(detailLineFromParts(equationLabelLineParts(
        'Formula branches',
        `${formattedTarget}=-${root}, ${formattedTarget}=${root}`,
      )));
      facts.push(`${rhsLatex}\\ge0`);
    } else {
      candidate = `${formattedTarget}=${rootFormulaLatex(rhsLatex, exponent)}`;
    }
  }

  return candidate && candidate.length <= maxLatexLength
    ? { latex: candidate, facts, branchRows }
    : null;
}

function formatTargetLatex(target: string) {
  return /^[A-Za-z][A-Za-z0-9_]+$/.test(target) ? `\\mathrm{${target}}` : target;
}

function detailSectionsForIsolationOnlySuccess(
  target: string,
  parameterNames: string[],
  steps: PeelStep[],
  isolatedEquationLatex: string,
  exactLatex: string,
  facts: string[],
  branchRows: ReturnType<typeof detailLineFromParts>[] = [],
) {
  const stepLine = steps.length === 0
    ? 'Recognized the selected-target expression as already isolated.'
    : `Rearranged one selected-target expression through ${steps.length} target-free algebra step${steps.length === 1 ? '' : 's'}.`;
  const isolatedRow = detailLineFromParts(
    equationLabelLineParts('Isolated form', isolatedEquationLatex),
  );
  const formulaRow = exactLatex !== isolatedEquationLatex
    ? detailLineFromParts(equationLabelLineParts('Formula form', exactLatex))
    : undefined;
  return normalizeParameterizedDetailSections([
    buildParameterizedSolveTargetSection(target, parameterNames),
    {
      title: 'Target Isolation',
      lineKind: 'text',
      lines: [
        `Answer mode: Isolate.`,
        stepLine,
        isolatedRow.line,
        ...(formulaRow ? [formulaRow.line] : []),
        ...branchRows.map((row) => row.line),
        ...(facts.length > 0 ? [`Isolation facts: ${unique(facts).join(', ')}`] : []),
      ],
      lineParts: [
        [],
        [],
        isolatedRow.parts,
        ...(formulaRow ? [formulaRow.parts] : []),
        ...branchRows.map((row) => row.parts),
        ...(facts.length > 0 ? [[]] : []),
      ],
    },
  ]);
}

export function isolateSelectedTargetEquation(
  equationLatex: string,
  target: string,
  angleUnit: AngleUnit = 'rad',
  options: SelectedTargetIsolationOptions = {},
): SelectedTargetIsolationResult {
  void angleUnit;
  const parsed = parseIsolationEquation(equationLatex, target);
  const sourceLatex = parsed.sourceLatex;
  const parameterNames = parsed.parameterNames;
  const allowGeneratedImplicitProducts = Boolean(options.allowGeneratedImplicitProducts);

  if (!allowGeneratedImplicitProducts && hasAmbiguousAdjacentProduct(sourceLatex)) {
    return stop(
      'ambiguous-adjacent-product',
      'Adjacent letters must use explicit multiplication before selected-target isolation.',
      target,
      parameterNames,
    );
  }

  if (parsed.kind === 'parse-error') {
    return stop('parse-error', 'The equation could not be parsed for selected-target isolation.', target, parameterNames);
  }

  if (parsed.kind === 'non-equation') {
    return stop('non-equation', 'Enter an = equation before selected-target isolation.', target, parameterNames);
  }

  const json = parsed.json;
  const left = json[1] as MathJson;
  const right = json[2] as MathJson;
  const leftHasTarget = hasTarget(left, target);
  const rightHasTarget = hasTarget(right, target);

  if (!leftHasTarget && !rightHasTarget) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  if (leftHasTarget && rightHasTarget) {
    return stop(
      'target-on-both-sides',
      'The selected target appears on both sides of the equation, so this one-island isolation pass cannot choose one island.',
      target,
      parameterNames,
    );
  }

  let expression = leftHasTarget ? left : right;
  let otherSide = leftHasTarget ? right : left;
  const steps: PeelStep[] = [];
  const facts: string[] = [];
  const maxPeels = options.maxPeels ?? DEFAULT_MAX_PEELS;
  const compactTargetMaxLatexLength =
    options.compactTargetMaxLatexLength ?? DEFAULT_COMPACT_TARGET_MAX_LATEX_LENGTH;

  for (let depth = 0; depth < maxPeels; depth += 1) {
    const peel = peelOnce(expression, otherSide, target, SELECTED_TARGET_PEEL_POLICY);
    if (peel.kind === 'unsupported') {
      if (peel.reason === 'no-isolation') {
        const isolatedEquationLatex = equationLatexForAttempt(expression, otherSide);
        const formula = formulaTargetLatex(
          expression,
          otherSide,
          target,
          compactTargetMaxLatexLength,
        );
        if (steps.length === 0 && !formula) {
          return stop(peel.reason, peel.message, target, parameterNames);
        }

        const exactLatex = formula?.latex ?? isolatedEquationLatex;
        const allFacts = unique([
          ...facts,
          ...(formula?.facts ?? []),
        ]);
        const exactSupplementLatex = normalizeParameterizedSupplementLatex(allFacts);
        return {
          kind: 'success',
          target,
          parameterNames,
          generatedEquationLatex: isolatedEquationLatex,
          exactLatex,
          exactSupplementLatex,
          detailSections: detailSectionsForIsolationOnlySuccess(
            target,
            parameterNames,
            steps,
            isolatedEquationLatex,
            exactLatex,
            allFacts,
            formula?.branchRows,
          ),
        };
      }

      return stop(peel.reason, peel.message, target, parameterNames);
    }

    steps.push(peel.step);
    facts.push(...peel.step.facts);
    expression = peel.step.expression;
    otherSide = peel.step.otherSide;

    const formula = formulaTargetLatex(
      expression,
      otherSide,
      target,
      compactTargetMaxLatexLength,
    );
    if (formula) {
      const isolatedEquationLatex = equationLatexForAttempt(expression, otherSide);
      const allFacts = unique([
        ...facts,
        ...formula.facts,
      ]);
      const exactSupplementLatex = normalizeParameterizedSupplementLatex(allFacts);
      return profileEquationResult({
        kind: 'success',
        target,
        parameterNames,
        generatedEquationLatex: isolatedEquationLatex,
        exactLatex: formula.latex,
        exactSupplementLatex,
        detailSections: detailSectionsForIsolationOnlySuccess(
          target,
          parameterNames,
          steps,
          isolatedEquationLatex,
          formula.latex,
          allFacts,
          formula.branchRows,
        ),
      });
    }
  }

  if (steps.length > 0) {
    const isolatedEquationLatex = equationLatexForAttempt(expression, otherSide);
    const exactSupplementLatex = normalizeParameterizedSupplementLatex(unique(facts));
    return profileEquationResult({
      kind: 'success',
      target,
      parameterNames,
      generatedEquationLatex: isolatedEquationLatex,
      exactLatex: isolatedEquationLatex,
      exactSupplementLatex,
      detailSections: detailSectionsForIsolationOnlySuccess(
        target,
        parameterNames,
        steps,
        isolatedEquationLatex,
        isolatedEquationLatex,
        unique(facts),
      ),
    });
  }

  return stop(
    'isolation-depth-limit',
    'The selected-target isolation pass reached its bounded shell depth before producing a useful isolated form.',
    target,
    parameterNames,
  );
}
