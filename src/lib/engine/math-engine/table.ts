import type {
  TableRequest,
  TableResponse,
} from '../../../types/calculator';
import { formatApproxNumber, latexToApproxText } from '../../display/format';
import { roundedApproxNumberValue } from '../../display/notation/numeric-output';
import { canonicalizeMathInput } from '../../input/input-canonicalization';
import { evaluateRealNumericExpression } from '../../numeric/real-numeric-eval';
import { ce } from './math-json';
import type {
  BoxedLike,
  CooperativeTableBuildOptions,
  CooperativeTableBuildWithEvidenceResult,
  CooperativeTableBuildResult,
  PreparedTableBuild,
  TableBuildWithEvidence,
  TableMathJsonCellEvidence,
  TableMathJsonEvidence,
} from './types';

function evaluateAtPoint(latex: string, variable: string, value: number) {
  const expr = ce.parse(latex) as BoxedLike;
  const substituted = expr.subs({ [variable]: value });
  const hasPole = containsZeroDenominator(expr.json, variable, value);
  const numeric = evaluateRealNumericExpression(substituted.json, substituted.latex);
  if (numeric.kind === 'success') {
    return {
      text: numeric.approxText,
      warning: null,
      mathJson: roundedApproxNumberValue(numeric.value),
      undefinedReason: undefined,
    };
  }

  if (numeric.kind === 'domain-error') {
    return {
      text: 'undefined',
      warning: 'Some sampled rows were outside the real domain and are shown as undefined.',
      mathJson: undefined,
      undefinedReason: hasPole ? 'pole' as const : 'outside-real-domain' as const,
    };
  }

  const evaluated = substituted.evaluate();
  const numericFallback = evaluated.N?.() ?? evaluated;
  const approxText = latexToApproxText(numericFallback.latex);
  if (!approxText || approxText.includes('i') || approxText.includes('NaN')) {
    return {
      text: 'undefined',
      warning: 'Some sampled rows were outside the real domain and are shown as undefined.',
      mathJson: undefined,
      undefinedReason: hasPole ? 'pole' as const : 'outside-real-domain' as const,
    };
  }

  return {
    text: approxText,
    warning: null,
    mathJson: (() => {
      const evidence = evaluateRealNumericExpression(numericFallback.json, numericFallback.latex);
      return evidence.kind === 'success'
        ? roundedApproxNumberValue(evidence.value)
        : undefined;
    })(),
    undefinedReason: undefined,
  };
}

function numericZero(node: unknown, variable: string, value: number) {
  const substituted = (() => {
    try {
      return ce.box(node as Parameters<typeof ce.box>[0]).subs({ [variable]: value });
    } catch {
      return undefined;
    }
  })();
  if (!substituted) return false;
  const result = evaluateRealNumericExpression(substituted.json, substituted.latex);
  return result.kind === 'success' && result.value === 0;
}

function containsZeroDenominator(node: unknown, variable: string, value: number): boolean {
  if (!Array.isArray(node)) return false;
  if (
    node[0] === 'Divide'
    && node.length >= 3
    && numericZero(node[2], variable, value)
  ) return true;
  if (
    node[0] === 'Power'
    && node.length >= 3
    && numericZero(node[1], variable, value)
    && (node[2] === -1
      || (Array.isArray(node[2]) && node[2][0] === 'Rational' && Number(node[2][1]) < 0))
  ) {
    return true;
  }
  return node.slice(1).some((child) => containsZeroDenominator(child, variable, value));
}

function cellEvidence(
  canonicalLatex: string,
  mathJson: unknown,
  undefinedReason?: TableMathJsonCellEvidence['undefinedReason'],
): TableMathJsonCellEvidence {
  return {
    canonicalLatex,
    ...(mathJson !== undefined ? { mathJson: mathJson as TableMathJsonCellEvidence['mathJson'] } : {}),
    ...(undefinedReason ? { undefinedReason } : {}),
  };
}

function functionCall(name: 'f' | 'g', variable: string) {
  return ['InvisibleOperator', name, ['Delimiter', variable]];
}

function tableFunctionEvidence(
  prepared: Extract<PreparedTableBuild, { kind: 'ready' }>,
  variable: string,
): TableMathJsonCellEvidence {
  const primary = ['Equal', functionCall('f', variable), ce.parse(prepared.primaryLatex).json];
  if (!prepared.secondaryLatex) {
    return cellEvidence(`f(${variable})=${prepared.primaryLatex}`, primary);
  }
  const secondary = ['Equal', functionCall('g', variable), ce.parse(prepared.secondaryLatex).json];
  return cellEvidence(
    `f(${variable})=${prepared.primaryLatex},\\;g(${variable})=${prepared.secondaryLatex}`,
    ['Delimiter', ['Sequence', primary, secondary], "','"],
  );
}

function prepareTableBuild(request: TableRequest): PreparedTableBuild {
  const primaryCanonical = canonicalizeMathInput(request.primaryExpression.latex, {
    mode: 'table',
    screenHint: 'table',
  });
  const secondaryCanonical = request.secondaryExpression?.latex
    ? canonicalizeMathInput(request.secondaryExpression.latex, {
        mode: 'table',
        screenHint: 'table',
      })
    : null;
  const primaryLatex = primaryCanonical.ok
    ? primaryCanonical.canonicalLatex
    : request.primaryExpression.latex;
  const secondaryLatex = secondaryCanonical?.ok
    ? secondaryCanonical.canonicalLatex
    : request.secondaryExpression?.latex;

  if (!primaryLatex.trim()) {
    return {
      kind: 'error',
      response: {
        headers: [],
        rows: [],
        warnings: [],
        error: 'Enter f(x) before building a table.',
      },
    };
  }

  if (request.step <= 0) {
    return {
      kind: 'error',
      response: {
        headers: [],
        rows: [],
        warnings: [],
        error: 'Step size must be greater than zero.',
      },
    };
  }

  const estimatedRows = Math.floor((request.end - request.start) / request.step) + 1;
  if (estimatedRows <= 0 || estimatedRows > 40) {
    return {
      kind: 'error',
      response: {
        headers: [],
        rows: [],
        warnings: [],
        error: 'Choose a range that produces between 1 and 40 rows.',
      },
    };
  }

  return {
    kind: 'ready',
    primaryLatex,
    secondaryLatex,
    estimatedRows,
  };
}

function tableEvaluationError(): TableResponse {
  return {
    headers: [],
    rows: [],
    warnings: [],
    error: 'The table formulas could not be evaluated.',
  };
}

function buildCompletedTableResponse(
  request: TableRequest,
  prepared: Extract<PreparedTableBuild, { kind: 'ready' }>,
): TableBuildWithEvidence {
  const warningSet = new Set<string>();
  const evidenceRows: TableMathJsonEvidence['rows'] = [];
  const rows = Array.from({ length: prepared.estimatedRows }, (_, index) => {
    const x = request.start + request.step * index;
    const primary = evaluateAtPoint(prepared.primaryLatex, request.variable, x);
    const secondary = prepared.secondaryLatex
      ? evaluateAtPoint(prepared.secondaryLatex, request.variable, x)
      : null;
    if (primary.warning) {
      warningSet.add(primary.warning);
    }
    if (secondary?.warning) {
      warningSet.add(secondary.warning);
    }
    const xText = formatApproxNumber(x);
    const row = {
      x: xText,
      primary: primary.text,
      secondary: prepared.secondaryLatex
        ? secondary?.text
        : undefined,
    };
    evidenceRows.push({
      x: cellEvidence(xText, roundedApproxNumberValue(x)),
      primary: cellEvidence(primary.text, primary.mathJson, primary.undefinedReason),
      ...(secondary
        ? { secondary: cellEvidence(secondary.text, secondary.mathJson, secondary.undefinedReason) }
        : {}),
    });
    return row;
  });

  const headers = [
    request.variable,
    prepared.primaryLatex,
    ...(prepared.secondaryLatex ? [prepared.secondaryLatex] : []),
  ];

  return {
    response: {
      headers,
      rows,
      warnings: [...warningSet],
    },
    evidence: {
      functions: tableFunctionEvidence(prepared, request.variable),
      variable: cellEvidence(request.variable, request.variable),
      rows: evidenceRows,
    },
  };
}

export function buildTable(request: TableRequest): TableResponse {
  return buildTableWithEvidence(request).response;
}

export function buildTableWithEvidence(request: TableRequest): TableBuildWithEvidence {
  const prepared = prepareTableBuild(request);
  if (prepared.kind === 'error') {
    return { response: prepared.response };
  }

  try {
    return buildCompletedTableResponse(request, prepared);
  } catch {
    return { response: tableEvaluationError() };
  }
}

export async function buildTableCooperativelyWithEvidence(
  request: TableRequest,
  options: CooperativeTableBuildOptions = {},
): Promise<CooperativeTableBuildWithEvidenceResult> {
  const prepared = prepareTableBuild(request);
  if (prepared.kind === 'error') {
    return {
      kind: 'completed',
      response: prepared.response,
    };
  }

  try {
    const warningSet = new Set<string>();
    const rows: TableResponse['rows'] = [];
    const evidenceRows: TableMathJsonEvidence['rows'] = [];
    const rowsPerBatch = Math.max(1, options.rowsPerBatch ?? 5);

    for (let index = 0; index < prepared.estimatedRows; index += 1) {
      if (options.shouldCancel?.()) {
        return { kind: 'cancelled' };
      }

      const x = request.start + request.step * index;
      const primary = evaluateAtPoint(prepared.primaryLatex, request.variable, x);
      const secondary = prepared.secondaryLatex
        ? evaluateAtPoint(prepared.secondaryLatex, request.variable, x)
        : null;
      if (primary.warning) {
        warningSet.add(primary.warning);
      }
      if (secondary?.warning) {
        warningSet.add(secondary.warning);
      }
      const xText = formatApproxNumber(x);
      rows.push({
        x: xText,
        primary: primary.text,
        secondary: prepared.secondaryLatex
          ? secondary?.text
          : undefined,
      });
      evidenceRows.push({
        x: cellEvidence(xText, roundedApproxNumberValue(x)),
        primary: cellEvidence(primary.text, primary.mathJson, primary.undefinedReason),
        ...(secondary
          ? { secondary: cellEvidence(secondary.text, secondary.mathJson, secondary.undefinedReason) }
          : {}),
      });

      const completedRows = index + 1;
      if (completedRows % rowsPerBatch === 0 || completedRows === prepared.estimatedRows) {
        options.onCheckpoint?.({
          completedRows,
          totalRows: prepared.estimatedRows,
        });
        if (options.shouldCancel?.()) {
          return { kind: 'cancelled' };
        }
        await options.yieldIfBudgetExceeded?.(
          `Table build yielded after ${completedRows}/${prepared.estimatedRows} row(s).`,
        );
        if (options.shouldCancel?.()) {
          return { kind: 'cancelled' };
        }
      }
    }

    const headers = [
      request.variable,
      prepared.primaryLatex,
      ...(prepared.secondaryLatex ? [prepared.secondaryLatex] : []),
    ];

    return {
      kind: 'completed',
      response: {
        headers,
        rows,
        warnings: [...warningSet],
      },
      evidence: {
        functions: tableFunctionEvidence(prepared, request.variable),
        variable: cellEvidence(request.variable, request.variable),
        rows: evidenceRows,
      },
    };
  } catch {
    return {
      kind: 'completed',
      response: tableEvaluationError(),
    };
  }
}

export async function buildTableCooperatively(
  request: TableRequest,
  options: CooperativeTableBuildOptions = {},
): Promise<CooperativeTableBuildResult> {
  const result = await buildTableCooperativelyWithEvidence(request, options);
  return result.kind === 'cancelled'
    ? result
    : { kind: 'completed', response: result.response };
}
