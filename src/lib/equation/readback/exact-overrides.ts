import { exactLatexForFiniteBranches } from './finite-branches';
import type { ExactReadbackNormalizationContext } from './normalization';
import { profileEquationResult } from '../../display/printer';

export type FiniteRootOverrideNormalization = {
  exactLatex: string;
  branchesLatex: string[];
};

type NormalizeFiniteRootOverrideOptions = {
  exactLatex: string;
  targetLatex: string;
  setSeparator?: string;
  context?: ExactReadbackNormalizationContext;
};

const FINITE_SET_INFIX = '\\in\\left\\{';
const FINITE_SET_SUFFIX = '\\right\\}';

export function extractFiniteRootBranchesFromExactLatex(
  exactLatex: string,
  targetLatex: string,
): string[] | null {
  const rowBranches = extractRepeatedEqualityRows(exactLatex, targetLatex);
  if (rowBranches) {
    return rowBranches;
  }

  const compact = compactLatex(exactLatex);
  const single = extractEqualityBranch(compact, targetLatex);
  if (single) {
    return [single];
  }

  return extractFiniteSetBranches(compact, targetLatex);
}

export function normalizeFiniteRootExactLatexOverride({
  exactLatex,
  targetLatex,
  setSeparator,
  context,
}: NormalizeFiniteRootOverrideOptions): FiniteRootOverrideNormalization | null {
  const branches = extractFiniteRootBranchesFromExactLatex(exactLatex, targetLatex);
  if (!branches || branches.some((branch) => !isSafeFiniteBranchExpression(branch))) {
    return null;
  }

  const normalizedExactLatex = exactLatexForFiniteBranches({
    targetLatex,
    branchesLatex: branches,
    preserveOrder: true,
    setSeparator,
    context: {
      target: targetLatex,
      validatedRootExpression: true,
      allowPlainImaginaryUnit: true,
      ...context,
    },
  });
  return profileEquationResult({
    exactLatex: normalizedExactLatex,
    branchesLatex: extractFiniteRootBranchesFromExactLatex(normalizedExactLatex, targetLatex) ?? [],
  });
}

function extractRepeatedEqualityRows(exactLatex: string, targetLatex: string): string[] | null {
  const rows = splitTopLevelRows(exactLatex)
    ?.map(compactLatex)
    .filter(Boolean);
  if (!rows || rows.length <= 1) {
    return null;
  }

  const branches = rows.map((row) => extractEqualityBranch(row, targetLatex));
  return branches.every((branch): branch is string => Boolean(branch))
    ? branches
    : null;
}

function extractEqualityBranch(exactLatex: string, targetLatex: string): string | null {
  const equalsIndex = findSingleTopLevelEquals(exactLatex);
  if (equalsIndex <= 0) {
    return null;
  }
  const left = exactLatex.slice(0, equalsIndex);
  const right = exactLatex.slice(equalsIndex + 1);
  return left === targetLatex && right.length > 0 ? right : null;
}

function extractFiniteSetBranches(exactLatex: string, targetLatex: string): string[] | null {
  const prefix = `${targetLatex}${FINITE_SET_INFIX}`;
  if (!exactLatex.startsWith(prefix) || !exactLatex.endsWith(FINITE_SET_SUFFIX)) {
    return null;
  }

  const content = exactLatex.slice(prefix.length, -FINITE_SET_SUFFIX.length);
  const branches = splitTopLevelCommas(content);
  if (!branches || branches.length === 0 || branches.some((branch) => branch.length === 0)) {
    return null;
  }
  return branches;
}

function splitTopLevelRows(latex: string): string[] | null {
  return splitTopLevel(latex, (source, index) => {
    if (source[index] === '\n') {
      return 1;
    }
    if (source[index] === '\\' && source[index + 1] === '\\') {
      return 2;
    }
    return 0;
  });
}

function splitTopLevelCommas(latex: string): string[] | null {
  return splitTopLevel(latex, (source, index) => source[index] === ',' ? 1 : 0);
}

function splitTopLevel(
  latex: string,
  separatorLengthAt: (source: string, index: number) => number,
): string[] | null {
  const parts: string[] = [];
  let start = 0;
  let braces = 0;
  let parens = 0;
  let brackets = 0;

  for (let index = 0; index < latex.length; index += 1) {
    const character = latex[index];
    if (character === '{') {
      braces += 1;
    } else if (character === '}') {
      braces -= 1;
    } else if (character === '(') {
      parens += 1;
    } else if (character === ')') {
      parens -= 1;
    } else if (character === '[') {
      brackets += 1;
    } else if (character === ']') {
      brackets -= 1;
    }

    if (braces < 0 || parens < 0 || brackets < 0) {
      return null;
    }

    if (braces === 0 && parens === 0 && brackets === 0) {
      const separatorLength = separatorLengthAt(latex, index);
      if (separatorLength > 0) {
        parts.push(compactLatex(latex.slice(start, index)));
        index += separatorLength - 1;
        start = index + 1;
      }
    }
  }

  if (braces !== 0 || parens !== 0 || brackets !== 0) {
    return null;
  }

  parts.push(compactLatex(latex.slice(start)));
  return parts;
}

function findSingleTopLevelEquals(latex: string) {
  let found = -1;
  let braces = 0;
  let parens = 0;
  let brackets = 0;

  for (let index = 0; index < latex.length; index += 1) {
    const character = latex[index];
    if (character === '{') {
      braces += 1;
    } else if (character === '}') {
      braces -= 1;
    } else if (character === '(') {
      parens += 1;
    } else if (character === ')') {
      parens -= 1;
    } else if (character === '[') {
      brackets += 1;
    } else if (character === ']') {
      brackets -= 1;
    }

    if (braces < 0 || parens < 0 || brackets < 0) {
      return -1;
    }

    if (character === '=' && braces === 0 && parens === 0 && brackets === 0) {
      if (found >= 0) {
        return -1;
      }
      found = index;
    }
  }

  return braces === 0 && parens === 0 && brackets === 0 ? found : -1;
}

function isSafeFiniteBranchExpression(branch: string) {
  if (
    branch.includes('\\in')
    || branch.includes('\\le')
    || branch.includes('\\ge')
    || branch.includes('\\ne')
    || branch.includes('\\neq')
    || branch.includes('\\approx')
    || branch.includes('\\cup')
    || branch.includes('\\mathbb{Z}')
    || branch.includes('\\text{')
    || branch.includes('\\begin')
    || branch.includes('=')
    || branch.includes('<')
    || branch.includes('>')
  ) {
    return false;
  }

  return !looksLikePeriodicFamily(branch);
}

function looksLikePeriodicFamily(branch: string) {
  return /(?:^|[^A-Za-z])(?:2)?\\pi(?:[kn]|\\cdot[kn]|[+-])/u.test(branch)
    || /(?:^|[+-])(?:k|n)(?:\\in)?\\mathbb\{Z\}/u.test(branch);
}

function compactLatex(latex: string) {
  return latex
    .trim()
    .replace(/\\\s+/gu, '')
    .replace(/\s+/gu, '');
}
