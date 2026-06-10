export const RESULT_SIZE_POLICY_LATEX_LENGTH = 2500;
export const RESULT_SIZE_POLICY_LINE_COUNT = 24;
export const RESULT_SIZE_POLICY_PREVIEW_LENGTH = 220;

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
