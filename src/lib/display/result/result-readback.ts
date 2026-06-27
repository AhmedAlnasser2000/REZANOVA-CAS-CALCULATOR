import { expandImplicitCharacterProductsInLatex } from '../../algebra/variable-core';

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
const RELATIONAL_FACT_PATTERN =
  /(?:\\(?:ne|neq|ge|geq|le|leq)|[=<>])/u;
const FUNCTION_COMMANDS_WITH_PAREN_ARGUMENT = new Set([
  '\\Big',
  '\\Bigg',
  '\\big',
  '\\bigg',
  '\\Biggl',
  '\\Biggr',
  '\\Bigl',
  '\\Bigr',
  '\\biggl',
  '\\biggr',
  '\\bigl',
  '\\bigr',
  '\\arccos',
  '\\arcsin',
  '\\arctan',
  '\\cos',
  '\\cot',
  '\\csc',
  '\\exp',
  '\\ln',
  '\\log',
  '\\sec',
  '\\sin',
  '\\sqrt',
  '\\tan',
  '\\left',
  '\\right',
]);

function previousSignificantChar(source: string) {
  for (let index = source.length - 1; index >= 0; index -= 1) {
    const char = source[index];
    if (!/\s/.test(char)) {
      return char;
    }
  }
  return '';
}

function nextLatexCommand(source: string, start: number) {
  if (source[start] !== '\\') {
    return null;
  }

  let index = start + 1;
  while (index < source.length && /[A-Za-z]/.test(source[index])) {
    index += 1;
  }

  return {
    command: source.slice(start, index),
    nextIndex: index,
  };
}

function shouldInsertProductBeforeGroup(output: string) {
  return /[A-Za-z0-9)}\]]/.test(previousSignificantChar(output));
}

function shouldInsertProductBeforeSymbol(output: string) {
  return /[)}\]]/.test(previousSignificantChar(output));
}

export function spaceImplicitProductsForMathDisplay(latex: string) {
  const expanded = expandImplicitCharacterProductsInLatex(latex, { separator: '\\,' });
  let index = 0;
  let output = '';
  let suppressNextParenProduct = false;

  while (index < expanded.length) {
    const char = expanded[index];
    if (char === '\\') {
      const commandInfo = nextLatexCommand(expanded, index);
      if (!commandInfo) {
        output += char;
        index += 1;
        continue;
      }

      output += commandInfo.command;
      suppressNextParenProduct = FUNCTION_COMMANDS_WITH_PAREN_ARGUMENT.has(commandInfo.command);
      index = commandInfo.nextIndex;
      continue;
    }

    if (char === '(' || char === '[') {
      if (!suppressNextParenProduct && shouldInsertProductBeforeGroup(output)) {
        output += '\\,';
      }
      output += char;
      suppressNextParenProduct = false;
      index += 1;
      continue;
    }

    if (/[A-Za-z0-9]/.test(char)) {
      if (shouldInsertProductBeforeSymbol(output)) {
        output += '\\,';
      }
      output += char;
      suppressNextParenProduct = false;
      index += 1;
      continue;
    }

    output += char;
    if (!/\s/.test(char)) {
      suppressNextParenProduct = false;
    }
    index += 1;
  }

  return output;
}

export function cleanDisplaySupplementLatex(latex: string) {
  const trimmed = latex.trim();
  const cleaned = trimmed.replace(SUPPLEMENT_PREFIX_PATTERN, '').trim();
  return spaceImplicitProductsForMathDisplay(cleaned.length > 0 ? cleaned : trimmed);
}

function splitTopLevelFactCommas(latex: string) {
  const parts: string[] = [];
  let current = '';
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < latex.length; index += 1) {
    const char = latex[index];
    const previous = latex[index - 1] ?? '';

    if (char === '{') {
      braceDepth += 1;
    } else if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (char === '(') {
      parenDepth += 1;
    } else if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (char === '[') {
      bracketDepth += 1;
    } else if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }

    if (
      char === ','
      && previous !== '\\'
      && braceDepth === 0
      && parenDepth === 0
      && bracketDepth === 0
    ) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  parts.push(current.trim());
  return parts;
}

function trimSupplementFact(latex: string) {
  return latex
    .replace(/^(?:\\[,;:]|\\quad|\\qquad)\s*/u, '')
    .replace(/\s*(?:\\[,;:]|\\quad|\\qquad)$/u, '')
    .trim();
}

function splitDisplaySupplementLatex(latex: string) {
  const cleaned = cleanDisplaySupplementLatex(latex);
  if (!cleaned.includes(',')) {
    return cleaned.length > 0 ? [cleaned] : [];
  }

  const facts = splitTopLevelFactCommas(cleaned)
    .map(trimSupplementFact)
    .filter((fact) => fact.length > 0);

  if (facts.length < 2 || !facts.every((fact) => RELATIONAL_FACT_PATTERN.test(fact))) {
    return cleaned.length > 0 ? [cleaned] : [];
  }

  return facts;
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
    .flatMap(splitDisplaySupplementLatex)
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
