export type BranchReadbackRelation = '\\in' | '=' | '\\approx';

export type ExtractedBranchReadback = {
  branchesLatex: string[];
  originalLatex: string;
  relationLatex: BranchReadbackRelation;
  rowRelationLatex: '=' | '\\approx';
  rowsLatex: string[];
  targetLatex: string;
};

const RELATIONS: readonly BranchReadbackRelation[] = ['\\approx', '\\in', '='];

function commandAt(value: string, index: number, command: string) {
  return value.startsWith(command, index);
}

function updateDelimitedDepth(value: string, index: number, depth: number) {
  if (commandAt(value, index, '\\left')) {
    return { depth: depth + 1, skip: '\\left'.length };
  }
  if (commandAt(value, index, '\\right')) {
    return { depth: Math.max(0, depth - 1), skip: '\\right'.length };
  }
  return { depth, skip: 0 };
}

function findTopLevelRelation(value: string) {
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let delimiterDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const delimiter = updateDelimitedDepth(value, index, delimiterDepth);
    if (delimiter.skip > 0) {
      delimiterDepth = delimiter.depth;
      index += delimiter.skip - 1;
      continue;
    }

    if (
      braceDepth === 0
      && parenDepth === 0
      && bracketDepth === 0
      && delimiterDepth === 0
    ) {
      const relation = RELATIONS.find((candidate) => value.startsWith(candidate, index));
      if (relation) {
        return { index, relation };
      }
    }

    const char = value[index];
    if (char === '\\') {
      index += 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
    }
  }

  return null;
}

function hasTopLevelComma(value: string) {
  return splitTopLevelCommaList(value).length > 1;
}

function stripOuterFiniteSet(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith('\\left\\{') && trimmed.endsWith('\\right\\}')) {
    return trimmed.slice('\\left\\{'.length, -'\\right\\}'.length);
  }
  if (trimmed.startsWith('\\{') && trimmed.endsWith('\\}')) {
    return trimmed.slice('\\{'.length, -'\\}'.length);
  }
  return null;
}

function cleanBranchLatex(value: string) {
  return value.trim().replace(/^\\\s+/u, '').trim();
}

export function splitTopLevelCommaList(value: string) {
  const parts: string[] = [];
  let start = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let delimiterDepth = 0;
  let escapedSetDepth = 0;

  for (let index = 0; index < value.length; index += 1) {
    const delimiter = updateDelimitedDepth(value, index, delimiterDepth);
    if (delimiter.skip > 0) {
      delimiterDepth = delimiter.depth;
      index += delimiter.skip - 1;
      continue;
    }

    if (commandAt(value, index, '\\{')) {
      escapedSetDepth += 1;
      index += 1;
      continue;
    }
    if (commandAt(value, index, '\\}')) {
      escapedSetDepth = Math.max(0, escapedSetDepth - 1);
      index += 1;
      continue;
    }

    const char = value[index];
    if (char === '\\') {
      index += 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (
      char === ','
      && braceDepth === 0
      && parenDepth === 0
      && bracketDepth === 0
      && delimiterDepth === 0
      && escapedSetDepth === 0
    ) {
      parts.push(cleanBranchLatex(value.slice(start, index)));
      start = index + 1;
    }
  }

  parts.push(cleanBranchLatex(value.slice(start)));
  return parts.filter((part) => part.length > 0);
}

function isSafeTargetLatex(targetLatex: string) {
  if (!targetLatex || hasTopLevelComma(targetLatex)) {
    return false;
  }

  const trimmed = targetLatex.trim();
  if (
    trimmed.startsWith('(')
    || trimmed.startsWith('\\left(')
    || trimmed.startsWith('\\langle')
    || trimmed.startsWith('\\left\\langle')
  ) {
    return false;
  }

  if (/[+\-*/^<>]/u.test(trimmed)) {
    return false;
  }

  return true;
}

export function extractFiniteBranchReadback(
  latex: string | undefined,
): ExtractedBranchReadback | null {
  const originalLatex = latex?.trim() ?? '';
  if (!originalLatex) {
    return null;
  }

  const relationMatch = findTopLevelRelation(originalLatex);
  if (!relationMatch) {
    return null;
  }

  const targetLatex = originalLatex.slice(0, relationMatch.index).trim();
  if (!isSafeTargetLatex(targetLatex)) {
    return null;
  }

  const rightLatex = originalLatex
    .slice(relationMatch.index + relationMatch.relation.length)
    .trim();
  const setContent = stripOuterFiniteSet(rightLatex);
  if (setContent === null) {
    return null;
  }

  const branchesLatex = splitTopLevelCommaList(setContent);
  if (branchesLatex.length < 2) {
    return null;
  }

  const rowRelationLatex = relationMatch.relation === '\\approx' ? '\\approx' : '=';
  const rowsLatex = branchesLatex.map(
    (branchLatex) => `${targetLatex}${rowRelationLatex}${branchLatex}`,
  );

  return {
    branchesLatex,
    originalLatex,
    relationLatex: relationMatch.relation,
    rowRelationLatex,
    rowsLatex,
    targetLatex,
  };
}
