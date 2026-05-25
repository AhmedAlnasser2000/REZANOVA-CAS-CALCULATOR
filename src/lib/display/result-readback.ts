export type ResultReadbackInput = {
  exactLatex?: string;
  exactSupplementLatex?: readonly string[];
};

export type ResultReadbackAnswerSection = {
  kind: 'answer';
  label: 'Answer';
  latex: string;
};

export type ResultReadbackValidWhenSection = {
  kind: 'valid-when';
  label: 'Valid when';
  latex: string[];
};

export type ResultReadbackSection =
  | ResultReadbackAnswerSection
  | ResultReadbackValidWhenSection;

const SUPPLEMENT_PREFIX_PATTERN =
  /^\\text\{(?:Conditions?|Exclusions?):\s*\}\s*/iu;

export function cleanDisplaySupplementLatex(latex: string) {
  const trimmed = latex.trim();
  const cleaned = trimmed.replace(SUPPLEMENT_PREFIX_PATTERN, '').trim();
  return cleaned.length > 0 ? cleaned : trimmed;
}

export function buildResultReadbackSections(
  input: ResultReadbackInput | null | undefined,
): ResultReadbackSection[] {
  const sections: ResultReadbackSection[] = [];
  const answerLatex = input?.exactLatex?.trim();

  if (answerLatex) {
    sections.push({
      kind: 'answer',
      label: 'Answer',
      latex: answerLatex,
    });
  }

  const validWhenLatex = (input?.exactSupplementLatex ?? [])
    .map(cleanDisplaySupplementLatex)
    .filter((latex) => latex.length > 0);

  if (validWhenLatex.length > 0) {
    sections.push({
      kind: 'valid-when',
      label: 'Valid when',
      latex: validWhenLatex,
    });
  }

  return sections;
}
