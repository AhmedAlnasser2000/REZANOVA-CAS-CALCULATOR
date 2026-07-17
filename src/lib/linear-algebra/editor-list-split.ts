import { matrixEnvironmentEndAt } from './editor-matrix-literals';
import { splitTopLevelArguments } from './editor-parser-arguments';

function splitTopLevelList(input: string, separator: ',' | ';'): string[] | null {
  if (!input) return [];
  const parts: string[] = [];
  let start = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < input.length; index += 1) {
    if (input.startsWith('\\begin{', index)) {
      const environmentEnd = matrixEnvironmentEndAt(input, index);
      if (environmentEnd === null) return null;
      index = environmentEnd - 1;
      continue;
    }
    const char = input[index];
    if (char === '{') braceDepth += 1;
    if (char === '}') braceDepth -= 1;
    if (char === '(') parenDepth += 1;
    if (char === ')') parenDepth -= 1;
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth -= 1;
    if (braceDepth < 0 || parenDepth < 0 || bracketDepth < 0) return null;
    if (
      char === separator
      && braceDepth === 0
      && parenDepth === 0
      && bracketDepth === 0
    ) {
      const part = input.slice(start, index);
      if (!part) return null;
      parts.push(part);
      start = index + 1;
    }
  }

  if (braceDepth !== 0 || parenDepth !== 0 || bracketDepth !== 0) return null;
  const finalPart = input.slice(start);
  if (!finalPart) return null;
  parts.push(finalPart);
  return parts;
}

export function splitInlineVectorCells(body: string) {
  const commaCells = splitTopLevelArguments(body);
  if (commaCells && commaCells.length > 1) return commaCells;
  const semicolonCells = splitTopLevelList(body, ';');
  if (semicolonCells && semicolonCells.length > 1) return semicolonCells;
  return commaCells;
}
