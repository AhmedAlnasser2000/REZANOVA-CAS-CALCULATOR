type SplitResult = {
  operators: string[];
  parts: string[];
};

function collectCommand(source: string, start: number) {
  let index = start + 1;
  while (index < source.length && /[A-Za-z]/.test(source[index])) {
    index += 1;
  }
  return index;
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

function collectBalancedSegment(source: string, start: number) {
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
      index = collectCommand(source, index);
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

function stripLatexFenceCommands(source: string) {
  return source.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');
}

function collectGroupedArgument(source: string, start: number) {
  let groupStart = start;
  if (source.startsWith('\\left', start)) {
    groupStart = collectCommand(source, start);
    while (groupStart < source.length && /\s/.test(source[groupStart])) {
      groupStart += 1;
    }
  }

  if (source[groupStart] !== '(' && source[groupStart] !== '{' && source[groupStart] !== '[') {
    return null;
  }

  const balanced = collectBalancedSegment(source, groupStart);
  if (!balanced) {
    return null;
  }

  return {
    body: stripLatexFenceCommands(balanced.body).trim(),
    nextIndex: balanced.nextIndex,
  };
}

function skipWhitespace(source: string, start: number) {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  return index;
}

function previousNonWhitespace(source: string, beforeIndex: number) {
  let index = beforeIndex - 1;
  while (index >= 0 && /\s/.test(source[index])) {
    index -= 1;
  }
  return index >= 0 ? source[index] : undefined;
}

function isUnaryAdditiveOperator(source: string, index: number) {
  const char = source[index];
  if (char !== '+' && char !== '-') {
    return false;
  }

  const previous = previousNonWhitespace(source, index);
  return previous === undefined || /[+\-*/=,<>{[(^]/.test(previous);
}

function isDerivativeSlash(source: string, index: number) {
  if (source[index] !== '/') {
    return false;
  }

  const previous = previousNonWhitespace(source, index);
  let nextIndex = index + 1;
  while (nextIndex < source.length && /\s/.test(source[nextIndex])) {
    nextIndex += 1;
  }
  return previous === 'd' && source[nextIndex] === 'd';
}

function collectWholeGroupedArgument(source: string) {
  const trimmed = source.trim();
  const grouped = collectGroupedArgument(trimmed, 0);
  if (!grouped || skipWhitespace(trimmed, grouped.nextIndex) !== trimmed.length) {
    return null;
  }

  const opener = trimmed.startsWith('\\left')
    ? trimmed.slice('\\left'.length).trimStart()[0]
    : trimmed[0];

  return {
    body: grouped.body,
    closer: opener === '[' ? ']' : opener === '{' ? '}' : ')',
    opener,
  };
}

function stripSingleOuterGrouping(source: string) {
  return collectWholeGroupedArgument(source)?.body ?? source.trim();
}

function splitTopLevelByCharacters(
  source: string,
  shouldSplit: (char: string, index: number) => boolean,
): SplitResult | null {
  const parts: string[] = [];
  const operators: string[] = [];
  let depth = 0;
  let partStart = 0;
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index = collectCommand(source, index);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      depth += 1;
      index += 1;
      continue;
    }
    if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
      index += 1;
      continue;
    }
    if (depth === 0 && shouldSplit(char, index)) {
      parts.push(source.slice(partStart, index));
      operators.push(char);
      partStart = index + 1;
    }
    index += 1;
  }

  if (operators.length === 0) {
    return null;
  }

  parts.push(source.slice(partStart));
  return parts.some((part) => part.trim().length === 0) ? null : { operators, parts };
}

function splitTopLevelRelation(source: string) {
  const split = splitTopLevelByCharacters(
    source,
    (char) => char === '=' || char === '<' || char === '>',
  );
  return split?.operators.length === 1 ? split : null;
}

export function canonicalizeAsciiOperatorExpression(
  source: string,
  canonicalizePart: (source: string) => string,
  recordOperatorChange: (before: string, after: string) => void,
) {
  const trimmed = source.trim();
  const relation = splitTopLevelRelation(trimmed);
  if (relation) {
    return relation.parts.map(canonicalizePart).join(relation.operators[0]);
  }

  const additive = splitTopLevelByCharacters(
    trimmed,
    (char, index) => (char === '+' || char === '-') && !isUnaryAdditiveOperator(trimmed, index),
  );
  if (additive) {
    return additive.parts
      .map((part, index) => {
        const canonical = canonicalizePart(part);
        return index === 0 ? canonical : `${additive.operators[index - 1]}${canonical}`;
      })
      .join('');
  }

  const multiplicative = splitTopLevelByCharacters(
    trimmed,
    (char, index) => char === '*' || (char === '/' && !isDerivativeSlash(trimmed, index)),
  );
  if (multiplicative) {
    let canonical = canonicalizePart(stripSingleOuterGrouping(multiplicative.parts[0]));
    multiplicative.operators.forEach((operator, index) => {
      const part = multiplicative.parts[index + 1];
      if (operator === '/') {
        canonical = `\\frac{${canonical}}{${canonicalizePart(stripSingleOuterGrouping(part))}}`;
      } else {
        canonical += `\\cdot ${canonicalizePart(part)}`;
      }
    });
    if (canonical !== source) {
      recordOperatorChange(source, canonical);
    }
    return canonical;
  }

  const grouped = collectWholeGroupedArgument(trimmed);
  return grouped ? `${grouped.opener}${canonicalizePart(grouped.body)}${grouped.closer}` : null;
}
