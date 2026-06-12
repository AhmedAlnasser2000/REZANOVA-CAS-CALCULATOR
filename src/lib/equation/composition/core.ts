import { ComputeEngine } from '@cortex-js/compute-engine';
import { createBranchSet } from '../../algebra/branch-core';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { formatApproxNumber, getNumericOutputSettings } from '../../display/numeric-output';
import type {
  AngleUnit,
  EquationExecutionBudget,
  SolveDomainConstraint,
} from '../../../types/calculator';

const ce = new ComputeEngine();
const EPSILON = 1e-12;

export type CompositionMathJson =
  | string
  | number
  | boolean
  | null
  | CompositionMathJson[]
  | { [key: string]: CompositionMathJson | undefined };

export type CompositionCoreStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'ambiguous-adjacent-product'
  | 'no-composition'
  | 'mixed-carriers'
  | 'nested-composition'
  | 'target-outside-carrier'
  | 'unsupported-carrier'
  | 'unsupported-branch'
  | 'branch-limit'
  | 'domain-empty';

export type CompositionCarrierKind =
  | 'absolute-value'
  | 'square-root'
  | 'square-power'
  | 'exponential'
  | 'logarithm'
  | 'sin'
  | 'cos'
  | 'tan';

export type CompositionCarrier = {
  kind: CompositionCarrierKind;
  node: CompositionMathJson;
  inner: CompositionMathJson;
  labelLatex: string;
  base?: CompositionMathJson;
};

export type CompositionCarrierMatch =
  | { kind: 'matched'; carrier: CompositionCarrier }
  | { kind: 'blocked'; reason: CompositionCoreStopReason; message: string }
  | { kind: 'none' };

export type CompositionGeneratedBranches =
  | { kind: 'ok'; equations: string[]; facts: string[] }
  | { kind: 'unsupported'; reason: CompositionCoreStopReason; message: string };

export type CompositionCarrierChainMatch =
  | { kind: 'matched'; carriers: [CompositionCarrier, CompositionCarrier]; depth: 2 }
  | { kind: 'blocked'; reason: CompositionCoreStopReason; message: string }
  | { kind: 'none' };

export type CompositionNestedGeneratedBranches =
  | { kind: 'ok'; equations: string[]; facts: string[]; layerEquationLatex: string[]; depth: 2 }
  | { kind: 'unsupported'; reason: CompositionCoreStopReason; message: string };

export function isCompositionArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function hasCompositionTarget(node: unknown, target: string): boolean {
  if (typeof node === 'string') {
    return node === target;
  }
  if (isCompositionArrayNode(node)) {
    return node.some((entry) => hasCompositionTarget(entry, target));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((entry) => hasCompositionTarget(entry, target));
  }
  return false;
}

export function simplifyCompositionNode(node: CompositionMathJson): CompositionMathJson {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).simplify().json as CompositionMathJson;
  } catch {
    return node;
  }
}

export function compositionLatexForNode(node: CompositionMathJson) {
  const latex = ce.box(simplifyCompositionNode(node) as Parameters<typeof ce.box>[0]).latex;
  return formatLongDecimalLiterals(latex);
}

function formatLongDecimalLiterals(latex: string) {
  return latex.replace(
    /(^|[^A-Za-z0-9.\\])(-?(?:\d+\.\d{7,}|\d+\.\d+(?:\\,\d+)+)(?:e[+-]?\d+)?)/gi,
    (_match, prefix: string, numericLiteral: string) => `${prefix}${formatLongDecimalLiteral(numericLiteral)}`,
  );
}

function formatLongDecimalLiteral(numericLiteral: string) {
  const numericValue = Number(numericLiteral.replace(/\\,/g, ''));
  if (!Number.isFinite(numericValue)) {
    return numericLiteral;
  }

  return formatApproxNumber(numericValue, {
    ...getNumericOutputSettings(),
    numericNotationMode: 'decimal',
  });
}

function numericFromNode(node: unknown): number | null {
  if (typeof node === 'number') {
    return node;
  }
  if (
    isCompositionArrayNode(node)
    && node[0] === 'Rational'
    && typeof node[1] === 'number'
    && typeof node[2] === 'number'
    && node[2] !== 0
  ) {
    return node[1] / node[2];
  }
  return null;
}

export function numericValueOfCompositionNode(node: CompositionMathJson): number | null {
  return numericFromNode(simplifyCompositionNode(node));
}

function nodeHasSymbol(node: CompositionMathJson) {
  return analyzeVariablesFromLatex(compositionLatexForNode(node), {
    allowSymbolicParameters: true,
  }).symbols.length > 0;
}

function positiveFactForNode(node: CompositionMathJson): string | null {
  return nodeHasSymbol(node) ? `${compositionLatexForNode(node)}>0` : null;
}

function nonnegativeFactForNode(node: CompositionMathJson): string | null {
  return nodeHasSymbol(node) ? `${compositionLatexForNode(node)}\\ge0` : null;
}

function notOneFactForNode(node: CompositionMathJson): string | null {
  return nodeHasSymbol(node) ? `${compositionLatexForNode(node)}\\ne1` : null;
}

function isValidNumericBase(value: number) {
  return Number.isFinite(value) && value > 0 && Math.abs(value - 1) > EPSILON;
}

function isSymbolicBase(node: CompositionMathJson) {
  return numericValueOfCompositionNode(node) === null && node !== 'ExponentialE';
}

function baseFacts(base: CompositionMathJson | undefined) {
  if (!base || !isSymbolicBase(base)) {
    return [];
  }
  return [
    positiveFactForNode(base),
    notOneFactForNode(base),
  ].filter((entry): entry is string => Boolean(entry));
}

export function hasAmbiguousAdjacentProduct(latex: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.implicitCharacterProducts.some((product) => new Set(product.characters).size > 1);
}

export function parameterNamesFromCompositionLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) =>
      symbol.name !== target
      && symbol.name !== 'n'
      && symbol.name !== 'm'
      && (
        symbol.identifierKind === 'named-variable'
        || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
      ))
    .map((symbol) => symbol.name);
}

function containsNestedCompositionCarrier(node: unknown, target: string): boolean {
  if (!isCompositionArrayNode(node)) {
    return false;
  }

  const [operator, ...operands] = node;
  if (
    (operator === 'Abs' || operator === 'Sqrt' || operator === 'Ln' || operator === 'Sin' || operator === 'Cos' || operator === 'Tan')
    && operands.some((operand) => hasCompositionTarget(operand, target))
  ) {
    return true;
  }
  if (operator === 'Log' && operands.some((operand) => hasCompositionTarget(operand, target))) {
    return true;
  }
  if (
    operator === 'Power'
    && operands.length === 2
    && hasCompositionTarget(operands[1], target)
    && !hasCompositionTarget(operands[0], target)
  ) {
    return true;
  }

  return operands.some((operand) => containsNestedCompositionCarrier(operand, target));
}

export function countSelectedCompositionCarriers(node: unknown, target: string): number {
  if (!isCompositionArrayNode(node)) {
    return 0;
  }

  const [operator, ...operands] = node;
  const current = (
    (operator === 'Abs' || operator === 'Sqrt' || operator === 'Ln' || operator === 'Log' || operator === 'Sin' || operator === 'Cos' || operator === 'Tan')
    && operands.some((operand) => hasCompositionTarget(operand, target))
  ) || (
    operator === 'Power'
    && operands.length === 2
    && hasCompositionTarget(operands[1], target)
    && !hasCompositionTarget(operands[0], target)
  )
    ? 1
    : 0;
  return current + operands.reduce<number>(
    (sum, operand) => sum + countSelectedCompositionCarriers(operand, target),
    0,
  );
}

function matchSelectedCompositionCarrierInternal(
  node: unknown,
  target: string,
  options: { allowNestedInner?: boolean; nestedMessage?: string } = {},
): CompositionCarrierMatch {
  if (!isCompositionArrayNode(node)) {
    return { kind: 'none' };
  }

  const nestedMessage = options.nestedMessage
    ?? 'PARAM11 only inverts one selected-target composition layer at a time.';
  const [operator, ...operands] = node;
  if ((operator === 'Abs' || operator === 'Sqrt') && operands.length === 1 && hasCompositionTarget(operands[0], target)) {
    const inner = operands[0] as CompositionMathJson;
    if (!options.allowNestedInner && containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: nestedMessage,
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: operator === 'Abs' ? 'absolute-value' : 'square-root',
        node: node as CompositionMathJson,
        inner,
        labelLatex: compositionLatexForNode(node as CompositionMathJson),
      },
    };
  }

  if (operator === 'Power' && operands.length === 2) {
    const [base, exponent] = operands as CompositionMathJson[];
    if (exponent === 2 && hasCompositionTarget(base, target)) {
      if (!options.allowNestedInner && containsNestedCompositionCarrier(base, target)) {
        return {
          kind: 'blocked',
          reason: 'nested-composition',
          message: nestedMessage,
        };
      }
      return {
        kind: 'matched',
        carrier: {
          kind: 'square-power',
          node: node as CompositionMathJson,
          inner: base,
          labelLatex: compositionLatexForNode(node as CompositionMathJson),
        },
      };
    }
    if (!hasCompositionTarget(base, target) && hasCompositionTarget(exponent, target)) {
      if (!options.allowNestedInner && containsNestedCompositionCarrier(exponent, target)) {
        return {
          kind: 'blocked',
          reason: 'nested-composition',
          message: nestedMessage,
        };
      }
      const numericBase = numericValueOfCompositionNode(base);
      if (numericBase !== null && !isValidNumericBase(numericBase)) {
        return {
          kind: 'blocked',
          reason: 'unsupported-carrier',
          message: 'Exponential composition bases must be positive and not equal to 1.',
        };
      }
      return {
        kind: 'matched',
        carrier: {
          kind: 'exponential',
          node: node as CompositionMathJson,
          inner: exponent,
          base,
          labelLatex: compositionLatexForNode(node as CompositionMathJson),
        },
      };
    }
  }

  if ((operator === 'Ln' || operator === 'Log') && operands.length >= 1 && hasCompositionTarget(operands[0], target)) {
    const inner = operands[0] as CompositionMathJson;
    if (!options.allowNestedInner && containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: nestedMessage,
      };
    }
    const base = operator === 'Log' && operands.length === 2 ? operands[1] as CompositionMathJson : undefined;
    if (base && hasCompositionTarget(base, target)) {
      return {
        kind: 'blocked',
        reason: 'unsupported-carrier',
        message: 'PARAM11 does not invert logarithms whose base also contains the selected target.',
      };
    }
    const numericBase = base ? numericValueOfCompositionNode(base) : null;
    if (numericBase !== null && !isValidNumericBase(numericBase)) {
      return {
        kind: 'blocked',
        reason: 'unsupported-carrier',
        message: 'Logarithmic composition bases must be positive and not equal to 1.',
      };
    }
    return {
      kind: 'matched',
      carrier: {
        kind: 'logarithm',
        node: node as CompositionMathJson,
        inner,
        base,
        labelLatex: compositionLatexForNode(node as CompositionMathJson),
      },
    };
  }

  if ((operator === 'Sin' || operator === 'Cos' || operator === 'Tan') && operands.length === 1 && hasCompositionTarget(operands[0], target)) {
    const inner = operands[0] as CompositionMathJson;
    if (!options.allowNestedInner && containsNestedCompositionCarrier(inner, target)) {
      return {
        kind: 'blocked',
        reason: 'nested-composition',
        message: nestedMessage,
      };
    }
    const kind = operator === 'Sin' ? 'sin' : operator === 'Cos' ? 'cos' : 'tan';
    return {
      kind: 'matched',
      carrier: {
        kind,
        node: node as CompositionMathJson,
        inner,
        labelLatex: compositionLatexForNode(node as CompositionMathJson),
      },
    };
  }

  return { kind: 'none' };
}

export function matchSelectedCompositionCarrier(node: unknown, target: string): CompositionCarrierMatch {
  return matchSelectedCompositionCarrierInternal(node, target);
}

export function matchSelectedCompositionCarrierChain(
  node: unknown,
  target: string,
): CompositionCarrierChainMatch {
  const outer = matchSelectedCompositionCarrierInternal(node, target, {
    allowNestedInner: true,
    nestedMessage: 'PARAM12 only inverts two selected-target composition layers at a time.',
  });
  if (outer.kind !== 'matched') {
    return outer;
  }

  const inner = matchSelectedCompositionCarrierInternal(outer.carrier.inner, target, {
    nestedMessage: 'PARAM12 only inverts two selected-target composition layers at a time.',
  });
  if (inner.kind === 'blocked') {
    return inner;
  }
  if (inner.kind === 'none') {
    return { kind: 'none' };
  }

  if (countSelectedCompositionCarriers(node, target) !== 2) {
    return {
      kind: 'blocked',
      reason: 'mixed-carriers',
      message: 'PARAM12 needs one nested two-layer selected-target carrier chain, not separate mixed carriers.',
    };
  }

  return {
    kind: 'matched',
    carriers: [outer.carrier, inner.carrier],
    depth: 2,
  };
}

function paren(latex: string) {
  return /^[A-Za-z0-9]+$/.test(latex) || /^\\[A-Za-z]+\(.+\)$/.test(latex)
    ? latex
    : `\\left(${latex}\\right)`;
}

function negateLatex(latex: string) {
  return latex.startsWith('-') ? latex.slice(1) : `-${paren(latex)}`;
}

function baseLatex(base: CompositionMathJson | undefined) {
  if (!base || base === 'ExponentialE') {
    return 'e';
  }
  return compositionLatexForNode(base);
}

function logarithmLatex(base: CompositionMathJson | undefined, value: CompositionMathJson) {
  const valueLatex = compositionLatexForNode(value);
  if (!base || base === 'ExponentialE') {
    return `\\ln\\left(${valueLatex}\\right)`;
  }
  const numericBase = numericValueOfCompositionNode(base);
  if (numericBase !== null && Math.abs(numericBase - 10) <= EPSILON) {
    return `\\log\\left(${valueLatex}\\right)`;
  }
  return `\\log_{${baseLatex(base)}}\\left(${valueLatex}\\right)`;
}

function powerLatex(base: CompositionMathJson | undefined, exponent: CompositionMathJson) {
  const exponentLatex = compositionLatexForNode(exponent);
  if (!base || base === 'ExponentialE') {
    return `e^{${exponentLatex}}`;
  }
  return `${baseLatex(base)}^{${exponentLatex}}`;
}

export function generateCompositionBranchesForCarrier(
  carrier: CompositionCarrier,
  value: CompositionMathJson,
  angleUnit: AngleUnit,
  options: { periodicParameterName?: string } = {},
): CompositionGeneratedBranches {
  const innerLatex = compositionLatexForNode(carrier.inner);
  const valueLatex = compositionLatexForNode(value);

  if (carrier.kind === 'absolute-value') {
    const numericValue = numericValueOfCompositionNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because absolute-value outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=${valueLatex}`,
        `${innerLatex}=${negateLatex(valueLatex)}`,
      ],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'square-root') {
    const numericValue = numericValueOfCompositionNode(value);
    if (numericValue !== null && numericValue < 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because square-root outputs are nonnegative.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${compositionLatexForNode(['Power', value, 2] as CompositionMathJson)}`],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'square-power') {
    return {
      kind: 'ok',
      equations: [
        `${innerLatex}=\\sqrt{${valueLatex}}`,
        `${innerLatex}=-\\sqrt{${valueLatex}}`,
      ],
      facts: [nonnegativeFactForNode(value)].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'exponential') {
    const numericValue = numericValueOfCompositionNode(value);
    if (numericValue !== null && numericValue <= 0) {
      return {
        kind: 'unsupported',
        reason: 'domain-empty',
        message: 'No real selected-target solution remains because exponential outputs must be positive.',
      };
    }
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${logarithmLatex(carrier.base, value)}`],
      facts: [
        ...baseFacts(carrier.base),
        positiveFactForNode(value),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  if (carrier.kind === 'logarithm') {
    return {
      kind: 'ok',
      equations: [`${innerLatex}=${powerLatex(carrier.base, value)}`],
      facts: [
        ...baseFacts(carrier.base),
        positiveFactForNode(carrier.inner),
      ].filter((entry): entry is string => Boolean(entry)),
    };
  }

  return generateTrigCompositionBranches(
    carrier,
    value,
    angleUnit,
    options.periodicParameterName ?? 'n',
  );
}

function generatedFactsUsePeriodicParameter(facts: string[], parameterName: string) {
  return facts.some((fact) => fact.includes(`${parameterName}\\in\\mathbb{Z}`));
}

function periodicParameterNamesFromFacts(facts: string[]) {
  const parameters = new Set<string>();
  for (const fact of facts) {
    const matches = fact.matchAll(/([A-Za-z])\\in\\mathbb\{Z\}/g);
    for (const match of matches) {
      parameters.add(match[1]);
    }
  }
  return parameters;
}

function parseGeneratedEquationSides(equationLatex: string) {
  try {
    const json = ce.parse(equationLatex).json;
    if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
      return null;
    }
    return [json[1] as CompositionMathJson, json[2] as CompositionMathJson] as const;
  } catch {
    return null;
  }
}

export function generateNestedCompositionBranchesForChain(
  carriers: [CompositionCarrier, CompositionCarrier],
  value: CompositionMathJson,
  target: string,
  angleUnit: AngleUnit,
  options: { maxGeneratedBranches?: number; maxPeriodicParameters?: number } = {},
): CompositionNestedGeneratedBranches {
  const maxGeneratedBranches = options.maxGeneratedBranches ?? 8;
  const maxPeriodicParameters = options.maxPeriodicParameters ?? 2;
  const [outerCarrier] = carriers;
  const outerGenerated = generateCompositionBranchesForCarrier(
    outerCarrier,
    value,
    angleUnit,
    { periodicParameterName: 'n' },
  );

  if (outerGenerated.kind === 'unsupported') {
    return outerGenerated;
  }

  const facts = [...outerGenerated.facts];
  const equations: string[] = [];
  const layerEquationLatex = [...outerGenerated.equations];
  const innerPeriodicParameterName = generatedFactsUsePeriodicParameter(outerGenerated.facts, 'n')
    ? 'm'
    : 'n';

  for (const outerEquation of outerGenerated.equations) {
    const sides = parseGeneratedEquationSides(outerEquation);
    if (!sides) {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'A generated outer composition branch could not be parsed.',
      };
    }

    const candidates = [
      { carrierSide: sides[0], valueSide: sides[1] },
      { carrierSide: sides[1], valueSide: sides[0] },
    ];
    const innerCandidate = candidates
      .map((candidate) => ({
        ...candidate,
        match: matchSelectedCompositionCarrierInternal(candidate.carrierSide, target, {
          nestedMessage: 'PARAM12 only inverts two selected-target composition layers at a time.',
        }),
      }))
      .find((candidate) => candidate.match.kind === 'matched');

    if (!innerCandidate || innerCandidate.match.kind !== 'matched') {
      return {
        kind: 'unsupported',
        reason: 'unsupported-branch',
        message: 'A generated outer composition branch did not expose a supported inner carrier.',
      };
    }

    if (hasCompositionTarget(innerCandidate.valueSide, target)) {
      return {
        kind: 'unsupported',
        reason: 'target-outside-carrier',
        message: 'PARAM12 requires the selected target to stay inside the nested composition chain.',
      };
    }

    const innerGenerated = generateCompositionBranchesForCarrier(
      innerCandidate.match.carrier,
      innerCandidate.valueSide,
      angleUnit,
      { periodicParameterName: innerPeriodicParameterName },
    );
    if (innerGenerated.kind === 'unsupported') {
      return innerGenerated;
    }

    equations.push(...innerGenerated.equations);
    facts.push(...innerGenerated.facts);
    layerEquationLatex.push(...innerGenerated.equations);
    if (equations.length > maxGeneratedBranches) {
      return {
        kind: 'unsupported',
        reason: 'branch-limit',
        message: 'Nested composition branch generation exceeded the PARAM12 branch cap.',
      };
    }
  }

  if (periodicParameterNamesFromFacts(facts).size > maxPeriodicParameters) {
    return {
      kind: 'unsupported',
      reason: 'branch-limit',
      message: 'Nested composition generated more independent periodic parameters than PARAM12 allows.',
    };
  }

  return {
    kind: 'ok',
    equations: [...new Set(equations)],
    facts: [...new Set(facts)],
    layerEquationLatex: [...new Set(layerEquationLatex)],
    depth: 2,
  };
}

function generateTrigCompositionBranches(
  carrier: CompositionCarrier,
  value: CompositionMathJson,
  angleUnit: AngleUnit,
  periodicParameterName: string,
): CompositionGeneratedBranches {
  const valueLatex = compositionLatexForNode(value);
  const numericValue = numericValueOfCompositionNode(value);
  if ((carrier.kind === 'sin' || carrier.kind === 'cos') && numericValue !== null && (numericValue < -1 || numericValue > 1)) {
    return {
      kind: 'unsupported',
      reason: 'domain-empty',
      message: 'No real selected-target solution remains because the trigonometric range check fails.',
    };
  }

  const inverse = inverseTrigLatex(carrier.kind, valueLatex, angleUnit, numericValue);
  const innerLatex = compositionLatexForNode(carrier.inner);
  const period = angleUnit === 'rad' ? `2\\pi ${periodicParameterName}` : angleUnit === 'deg' ? `360${periodicParameterName}` : `400${periodicParameterName}`;
  const tanPeriod = angleUnit === 'rad' ? `\\pi ${periodicParameterName}` : angleUnit === 'deg' ? `180${periodicParameterName}` : `200${periodicParameterName}`;
  const halfTurn = angleUnit === 'rad' ? '\\pi' : angleUnit === 'deg' ? '180' : '200';
  const branchValues = carrier.kind === 'tan'
    ? [`${inverse}+${tanPeriod}`]
    : carrier.kind === 'sin'
      ? [`${inverse}+${period}`, `${halfTurn}-${inverse}+${period}`]
      : [`${inverse}+${period}`, `-${inverse}+${period}`];

  return {
    kind: 'ok',
    equations: branchValues.map((branch) => `${innerLatex}=${branch}`),
    facts: [
      carrier.kind === 'tan' ? null : (nodeHasSymbol(value) ? `-1\\le ${valueLatex}\\le1` : null),
      `${periodicParameterName}\\in\\mathbb{Z}`,
    ].filter((entry): entry is string => Boolean(entry)),
  };
}

function inverseTrigLatex(
  kind: CompositionCarrierKind,
  valueLatex: string,
  angleUnit: AngleUnit,
  numericValue: number | null,
) {
  const exactValue = exactInverseTrigValueLatex(kind, numericValue, angleUnit);
  if (exactValue) {
    return exactValue;
  }

  const inverse = kind === 'sin'
    ? `\\arcsin(${valueLatex})`
    : kind === 'cos'
      ? `\\arccos(${valueLatex})`
      : `\\arctan(${valueLatex})`;
  if (angleUnit === 'rad') {
    return inverse;
  }
  const numerator = angleUnit === 'deg' ? '180' : '200';
  return `\\frac{${numerator}}{\\pi}${inverse}`;
}

function exactInverseTrigValueLatex(
  kind: CompositionCarrierKind,
  numericValue: number | null,
  angleUnit: AngleUnit,
) {
  if (numericValue === null) {
    return null;
  }

  const matches = (value: number) => Math.abs(numericValue - value) <= EPSILON;
  const valueByUnit = (radianLatex: string, degreeLatex: string, gradLatex: string) => {
    if (angleUnit === 'rad') {
      return radianLatex;
    }
    return angleUnit === 'deg' ? degreeLatex : gradLatex;
  };

  if (kind === 'sin') {
    if (matches(0)) {
      return '0';
    }
    if (matches(1)) {
      return valueByUnit('\\frac{\\pi}{2}', '90', '100');
    }
    if (matches(-1)) {
      return valueByUnit('-\\frac{\\pi}{2}', '-90', '-100');
    }
  }

  if (kind === 'cos') {
    if (matches(1)) {
      return '0';
    }
    if (matches(0)) {
      return valueByUnit('\\frac{\\pi}{2}', '90', '100');
    }
    if (matches(-1)) {
      return valueByUnit('\\pi', '180', '200');
    }
  }

  if (kind === 'tan') {
    if (matches(0)) {
      return '0';
    }
    if (matches(1)) {
      return valueByUnit('\\frac{\\pi}{4}', '45', '50');
    }
    if (matches(-1)) {
      return valueByUnit('-\\frac{\\pi}{4}', '-45', '-50');
    }
  }

  return null;
}

export function buildSharedCompositionBranchSet(
  equations: string[],
  constraints?: SolveDomainConstraint[],
) {
  return createBranchSet({
    equations,
    constraints,
    provenance: 'composition-stage',
  });
}

export function resolveCompositionRecursionDepth(
  currentCompositionDepth: number,
  executionBudget: EquationExecutionBudget,
) {
  const nextDepth = currentCompositionDepth + 1;
  if (nextDepth > executionBudget.maxCompositionInversionDepth) {
    return {
      kind: 'blocked' as const,
      nextDepth,
    };
  }
  return {
    kind: 'ok' as const,
    nextDepth,
  };
}
