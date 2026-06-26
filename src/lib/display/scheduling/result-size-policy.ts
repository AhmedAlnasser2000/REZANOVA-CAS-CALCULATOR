export const RESULT_SIZE_POLICY_LATEX_LENGTH = 320000;
export const RESULT_SIZE_POLICY_LINE_COUNT = 24;
export const RESULT_SIZE_POLICY_PREVIEW_LENGTH = 220;
export const RESULT_BRANCH_VISIBLE_LIMIT = 4;
export const RESULT_CASE_MATH_ROW_LIMIT = 4;
export const RESULT_CASE_MATH_TOTAL_LATEX_LENGTH = 860;
export const RESULT_CASE_MATH_ROW_LATEX_LENGTH = 360;
export const RESULT_CASE_MATH_GROUP_LIMIT = 1;

export type ResultSizePolicy =
  | {
      kind: 'normal';
      signature: string;
    }
  | {
      kind: 'compact';
      signature: string;
      latexLength: number;
      lineCount: number;
      previewText: string;
    };

export type CaseMathSizePolicy =
  | {
      kind: 'normal';
      signature: string;
    }
  | {
      kind: 'compact';
      signature: string;
      latexLength: number;
      rowCount: number;
      groupCount: number;
      previewText: string;
    };

type CaseMathPolicyLine = {
  conditionLatex?: string;
  groupLatex?: string;
  label?: string;
  latex?: string;
  text?: string;
};

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function buildLatexPreview(latex: string, limit = RESULT_SIZE_POLICY_PREVIEW_LENGTH) {
  const compact = compactWhitespace(latex);
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit).trimEnd()}...`;
}

function signatureForLatex(latex: string, lineCount: number) {
  return [
    latex.length,
    lineCount,
    latex.slice(0, 80),
    latex.slice(-80),
  ].join(':');
}

export function classifyLatexResultSize(latex: string | undefined): ResultSizePolicy {
  const value = latex ?? '';
  const signature = signatureForLatex(value, 1);

  if (value.length <= RESULT_SIZE_POLICY_LATEX_LENGTH) {
    return { kind: 'normal', signature };
  }

  return {
    kind: 'compact',
    signature,
    latexLength: value.length,
    lineCount: 1,
    previewText: buildLatexPreview(value),
  };
}

export function classifyLatexCollectionResultSize(lines: readonly string[]): ResultSizePolicy {
  const joined = lines.join('\n');
  const signature = signatureForLatex(joined, lines.length);

  if (
    joined.length <= RESULT_SIZE_POLICY_LATEX_LENGTH
    && lines.length <= RESULT_SIZE_POLICY_LINE_COUNT
  ) {
    return { kind: 'normal', signature };
  }

  return {
    kind: 'compact',
    signature,
    latexLength: joined.length,
    lineCount: lines.length,
    previewText: buildLatexPreview(joined),
  };
}

function caseMathLineLatex(line: CaseMathPolicyLine) {
  return [
    line.groupLatex,
    line.latex,
    line.conditionLatex ?? line.label,
    line.text,
  ].filter(Boolean).join(' ');
}

export function classifyCaseMathResultSize(lines: readonly CaseMathPolicyLine[]): CaseMathSizePolicy {
  const lineLatex = lines.map(caseMathLineLatex);
  const joined = lineLatex.join('\n');
  const groupCount = new Set(lines
    .map((line) => line.groupLatex)
    .filter((latex): latex is string => Boolean(latex))).size;
  const signature = signatureForLatex(joined, lines.length);
  const hasLongRow = lineLatex.some((line) => line.length > RESULT_CASE_MATH_ROW_LATEX_LENGTH);

  if (
    lines.length <= RESULT_CASE_MATH_ROW_LIMIT
    && groupCount <= RESULT_CASE_MATH_GROUP_LIMIT
    && joined.length <= RESULT_CASE_MATH_TOTAL_LATEX_LENGTH
    && !hasLongRow
  ) {
    return { kind: 'normal', signature };
  }

  return {
    kind: 'compact',
    signature,
    latexLength: joined.length,
    rowCount: lines.length,
    groupCount,
    previewText: buildLatexPreview(joined),
  };
}
