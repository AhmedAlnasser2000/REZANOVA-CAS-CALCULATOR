import type { CanonicalizationChange } from '../../types/calculator';

type TextualNthRootResult =
  | {
      ok: true;
      latex: string;
      changes: CanonicalizationChange[];
    }
  | {
      ok: false;
      error: string;
    };

const ROOT_INDEX_GUIDANCE =
  'Use root(index, radicand) with an integer index of at least 2 or one symbolic letter.';

function isIdentifierCharacter(char: string | undefined) {
  return char !== undefined && /[A-Za-z0-9_]/.test(char);
}

function matchingClose(open: string) {
  if (open === '(') return ')';
  if (open === '[') return ']';
  if (open === '{') return '}';
  return undefined;
}

function collectRootCall(source: string, openIndex: number) {
  const stack = ['('];
  let index = openIndex + 1;

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 1;
      if (index < source.length && !/[A-Za-z]/.test(source[index])) {
        index += 1;
        continue;
      }
      while (index < source.length && /[A-Za-z]/.test(source[index])) {
        index += 1;
      }
      continue;
    }

    const close = matchingClose(char);
    if (close) {
      stack.push(char);
      index += 1;
      continue;
    }

    const expectedClose = matchingClose(stack.at(-1) ?? '');
    if (char === ')' || char === ']' || char === '}') {
      if (char !== expectedClose) {
        return { kind: 'invalid' as const };
      }
      stack.pop();
      if (stack.length === 0) {
        return {
          kind: 'complete' as const,
          body: source.slice(openIndex + 1, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return { kind: 'unbalanced' as const };
}

function splitRootArguments(body: string) {
  const stack: string[] = [];
  const separators: number[] = [];
  let index = 0;

  while (index < body.length) {
    const char = body[index];
    if (char === '\\') {
      index += 1;
      if (index < body.length && !/[A-Za-z]/.test(body[index])) {
        index += 1;
        continue;
      }
      while (index < body.length && /[A-Za-z]/.test(body[index])) {
        index += 1;
      }
      continue;
    }

    const close = matchingClose(char);
    if (close) {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      if (char !== matchingClose(stack.at(-1) ?? '')) {
        return null;
      }
      stack.pop();
    } else if (char === ',' && stack.length === 0) {
      separators.push(index);
    }
    index += 1;
  }

  if (stack.length > 0 || separators.length !== 1) {
    return null;
  }

  return [
    body.slice(0, separators[0]).trim(),
    body.slice(separators[0] + 1).trim(),
  ] as const;
}

function canonicalRootIndex(source: string) {
  if (/^\d+$/.test(source)) {
    const index = Number(source);
    if (Number.isSafeInteger(index) && index >= 2) {
      return String(index);
    }
    return null;
  }

  return /^[A-Za-z]$/.test(source) ? source : null;
}

export function canonicalizeCalculateTextualNthRoots(
  source: string,
): TextualNthRootResult {
  let result = '';
  let index = 0;
  const changes: CanonicalizationChange[] = [];

  while (index < source.length) {
    if (
      source.startsWith('root', index)
      && !isIdentifierCharacter(source[index - 1])
      && source[index - 1] !== '\\'
      && !isIdentifierCharacter(source[index + 4])
    ) {
      let openIndex = index + 4;
      while (openIndex < source.length && /\s/.test(source[openIndex])) {
        openIndex += 1;
      }

      if (source[openIndex] === '(') {
        const call = collectRootCall(source, openIndex);
        if (call.kind === 'unbalanced') {
          return {
            ok: false,
            error: 'The root(...) call is missing a closing parenthesis.',
          };
        }
        if (call.kind === 'invalid') {
          return {
            ok: false,
            error: 'The root(...) call contains unbalanced grouping.',
          };
        }

        const args = splitRootArguments(call.body);
        if (!args) {
          return {
            ok: false,
            error: 'Use root(index, radicand) with exactly two arguments.',
          };
        }
        const [rawIndex, rawRadicand] = args;
        if (!rawIndex || !rawRadicand) {
          return {
            ok: false,
            error: 'Both the root index and radicand are required.',
          };
        }

        const rootIndex = canonicalRootIndex(rawIndex);
        if (!rootIndex) {
          return {
            ok: false,
            error: ROOT_INDEX_GUIDANCE,
          };
        }

        const nested = canonicalizeCalculateTextualNthRoots(rawRadicand);
        if (!nested.ok) {
          return nested;
        }

        const before = source.slice(index, call.nextIndex);
        const after = `\\sqrt[${rootIndex}]{${nested.latex}}`;
        changes.push(...nested.changes, {
          kind: 'function-token',
          before,
          after,
        });
        result += after;
        index = call.nextIndex;
        continue;
      }
    }

    result += source[index];
    index += 1;
  }

  return {
    ok: true,
    latex: result,
    changes,
  };
}
