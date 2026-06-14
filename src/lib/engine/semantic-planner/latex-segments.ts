export function stripOuterGrouping(source: string) {
  const trimmed = source.trim();
  if (
    (trimmed.startsWith('(') && trimmed.endsWith(')'))
    || (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  if (trimmed.startsWith('\\left(') && trimmed.endsWith('\\right)')) {
    return trimmed.slice('\\left('.length, -'\\right)'.length).trim();
  }

  return trimmed;
}

function matchingCloseFor(open: string) {
  if (open === '(') {
    return ')';
  }
  if (open === '{') {
    return '}';
  }
  if (open === '[') {
    return ']';
  }
  return '';
}

export function collectCommand(source: string, start: number) {
  let index = start + 1;
  while (index < source.length && /[A-Za-z]/.test(source[index])) {
    index += 1;
  }
  return {
    value: source.slice(start, index),
    nextIndex: index,
  };
}

export function collectBalancedSegment(source: string, start: number) {
  const open = source[start];
  const close = matchingCloseFor(open);
  if (!close) {
    return null;
  }

  let depth = 0;
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      if (command.value === '\\left' || command.value === '\\right') {
        index = command.nextIndex;
        continue;
      }
      index = command.nextIndex;
      continue;
    }

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return {
          body: source.slice(start + 1, index),
          nextIndex: index + 1,
        };
      }
    }

    index += 1;
  }

  return null;
}

export function collectDerivativeBody(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }

  if (index >= source.length) {
    return null;
  }

  if (source.startsWith('\\left(', index)) {
    const balanced = collectBalancedSegment(source, index + '\\left'.length);
    if (!balanced) {
      return null;
    }
    return {
      body: stripOuterGrouping(
        source
          .slice(index, balanced.nextIndex)
          .replaceAll('\\left', '')
          .replaceAll('\\right', ''),
      ),
      nextIndex: balanced.nextIndex,
    };
  }

  if (source[index] === '(' || source[index] === '{' || source[index] === '[') {
    const balanced = collectBalancedSegment(source, index);
    if (!balanced) {
      return null;
    }
    return {
      body: stripOuterGrouping(source.slice(index, balanced.nextIndex)),
      nextIndex: balanced.nextIndex,
    };
  }

  let depth = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      index = command.nextIndex;
      continue;
    }
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (depth === 0 && (char === '+' || char === ',' || char === '=')) {
      break;
    }

    if (depth === 0 && char === '-' && index > start) {
      break;
    }

    index += 1;
  }

  const body = source.slice(start, index).trim();
  return body
    ? {
        body,
        nextIndex: index,
      }
    : null;
}

export function splitTopLevelEquation(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '\\') {
      const command = collectCommand(source, index);
      index = command.nextIndex - 1;
      continue;
    }
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
      continue;
    }
    if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
      continue;
    }
    if (char === '=' && depth === 0) {
      return {
        left: source.slice(0, index).trim(),
        right: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}
