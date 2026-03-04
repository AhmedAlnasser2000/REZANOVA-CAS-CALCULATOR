import type {
  AngleUnit,
  CoreDraftStyle,
  TrigIdentityState,
  TrigParseOptions,
  TrigParseResult,
  TrigRequest,
  TrigScreen,
} from '../../types/calculator';

function normalizeTrigSource(source: string) {
  return source
    .trim()
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replace(/\\operatorname\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replaceAll('\\rightarrow', '->')
    .replaceAll('\\to', '->')
    .replaceAll('\\ ', ' ')
    .replace(/\s+/g, ' ');
}

function splitTopLevel(source: string, delimiter = ',') {
  const segments: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of source) {
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    }

    if (char === delimiter && depth === 0) {
      segments.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function splitAssignment(source: string) {
  let depth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '(' || char === '{' || char === '[') {
      depth += 1;
    } else if (char === ')' || char === '}' || char === ']') {
      depth = Math.max(depth - 1, 0);
    } else if (char === '=' && depth === 0) {
      return {
        key: source.slice(0, index).trim(),
        value: source.slice(index + 1).trim(),
      };
    }
  }

  return null;
}

function normalizeKey(key: string) {
  const compact = key.trim().replaceAll(' ', '').replaceAll('_', '');
  if (compact.length === 1) {
    return compact;
  }
  return compact.toLowerCase();
}

function parseAssignments(source: string) {
  const entries = splitTopLevel(source);
  const assignments = new Map<string, string>();
  for (const entry of entries) {
    const assignment = splitAssignment(entry);
    if (!assignment) {
      return null;
    }
    assignments.set(normalizeKey(assignment.key), assignment.value);
  }

  return assignments;
}

function valueFor(map: Map<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = map.get(key);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function parseTargetForm(value?: string): TrigIdentityState['targetForm'] | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replaceAll(' ', '').replaceAll('_', '').toLowerCase();
  if (normalized === 'simplified' || normalized === 'simplify') {
    return 'simplified';
  }
  if (normalized === 'producttosum') {
    return 'productToSum';
  }
  if (normalized === 'sumtoproduct') {
    return 'sumToProduct';
  }
  if (normalized === 'doubleangle') {
    return 'doubleAngle';
  }
  if (normalized === 'halfangle') {
    return 'halfAngle';
  }
  return null;
}

function parseAngleUnit(value?: string): AngleUnit | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'deg' || normalized === 'rad' || normalized === 'grad') {
    return normalized;
  }
  return null;
}

function kindFromFunctionName(name: string) {
  switch (name.toLowerCase().replaceAll(' ', '')) {
    case 'identitysimplify':
      return 'identitySimplify' as const;
    case 'identityconvert':
      return 'identityConvert' as const;
    case 'equationsolve':
      return 'equationSolve' as const;
    case 'righttriangle':
      return 'rightTriangle' as const;
    case 'sinerule':
      return 'sineRule' as const;
    case 'cosinerule':
      return 'cosineRule' as const;
    case 'angleconvert':
      return 'angleConvert' as const;
    default:
      return null;
  }
}

function parseStructured(source: string, options: TrigParseOptions): TrigParseResult | null {
  const match = /^([A-Za-z][A-Za-z0-9]*)\((.*)\)$/.exec(source);
  if (!match) {
    return null;
  }

  const [, functionName, argumentSource] = match;
  const kind = kindFromFunctionName(functionName);
  if (kind === null) {
    return {
      ok: false,
      error: 'Use a supported Trigonometry request such as identityConvert(...), equationSolve(...), rightTriangle(...), sineRule(...), cosineRule(...), or angleConvert(...).',
    };
  }

  const assignments = parseAssignments(argumentSource);
  if (!assignments) {
    return {
      ok: false,
      error: 'Structured Trigonometry requests need key=value arguments.',
    };
  }

  switch (kind) {
    case 'identitySimplify': {
      const expressionLatex = valueFor(assignments, 'expr', 'expression');
      return expressionLatex
        ? { ok: true, request: { kind, expressionLatex }, style: 'structured' }
        : { ok: false, error: 'identitySimplify(...) needs expr=...' };
    }
    case 'identityConvert': {
      const expressionLatex = valueFor(assignments, 'expr', 'expression');
      if (!expressionLatex) {
        return { ok: false, error: 'identityConvert(...) needs expr=...' };
      }
      const targetForm = parseTargetForm(
        valueFor(assignments, 'target', 'targetform'),
      ) ?? options.identityTargetForm;
      return targetForm
        ? { ok: true, request: { kind, expressionLatex, targetForm }, style: 'structured' }
        : { ok: false, error: 'identityConvert(...) needs a supported target form.' };
    }
    case 'equationSolve': {
      const equationLatex = valueFor(assignments, 'eq', 'equation');
      return equationLatex
        ? { ok: true, request: { kind, equationLatex, variable: 'x' }, style: 'structured' }
        : { ok: false, error: 'equationSolve(...) needs eq=...' };
    }
    case 'rightTriangle':
      return {
        ok: true,
        request: {
          kind,
          knownSideA: valueFor(assignments, 'a', 'sidea'),
          knownSideB: valueFor(assignments, 'b', 'sideb'),
          knownSideC: valueFor(assignments, 'c', 'sidec', 'hypotenuse'),
          knownAngleA: valueFor(assignments, 'A', 'anglea'),
          knownAngleB: valueFor(assignments, 'B', 'angleb'),
        },
        style: 'structured',
      };
    case 'sineRule':
      return {
        ok: true,
        request: {
          kind,
          sideA: valueFor(assignments, 'a', 'sidea'),
          sideB: valueFor(assignments, 'b', 'sideb'),
          sideC: valueFor(assignments, 'c', 'sidec'),
          angleA: valueFor(assignments, 'A', 'anglea'),
          angleB: valueFor(assignments, 'B', 'angleb'),
          angleC: valueFor(assignments, 'C', 'anglec'),
        },
        style: 'structured',
      };
    case 'cosineRule':
      return {
        ok: true,
        request: {
          kind,
          sideA: valueFor(assignments, 'a', 'sidea'),
          sideB: valueFor(assignments, 'b', 'sideb'),
          sideC: valueFor(assignments, 'c', 'sidec'),
          angleA: valueFor(assignments, 'A', 'anglea'),
          angleB: valueFor(assignments, 'B', 'angleb'),
          angleC: valueFor(assignments, 'C', 'anglec'),
        },
        style: 'structured',
      };
    case 'angleConvert': {
      const valueLatex = valueFor(assignments, 'value', 'val');
      const from = parseAngleUnit(valueFor(assignments, 'from'));
      const to = parseAngleUnit(valueFor(assignments, 'to'));
      if (!valueLatex || !from || !to) {
        return {
          ok: false,
          error: 'angleConvert(...) needs value=..., from=deg|rad|grad, and to=deg|rad|grad.',
        };
      }
      return {
        ok: true,
        request: { kind, valueLatex, from, to },
        style: 'structured',
      };
    }
  }
}

function parseAngleConvertShorthand(source: string): TrigParseResult | null {
  const match = /^(.*?)\s+(deg|rad|grad)\s*->\s*(deg|rad|grad)$/i.exec(source.trim());
  if (!match) {
    return null;
  }

  const [, valueLatex, from, to] = match;
  return {
    ok: true,
    request: {
      kind: 'angleConvert',
      valueLatex: valueLatex.trim(),
      from: from.toLowerCase() as AngleUnit,
      to: to.toLowerCase() as AngleUnit,
    },
    style: 'shorthand',
  };
}

function parseRightTriangleShorthand(assignments: Map<string, string>): TrigParseResult {
  return {
    ok: true,
    request: {
      kind: 'rightTriangle',
      knownSideA: valueFor(assignments, 'a', 'sidea'),
      knownSideB: valueFor(assignments, 'b', 'sideb'),
      knownSideC: valueFor(assignments, 'c', 'sidec', 'hypotenuse'),
      knownAngleA: valueFor(assignments, 'A', 'anglea'),
      knownAngleB: valueFor(assignments, 'B', 'angleb'),
    },
    style: 'shorthand',
  };
}

function parseSineRuleShorthand(assignments: Map<string, string>): TrigParseResult {
  return {
    ok: true,
    request: {
      kind: 'sineRule',
      sideA: valueFor(assignments, 'a', 'sidea'),
      sideB: valueFor(assignments, 'b', 'sideb'),
      sideC: valueFor(assignments, 'c', 'sidec'),
      angleA: valueFor(assignments, 'A', 'anglea'),
      angleB: valueFor(assignments, 'B', 'angleb'),
      angleC: valueFor(assignments, 'C', 'anglec'),
    },
    style: 'shorthand',
  };
}

function parseCosineRuleShorthand(assignments: Map<string, string>): TrigParseResult {
  return {
    ok: true,
    request: {
      kind: 'cosineRule',
      sideA: valueFor(assignments, 'a', 'sidea'),
      sideB: valueFor(assignments, 'b', 'sideb'),
      sideC: valueFor(assignments, 'c', 'sidec'),
      angleA: valueFor(assignments, 'A', 'anglea'),
      angleB: valueFor(assignments, 'B', 'angleb'),
      angleC: valueFor(assignments, 'C', 'anglec'),
    },
    style: 'shorthand',
  };
}

function parseByScreenHint(source: string, options: TrigParseOptions): TrigParseResult | null {
  if (!options.screenHint) {
    return null;
  }

  if (options.screenHint === 'functions' || options.screenHint === 'specialAngles') {
    if (source.includes('=')) {
      return {
        ok: false,
        error: 'This looks like a trig equation. Open the trig-equation solver or use equationSolve(...).',
      };
    }

    if (/\\(?:sin|cos|tan)\s*\^/.test(source)) {
      return {
        ok: false,
        error: 'This looks like a trig identity. Open Identities or use identitySimplify(...) / identityConvert(...).',
      };
    }

    return {
      ok: true,
      request: {
        kind: 'function',
        expressionLatex: source.trim(),
      },
      style: 'shorthand',
    };
  }

  if (options.screenHint === 'identitySimplify') {
    return {
      ok: true,
      request: {
        kind: 'identitySimplify',
        expressionLatex: source.trim(),
      },
      style: 'shorthand',
    };
  }

  if (options.screenHint === 'identityConvert') {
    const targetForm = options.identityTargetForm;
    return targetForm
      ? {
          ok: true,
          request: {
            kind: 'identityConvert',
            expressionLatex: source.trim(),
            targetForm,
          },
          style: 'shorthand',
        }
      : {
          ok: false,
          error: 'Choose an identity target form before converting the expression.',
        };
  }

  if (options.screenHint === 'equationSolve') {
    return source.includes('=')
      ? {
          ok: true,
          request: {
            kind: 'equationSolve',
            equationLatex: source.trim(),
            variable: 'x',
          },
          style: 'shorthand',
        }
      : {
          ok: false,
          error: 'Enter a supported trig equation such as sin(x)=1/2.',
        };
  }

  const angleConvert = parseAngleConvertShorthand(source);
  if (options.screenHint === 'angleConvert') {
    return angleConvert ?? {
      ok: false,
      error: 'Use angle-convert shorthand such as 30 deg -> rad, or enter angleConvert(value=..., from=..., to=...).',
    };
  }

  const assignments = parseAssignments(source);
  if (!assignments) {
    return {
      ok: false,
      error: options.screenHint === 'rightTriangle' || options.screenHint === 'sineRule' || options.screenHint === 'cosineRule'
        ? 'Use key=value shorthand or a structured trig request for this tool.'
        : 'Unsupported Trigonometry draft.',
    };
  }

  if (options.screenHint === 'rightTriangle') {
    return parseRightTriangleShorthand(assignments);
  }
  if (options.screenHint === 'sineRule') {
    return parseSineRuleShorthand(assignments);
  }
  if (options.screenHint === 'cosineRule') {
    return parseCosineRuleShorthand(assignments);
  }

  return null;
}

export function trigRequestToScreen(request: TrigRequest, fallbackScreen: TrigScreen = 'functions'): TrigScreen {
  switch (request.kind) {
    case 'function':
      return fallbackScreen === 'specialAngles' ? 'specialAngles' : 'functions';
    case 'identitySimplify':
      return 'identitySimplify';
    case 'identityConvert':
      return 'identityConvert';
    case 'equationSolve':
      return 'equationSolve';
    case 'rightTriangle':
      return 'rightTriangle';
    case 'sineRule':
      return 'sineRule';
    case 'cosineRule':
      return 'cosineRule';
    case 'angleConvert':
      return 'angleConvert';
  }
}

export function trigDraftStyle(source: string): CoreDraftStyle {
  const normalized = normalizeTrigSource(source);
  return /^[A-Za-z][A-Za-z0-9]*\s*\(/.test(normalized) ? 'structured' : 'shorthand';
}

export function parseTrigDraft(source: string, options: TrigParseOptions = {}): TrigParseResult {
  const normalized = normalizeTrigSource(source);
  if (!normalized) {
    return {
      ok: false,
      error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
    };
  }

  const structured = parseStructured(normalized, options);
  if (structured) {
    return structured;
  }

  const contextual = parseByScreenHint(normalized, options);
  if (contextual) {
    return contextual;
  }

  return {
    ok: false,
    error: 'This draft is not recognized in the current trig context. Use a supported trig expression, equation, or structured trig request.',
  };
}
