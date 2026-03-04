import { runExpressionAction } from '../math-engine';
import { analyzeLatex, isRelationalOperator } from '../math-analysis';
import type {
  AngleUnit,
  CalculateAction,
  DisplayOutcome,
  LimitDirection,
  LimitTargetKind,
  OutputStyle,
  ResultOrigin,
} from '../../types/calculator';

type RunCalculateModeRequest = {
  action: CalculateAction;
  latex: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
  ansLatex: string;
  limitDirection?: LimitDirection;
  limitTargetKind?: LimitTargetKind;
};

function actionTitle(action: CalculateAction) {
  switch (action) {
    case 'evaluate':
      return 'Numeric';
    case 'simplify':
      return 'Simplify';
    case 'factor':
      return 'Factor';
    case 'expand':
      return 'Expand';
    default:
      return 'Calculate';
  }
}

function toOutcome(
  title: string,
  exactLatex?: string,
  approxText?: string,
  warnings: string[] = [],
  error?: string,
  resultOrigin?: ResultOrigin,
): DisplayOutcome {
  if (error) {
    return {
      kind: 'error',
      title,
      error,
      warnings,
      exactLatex,
      approxText,
    };
  }

  return {
    kind: 'success',
    title,
    exactLatex,
    approxText,
    warnings,
    resultOrigin,
  };
}

export function runCalculateMode({
  action,
  latex,
  angleUnit,
  outputStyle,
  ansLatex,
  limitDirection,
  limitTargetKind,
}: RunCalculateModeRequest): DisplayOutcome {
  const title = actionTitle(action);
  const analysis = analyzeLatex(latex);

  if (analysis.kind === 'equation') {
    return {
      kind: 'prompt',
      title,
      message: 'Use Equation mode to solve this expression.',
      targetMode: 'equation',
      carryLatex: latex,
      warnings: [],
    };
  }

  if (isRelationalOperator(analysis.topLevelOperator)) {
    return {
      kind: 'error',
      title,
      error: 'Inequalities and ≠ notation are visible in Algebra, but this milestone only evaluates expressions and equations.',
      warnings: [],
    };
  }

  if (analysis.kind === 'invalid') {
    return {
      kind: 'error',
      title,
      error: 'Expression could not be parsed or evaluated.',
      warnings: [],
    };
  }

  const response = runExpressionAction(
    {
      mode: 'calculate',
      document: { latex },
      angleUnit,
      outputStyle,
      variables: { Ans: ansLatex },
      calculusOptions: {
        limitDirection,
        limitTargetKind,
      },
    },
    action,
  );

  return toOutcome(
    title,
    response.exactLatex,
    response.approxText,
    response.warnings,
    response.error,
    response.resultOrigin,
  );
}
