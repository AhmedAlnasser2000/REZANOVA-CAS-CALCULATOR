export type NamedVariableSyntax = 'at' | 'var-call' | 'mathrm';

export type ExplicitNamedVariableToken = {
  name: string;
  syntax: NamedVariableSyntax;
};

export type NamedVariableParseResult =
  | { ok: true; name: string; syntax: NamedVariableSyntax }
  | { ok: false; error: string };

const NAMED_VARIABLE_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

const RESERVED_NAMED_VARIABLES = new Set([
  'abs',
  'acos',
  'ans',
  'arccos',
  'arcsin',
  'arctan',
  'asin',
  'atan',
  'cos',
  'cosh',
  'cot',
  'csc',
  'e',
  'exp',
  'infinity',
  'i',
  'imaginaryi',
  'ln',
  'log',
  'nan',
  'pi',
  'root',
  'sec',
  'sin',
  'sinh',
  'sqrt',
  'tan',
  'tanh',
  'var',
]);

function uniqueTokens(tokens: ExplicitNamedVariableToken[]) {
  const seen = new Set<string>();
  const unique: ExplicitNamedVariableToken[] = [];
  for (const token of tokens) {
    const key = `${token.syntax}:${token.name}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(token);
  }
  return unique;
}

export function isReservedNamedVariableName(name: string) {
  return RESERVED_NAMED_VARIABLES.has(name.toLowerCase());
}

export function isValidNamedVariableName(name: string) {
  return NAMED_VARIABLE_PATTERN.test(name) && !isReservedNamedVariableName(name);
}

export function namedVariableNameError(name: string) {
  if (!name.trim()) {
    return 'Enter a variable name.';
  }

  if (!NAMED_VARIABLE_PATTERN.test(name)) {
    return 'Named variables use letters, digits, and underscores, and must start with a letter.';
  }

  if (isReservedNamedVariableName(name)) {
    return 'Reserved constants, units, and functions cannot be stored variables.';
  }

  return 'This identifier is not a supported named variable.';
}

export function namedVariableLatex(name: string) {
  return `\\mathrm{${name}}`;
}

export function namedVariableEditorLatex(name: string) {
  return /^[A-Za-z]$/.test(name) ? name : `@${name}`;
}

export function parseExplicitNamedVariableSyntax(input: string): NamedVariableParseResult | null {
  const trimmed = input.trim();

  const atMatch = trimmed.match(/^@([A-Za-z][A-Za-z0-9_]*)$/);
  if (atMatch) {
    const name = atMatch[1];
    return isValidNamedVariableName(name)
      ? { ok: true, name, syntax: 'at' }
      : { ok: false, error: namedVariableNameError(name) };
  }

  if (trimmed.startsWith('@')) {
    return { ok: false, error: 'Use @name with letters, digits, and underscores after @.' };
  }

  const varMatch = trimmed.match(/^var\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)$/);
  if (varMatch) {
    const name = varMatch[1];
    return isValidNamedVariableName(name)
      ? { ok: true, name, syntax: 'var-call' }
      : { ok: false, error: namedVariableNameError(name) };
  }

  if (/^var\s*\(/.test(trimmed)) {
    return { ok: false, error: 'Use var(name) with one valid name inside the parentheses.' };
  }

  return null;
}

function replaceExplicitNamedSyntax(
  latex: string,
  tokens: ExplicitNamedVariableToken[],
) {
  let next = latex.replace(/@([A-Za-z][A-Za-z0-9_]*)/g, (match, name: string) => {
    if (!isValidNamedVariableName(name)) {
      return match;
    }
    tokens.push({ name, syntax: 'at' });
    return namedVariableLatex(name);
  });

  const replaceVarCall = (match: string, name: string) => {
    if (!isValidNamedVariableName(name)) {
      return match;
    }
    tokens.push({ name, syntax: 'var-call' });
    return namedVariableLatex(name);
  };

  next = next.replace(/\bvar\s*\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\)/g, replaceVarCall);
  next = next.replace(/\\operatorname\{var\}\s*\\left\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\\right\)/g, replaceVarCall);
  next = next.replace(/\\mathrm\{var\}\s*\\left\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\\right\)/g, replaceVarCall);
  next = next.replace(/\bvar\s*\\left\(\s*([A-Za-z][A-Za-z0-9_]*)\s*\\right\)/g, replaceVarCall);

  next = next.replace(/\\mathrm\{([A-Za-z][A-Za-z0-9_]*)\}/g, (match, name: string) => {
    if (!isValidNamedVariableName(name)) {
      return match;
    }
    tokens.push({ name, syntax: 'mathrm' });
    return match;
  });

  return next;
}

export function normalizeExplicitNamedVariablesInLatex(latex: string) {
  const tokens: ExplicitNamedVariableToken[] = [];
  const normalizedLatex = replaceExplicitNamedSyntax(latex, tokens);
  return {
    latex: normalizedLatex,
    tokens: uniqueTokens(tokens),
    explicitNames: new Set(tokens.map((token) => token.name)),
  };
}
