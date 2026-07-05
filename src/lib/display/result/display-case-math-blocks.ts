import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  DisplayOutcome,
} from '../../../types/calculator';
import { caseMathCountSummary } from './display-block-summary';
import type { DisplayBlock, DisplayBlockLine } from './display-blocks';

const CASE_MATH_DETAIL_TITLES = new Set([
  'Absolute-Value Formula Cases',
  'Square-Power Formula Cases',
  'Even-Power Formula Cases',
  'Nth-Root Formula Cases',
  'Trig Formula Cases',
  'Real Cardano Cases',
  'Real Ferrari Cases',
]);

const GROUPED_FORMULA_CASE_DETAIL_TITLES = new Set([
  'Absolute-Value Formula Cases',
  'Square-Power Formula Cases',
  'Even-Power Formula Cases',
  'Nth-Root Formula Cases',
  'Trig Formula Cases',
]);

function cloneParts(parts: readonly DisplayDetailLinePart[] | undefined) {
  return parts?.map((part) => ({ ...part }));
}

export function isCaseMathDetailSection(section: DisplayDetailSection) {
  return CASE_MATH_DETAIL_TITLES.has(section.title);
}

function caseMathSectionFromOutcome(outcome: DisplayOutcome) {
  return outcome.kind === 'success'
    ? outcome.detailSections?.find((section) => CASE_MATH_DETAIL_TITLES.has(section.title))
    : undefined;
}

function caseMathBranchFamilyCountFromSection(section: DisplayDetailSection) {
  if (!GROUPED_FORMULA_CASE_DETAIL_TITLES.has(section.title)) {
    return 0;
  }

  return new Set(section.lineParts
    ?.map((parts) => parts.find((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math')?.latex.trim())
    .filter((latex): latex is string => Boolean(latex)) ?? []).size;
}

function caseMathTarget(answerLatex: string) {
  const match = answerLatex.trim().match(/^(.+?)(\\in|=)\s*\\begin\{cases\}/su);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return {
    latex: `${match[1]}${match[2]}`,
    operator: match[2],
  };
}

function isEscaped(latex: string, index: number) {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && latex[cursor] === '\\'; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function findTopLevelToken(latex: string, token: string, startIndex = 0) {
  let depth = 0;
  for (let index = startIndex; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === '{' && !isEscaped(latex, index)) {
      depth += 1;
    } else if (char === '}' && !isEscaped(latex, index)) {
      depth = Math.max(0, depth - 1);
    }
    if (depth === 0 && latex.startsWith(token, index)) {
      return index;
    }
  }
  return -1;
}

function matchingBraceIndex(latex: string, openingBraceIndex: number) {
  let depth = 0;
  for (let index = openingBraceIndex; index < latex.length; index += 1) {
    const char = latex[index];
    if (char === '{' && !isEscaped(latex, index)) {
      depth += 1;
    } else if (char === '}' && !isEscaped(latex, index)) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function splitSubstackLatex(latex: string) {
  const separator = findTopLevelToken(latex, String.raw`\\`);
  if (separator < 0) {
    return {
      conditionLatex: latex.trim(),
      groupLatex: undefined,
    };
  }

  return {
    conditionLatex: latex.slice(separator + 2).trim(),
    groupLatex: latex.slice(0, separator).trim(),
  };
}

function parsedSubstackCaseLines(answerLatex: string) {
  const trimmed = answerLatex.trim();
  const casesMatch = trimmed.match(/^(.+?)(?:\\in|=)\s*\\begin\{cases\}([\s\S]*)\\end\{cases\}$/u);
  if (!casesMatch) {
    return null;
  }

  const body = casesMatch[2] ?? '';
  const delimiter = String.raw`,&`;
  const lines: DisplayBlockLine[] = [];
  let cursor = 0;

  while (cursor < body.length) {
    const delimiterIndex = findTopLevelToken(body, delimiter, cursor);
    if (delimiterIndex < 0) {
      return null;
    }

    const valueLatex = body.slice(cursor, delimiterIndex).trim();
    let conditionLatex: string;
    let groupLatex: string | undefined;
    let rowEnd = delimiterIndex + delimiter.length;
    if (body.startsWith(String.raw`\substack`, rowEnd)) {
      const substackStart = rowEnd + String.raw`\substack`.length;
      if (body[substackStart] !== '{') {
        return null;
      }

      const substackEnd = matchingBraceIndex(body, substackStart);
      if (substackEnd < 0) {
        return null;
      }

      const split = splitSubstackLatex(
        body.slice(substackStart + 1, substackEnd),
      );
      conditionLatex = split.conditionLatex;
      groupLatex = split.groupLatex;
      rowEnd = substackEnd + 1;
    } else {
      const plainConditionEnd = findTopLevelToken(body, String.raw`\\`, rowEnd);
      rowEnd = plainConditionEnd < 0 ? body.length : plainConditionEnd;
      conditionLatex = body.slice(delimiterIndex + delimiter.length, rowEnd).trim();
    }

    lines.push({
      id: `answer-replayed-case-${lines.length}`,
      conditionLatex,
      groupLatex,
      label: conditionLatex,
      latex: valueLatex,
      testId: `display-outcome-answer-replayed-case-${lines.length}`,
      text: [
        groupLatex ? `${groupLatex}: ` : '',
        valueLatex,
        conditionLatex ? `, ${conditionLatex}` : '',
      ].join(''),
    });

    cursor = rowEnd;
    if (body.startsWith(String.raw`\\`, cursor)) {
      cursor += 2;
    }
    while (/\s/u.test(body[cursor] ?? '')) {
      cursor += 1;
    }
  }

  if (lines.length === 0) {
    return null;
  }

  const groupedCaseLabels = [...new Set(lines
    .map((line) => line.groupLatex)
    .filter((latex): latex is string => Boolean(latex)))];
  const showGroupedCaseLabels = groupedCaseLabels.length > 1;
  return lines.map((line) => (
    showGroupedCaseLabels
      ? line
      : {
        ...line,
        groupLatex: undefined,
      }
  ));
}

export function caseMathDetailLinesFromSection(
  section: DisplayDetailSection,
  idPrefix: string,
  testIdPrefix: string,
) {
  if (!section.lineParts) {
    return null;
  }

  const groupedCaseSection = GROUPED_FORMULA_CASE_DETAIL_TITLES.has(section.title);
  const groupedCaseLabels = groupedCaseSection
    ? [...new Set(section.lineParts
      .map((parts) => parts.find((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
        part.kind === 'math')?.latex)
      .filter((latex): latex is string => Boolean(latex)))]
    : [];
  const showGroupedCaseLabels = groupedCaseLabels.length > 1;
  const maybeLines = section.lineParts.map((parts, index): DisplayBlockLine | null => {
    const mathParts = parts.filter((part): part is Extract<DisplayDetailLinePart, { kind: 'math' }> =>
      part.kind === 'math');
    if (mathParts.length < (groupedCaseSection ? 3 : 2)) {
      return null;
    }
    const conditionLatex = groupedCaseSection ? mathParts[2].latex : mathParts[1].latex;
    return {
      id: `${idPrefix}-case-${index}`,
      conditionLatex,
      ...(groupedCaseSection && showGroupedCaseLabels ? { groupLatex: mathParts[0].latex } : {}),
      label: conditionLatex,
      latex: groupedCaseSection ? mathParts[1].latex : mathParts[0].latex,
      parts: cloneParts(parts),
      testId: `${testIdPrefix}-case-${index}`,
      text: section.lines[index],
    };
  });

  if (maybeLines.some((line) => line === null)) {
    return null;
  }
  return maybeLines.filter((line): line is DisplayBlockLine => line !== null);
}

export function caseMathAnswerBlockFromOutcome(
  outcome: DisplayOutcome,
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  const section = caseMathSectionFromOutcome(outcome);
  const target = caseMathTarget(answerLatex);
  if (!section || !target) {
    return null;
  }

  const lines = caseMathDetailLinesFromSection(section, 'answer', 'display-outcome-answer');
  if (!lines) {
    return null;
  }

  return {
    id: 'answer',
    kind: 'answer',
    label,
    renderKind: 'caseMath',
    collapsible: true,
    defaultCollapsed: false,
    countSummary: caseMathCountSummary(
      lines,
      caseMathBranchFamilyCountFromSection(section),
    ),
    latex: answerLatex,
    lines: lines as DisplayBlockLine[],
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
    text: target.latex,
  };
}

export function caseMathAnswerBlockFromLatex(
  answerLatex: string,
  label: string,
): DisplayBlock | null {
  const target = caseMathTarget(answerLatex);
  const lines = parsedSubstackCaseLines(answerLatex);
  if (!target || !lines) {
    return null;
  }

  if (target.operator === '=' && lines.length <= 6) {
    return null;
  }

  return {
    id: 'answer',
    kind: 'answer',
    label,
    renderKind: 'caseMath',
    collapsible: true,
    defaultCollapsed: false,
    countSummary: caseMathCountSummary(lines),
    latex: answerLatex,
    lines,
    rawContent: [answerLatex],
    testId: 'display-outcome-answer-block',
    text: target.latex,
  };
}
