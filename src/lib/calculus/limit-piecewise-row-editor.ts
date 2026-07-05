import {
  buildNaturalLimitRequestLatex,
  parseNaturalLimitRequest,
  type NaturalLimitRequest,
} from './limit-request';
import {
  parsePiecewiseLimitExpression,
  type PiecewiseLimitBranch,
} from '../symbolic-engine/limits';

export type LimitPiecewiseRow = {
  id: string;
  expressionLatex: string;
  conditionLatex: string;
  otherwise: boolean;
};

export type LimitPiecewiseRowIssue = {
  rowId: string;
  field: 'expression' | 'condition';
  message: string;
};

export type LimitPiecewiseDraft = {
  request: NaturalLimitRequest;
  rows: LimitPiecewiseRow[];
  issues: LimitPiecewiseRowIssue[];
};

const OTHERWISE_LATEX = '\\text{otherwise}';

function stripLimitBodyWrapper(bodyLatex: string) {
  const trimmed = bodyLatex.trim();
  const leftWrapped = trimmed.match(/^\\left\(([\s\S]+)\\right\)$/u);
  if (leftWrapped) {
    return leftWrapped[1].trim();
  }
  return trimmed;
}

function extractRawLimitBody(requestLatex: string | null | undefined) {
  const source = requestLatex?.trim() ?? '';
  if (!source) {
    return null;
  }

  const latexLimit = source.match(/^\\lim_\{[^{}]*\\to[^{}]*\}([\s\S]+)$/u);
  if (latexLimit) {
    return latexLimit[1].trim();
  }

  const friendlyLimit = source.match(/^lim\s+[a-zA-Z\\]+(?:\s*->|\s+to\s+)[^\s]+\s+([\s\S]+)$/iu);
  return friendlyLimit ? friendlyLimit[1].trim() : null;
}

function splitTopLevel(input: string, delimiters: Set<string>) {
  return splitTopLevelPreservingEmpty(input, delimiters).filter(Boolean);
}

function splitTopLevelPreservingEmpty(
  input: string,
  delimiters: Set<string>,
  options: { preserveWhitespace?: boolean } = {},
) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
    } else if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && delimiters.has(char)) {
      const part = input.slice(start, index);
      parts.push(options.preserveWhitespace ? part : part.trim());
      start = index + 1;
    }
  }

  const part = input.slice(start);
  parts.push(options.preserveWhitespace ? part : part.trim());
  return parts;
}

function cleanExpressionLatex(input: string) {
  return input
    .trim()
    .replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/gu, '')
    .replace(/,+$/u, '')
    .trim();
}

function cleanConditionLatex(input: string) {
  return input
    .replace(/^if\b\s*/iu, '')
    .replace(/[ \t]+/gu, ' ')
}

function splitFriendlyBranchEntry(entry: string) {
  const source = entry.trim();
  const otherwise = source.match(/^([\s\S]+?)\s*(?:\\text\{\s*)?otherwise\s*\}?$/iu);
  if (otherwise) {
    return {
      expressionLatex: cleanExpressionLatex(otherwise[1]),
      conditionLatex: OTHERWISE_LATEX,
      otherwise: true,
    };
  }

  const conditional = source.match(/^([\s\S]+?)\s*if\s*([\s\S]+)$/iu);
  if (conditional) {
    return {
      expressionLatex: cleanExpressionLatex(conditional[1]),
      conditionLatex: cleanConditionLatex(conditional[2]),
      otherwise: false,
    };
  }

  return {
    expressionLatex: cleanExpressionLatex(source),
    conditionLatex: '',
    otherwise: false,
  };
}

function branchToRow(branch: PiecewiseLimitBranch, index: number): LimitPiecewiseRow {
  return {
    id: `piecewise-row-${index + 1}`,
    expressionLatex: cleanExpressionLatex(branch.expressionLatex),
    conditionLatex: branch.otherwise ? OTHERWISE_LATEX : branch.condition?.latex ?? '',
    otherwise: Boolean(branch.otherwise),
  };
}

function normalizeRows(rows: readonly LimitPiecewiseRow[]) {
  const normalized: LimitPiecewiseRow[] = [];
  let otherwise: LimitPiecewiseRow | null = null;

  for (const [index, row] of rows.entries()) {
    const nextRow = {
      ...row,
      id: row.id || `piecewise-row-${index + 1}`,
      expressionLatex: cleanExpressionLatex(row.expressionLatex),
      conditionLatex: row.otherwise ? OTHERWISE_LATEX : cleanConditionLatex(row.conditionLatex),
    };
    if (nextRow.otherwise) {
      otherwise ??= nextRow;
    } else {
      normalized.push(nextRow);
    }
  }

  if (otherwise) {
    normalized.push({
      ...otherwise,
      conditionLatex: OTHERWISE_LATEX,
      otherwise: true,
    });
  }

  return normalized.map((row, index) => ({
    ...row,
    id: `piecewise-row-${index + 1}`,
  }));
}

function recoverFriendlyRows(bodyLatex: string) {
  const match = bodyLatex.trim().match(/^piecewise\s*\(([\s\S]*)\)$/iu);
  if (!match) {
    return null;
  }

  const rows = splitTopLevel(match[1], new Set([',', ';', '\n'])).map((entry, index) => {
    const branch = splitFriendlyBranchEntry(entry);
    return {
      id: `piecewise-row-${index + 1}`,
      ...branch,
    };
  });

  return rows.length > 0 ? normalizeRows(rows) : null;
}

function recoverCasesRows(bodyLatex: string) {
  const match = bodyLatex.trim().match(/^\\begin\{cases\}([\s\S]*)\\end\{cases\}$/u);
  if (!match) {
    return null;
  }

  const rows = match[1]
    .split(/\\\\/u)
    .map((source, index) => {
      const [expressionLatex = '', conditionLatex = ''] = splitTopLevelPreservingEmpty(
        source,
        new Set(['&']),
        { preserveWhitespace: true },
      );
      const otherwise = /otherwise|\\top|true/iu.test(conditionLatex);
      return {
        id: `piecewise-row-${index + 1}`,
        expressionLatex: cleanExpressionLatex(expressionLatex),
        conditionLatex: otherwise ? OTHERWISE_LATEX : conditionLatex,
        otherwise,
      };
    });

  return rows.length > 0 ? normalizeRows(rows) : null;
}

export function defaultLimitPiecewiseRows(): LimitPiecewiseRow[] {
  return normalizeRows([
    {
      id: 'piecewise-row-1',
      expressionLatex: '',
      conditionLatex: 'x<0',
      otherwise: false,
    },
    {
      id: 'piecewise-row-2',
      expressionLatex: '',
      conditionLatex: OTHERWISE_LATEX,
      otherwise: true,
    },
  ]);
}

export function validateLimitPiecewiseRows(rows: readonly LimitPiecewiseRow[]) {
  const issues: LimitPiecewiseRowIssue[] = [];
  const normalizedRows = normalizeRows(rows);

  if (normalizedRows.length < 2) {
    issues.push({
      rowId: normalizedRows[0]?.id ?? 'piecewise-row-1',
      field: 'expression',
      message: 'Piecewise limits need at least two rows.',
    });
  }

  for (const row of normalizedRows) {
    if (!row.expressionLatex.trim()) {
      issues.push({
        rowId: row.id,
        field: 'expression',
        message: 'Enter an expression for this row.',
      });
    }
    if (!row.otherwise && !row.conditionLatex.trim()) {
      issues.push({
        rowId: row.id,
        field: 'condition',
        message: 'Enter a simple condition for this row.',
      });
    }
    if (row.otherwise && row.conditionLatex.trim() !== OTHERWISE_LATEX) {
      issues.push({
        rowId: row.id,
        field: 'condition',
        message: 'Otherwise rows do not take an extra condition.',
      });
    }
  }

  return issues;
}

export function serializeLimitPiecewiseRows(rows: readonly LimitPiecewiseRow[]) {
  const normalizedRows = normalizeRows(rows);
  return `\\begin{cases}${normalizedRows
    .map((row) => {
      const conditionLatex = row.otherwise ? OTHERWISE_LATEX : row.conditionLatex;
      return `${row.expressionLatex.trim()}&${conditionLatex}`;
    })
    .join('\\\\')}\\end{cases}`;
}

export function serializeLimitPiecewiseRequest(
  request: NaturalLimitRequest,
  rows: readonly LimitPiecewiseRow[],
) {
  return buildNaturalLimitRequestLatex({
    ...request,
    bodyLatex: serializeLimitPiecewiseRows(rows),
  });
}

export function parseLimitPiecewiseDraft(requestLatex: string | null | undefined): LimitPiecewiseDraft | null {
  const parsedRequest = parseNaturalLimitRequest(requestLatex);
  if (!parsedRequest.ok) {
    return null;
  }

  const bodyLatex = stripLimitBodyWrapper(parsedRequest.request.bodyLatex);
  const rawBodyLatex = stripLimitBodyWrapper(extractRawLimitBody(requestLatex) ?? bodyLatex);
  const parsedPiecewise = parsePiecewiseLimitExpression(bodyLatex);
  let rows: LimitPiecewiseRow[] | null = recoverCasesRows(rawBodyLatex)
    ?? recoverFriendlyRows(rawBodyLatex)
    ?? recoverCasesRows(bodyLatex)
    ?? recoverFriendlyRows(bodyLatex);

  if (rows) {
    rows = normalizeRows(rows);
  } else if (parsedPiecewise.kind === 'piecewise') {
    rows = normalizeRows(parsedPiecewise.branches.map(branchToRow));
  } else if (parsedPiecewise.kind === 'malformed') {
    rows = recoverCasesRows(bodyLatex) ?? recoverFriendlyRows(bodyLatex);
  } else {
    rows = recoverCasesRows(bodyLatex) ?? recoverFriendlyRows(bodyLatex);
  }

  if (!rows) {
    return null;
  }

  return {
    request: parsedRequest.request,
    rows,
    issues: validateLimitPiecewiseRows(rows),
  };
}

export function buildStarterLimitPiecewiseRequest() {
  return serializeLimitPiecewiseRequest({
    variable: 'x',
    variableLatex: 'x',
    bodyLatex: '',
    target: {
      kind: 'finite',
      value: 0,
      normalizedTargetLatex: '0',
      direction: 'two-sided',
    },
    canonicalLatex: '',
  }, defaultLimitPiecewiseRows());
}

export function limitPiecewiseReadbackBodyLatex(bodyLatex: string) {
  const parsed = parsePiecewiseLimitExpression(stripLimitBodyWrapper(bodyLatex));
  if (parsed.kind === 'piecewise') {
    return serializeLimitPiecewiseRows(parsed.branches.map(branchToRow));
  }

  const rows = recoverCasesRows(stripLimitBodyWrapper(bodyLatex))
    ?? recoverFriendlyRows(stripLimitBodyWrapper(bodyLatex));
  if (rows) {
    const issues = validateLimitPiecewiseRows(rows);
    return issues.length === 0
      ? serializeLimitPiecewiseRows(rows)
      : `\\text{${rows.length} rows}`;
  }

  return bodyLatex;
}
