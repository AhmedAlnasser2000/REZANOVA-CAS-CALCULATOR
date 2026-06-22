import { normalizeAst } from '../../normalize';
import { isNodeArray, termKey } from '../../patterns';

const DEFAULT_MAX_NODE_COUNT = 2000;

export type MathJsonSubstitutionUnsupportedReason =
  | 'node-limit'
  | 'non-integer-power'
  | 'nonpositive-power'
  | 'power-step-mismatch';

export type MathJsonSubstitutionOk = {
  kind: 'ok';
  node: unknown;
  changed: boolean;
  usedSubstitutions: string[];
  protectedHits: string[];
  nodeCount: number;
};

export type MathJsonSubstitutionUnsupported = {
  kind: 'unsupported';
  reason: MathJsonSubstitutionUnsupportedReason;
  message: string;
  node: unknown;
  changed: false;
  usedSubstitutions: string[];
  protectedHits: string[];
  nodeCount: number;
};

export type MathJsonSubstitutionResult =
  | MathJsonSubstitutionOk
  | MathJsonSubstitutionUnsupported;

export type SymbolSubstitutionOptions = {
  protectedSymbols?: readonly string[];
  maxNodeCount?: number;
};

export type StructuralSubstitutionOptions = {
  id?: string;
  maxNodeCount?: number;
};

export type CarrierPowerBasisSubstitutionOptions = {
  carrierNode: unknown;
  carrierSymbol?: string;
  powerStep?: number;
  maxNodeCount?: number;
};

type SubstitutionState = {
  changed: boolean;
  usedSubstitutions: string[];
  protectedHits: string[];
};

function pushUnique(entries: string[], value: string) {
  if (!entries.includes(value)) {
    entries.push(value);
  }
}

function nodeCount(node: unknown): number {
  if (!isNodeArray(node)) {
    return 1;
  }
  return 1 + node.slice(1).reduce<number>((count, child) => count + nodeCount(child), 0);
}

function normalizedKey(node: unknown) {
  return termKey(normalizeAst(node));
}

function finishOk(
  node: unknown,
  state: SubstitutionState,
  maxNodeCount: number,
): MathJsonSubstitutionResult {
  const normalized = normalizeAst(node);
  const count = nodeCount(normalized);
  if (count > maxNodeCount) {
    return {
      kind: 'unsupported',
      reason: 'node-limit',
      message: `Substitution result exceeded the node limit of ${maxNodeCount}.`,
      node: normalized,
      changed: false,
      usedSubstitutions: state.usedSubstitutions,
      protectedHits: state.protectedHits,
      nodeCount: count,
    };
  }

  return {
    kind: 'ok',
    node: normalized,
    changed: state.changed,
    usedSubstitutions: state.usedSubstitutions,
    protectedHits: state.protectedHits,
    nodeCount: count,
  };
}

function finishUnsupported(
  reason: MathJsonSubstitutionUnsupportedReason,
  message: string,
  node: unknown,
  state: SubstitutionState,
): MathJsonSubstitutionUnsupported {
  const normalized = normalizeAst(node);
  return {
    kind: 'unsupported',
    reason,
    message,
    node: normalized,
    changed: false,
    usedSubstitutions: state.usedSubstitutions,
    protectedHits: state.protectedHits,
    nodeCount: nodeCount(normalized),
  };
}

function replacementMapFrom(
  replacements: ReadonlyMap<string, unknown> | Record<string, unknown>,
) {
  return replacements instanceof Map
    ? replacements
    : new Map(Object.entries(replacements));
}

function cloneNormalized(node: unknown) {
  return normalizeAst(node);
}

export function substituteMathJsonSymbols(
  node: unknown,
  replacements: ReadonlyMap<string, unknown> | Record<string, unknown>,
  options: SymbolSubstitutionOptions = {},
): MathJsonSubstitutionResult {
  const replacementMap = replacementMapFrom(replacements);
  const protectedSymbols = new Set(options.protectedSymbols ?? []);
  const state: SubstitutionState = { changed: false, usedSubstitutions: [], protectedHits: [] };

  function visit(current: unknown): unknown {
    if (typeof current === 'string') {
      if (protectedSymbols.has(current)) {
        pushUnique(state.protectedHits, current);
        return current;
      }
      if (replacementMap.has(current)) {
        state.changed = true;
        pushUnique(state.usedSubstitutions, current);
        return cloneNormalized(replacementMap.get(current));
      }
      return current;
    }

    if (!isNodeArray(current) || current.length === 0) {
      return current;
    }

    const [operator, ...operands] = current;
    return [operator, ...operands.map(visit)];
  }

  return finishOk(visit(node), state, options.maxNodeCount ?? DEFAULT_MAX_NODE_COUNT);
}

export function substituteMathJsonSubtree(
  node: unknown,
  matchNode: unknown,
  replacementNode: unknown,
  options: StructuralSubstitutionOptions = {},
): MathJsonSubstitutionResult {
  const matchKey = normalizedKey(matchNode);
  const substitutionId = options.id ?? matchKey;
  const state: SubstitutionState = { changed: false, usedSubstitutions: [], protectedHits: [] };

  function visit(current: unknown): unknown {
    if (normalizedKey(current) === matchKey) {
      state.changed = true;
      pushUnique(state.usedSubstitutions, substitutionId);
      return cloneNormalized(replacementNode);
    }

    if (!isNodeArray(current) || current.length === 0) {
      return current;
    }

    const [operator, ...operands] = current;
    return [operator, ...operands.map(visit)];
  }

  return finishOk(visit(node), state, options.maxNodeCount ?? DEFAULT_MAX_NODE_COUNT);
}

function positiveIntegerExponent(exponent: unknown):
  | { kind: 'ok'; value: number }
  | { kind: 'unsupported'; reason: 'non-integer-power' | 'nonpositive-power'; message: string } {
  if (typeof exponent !== 'number' || !Number.isInteger(exponent)) {
    return {
      kind: 'unsupported',
      reason: 'non-integer-power',
      message: 'Carrier power-basis substitution requires integer carrier powers.',
    };
  }
  if (exponent <= 0) {
    return {
      kind: 'unsupported',
      reason: 'nonpositive-power',
      message: 'Carrier power-basis substitution requires positive carrier powers.',
    };
  }
  return { kind: 'ok', value: exponent };
}

export function substituteCarrierPowerBasis(
  node: unknown,
  options: CarrierPowerBasisSubstitutionOptions,
): MathJsonSubstitutionResult {
  const carrierKey = normalizedKey(options.carrierNode);
  const carrierSymbol = options.carrierSymbol ?? 'u';
  const powerStep = options.powerStep ?? 1;
  const state: SubstitutionState = { changed: false, usedSubstitutions: [], protectedHits: [] };

  function replacementForPower(power: number):
    | { kind: 'ok'; node: unknown }
    | { kind: 'unsupported'; reason: MathJsonSubstitutionUnsupportedReason; message: string } {
    if (power % powerStep !== 0) {
      return {
        kind: 'unsupported',
        reason: 'power-step-mismatch',
        message: `Carrier power ${power} is not divisible by the requested power step ${powerStep}.`,
      };
    }
    const reducedPower = power / powerStep;
    return {
      kind: 'ok',
      node: reducedPower === 1 ? carrierSymbol : ['Power', carrierSymbol, reducedPower],
    };
  }

  function visit(current: unknown):
    | { kind: 'ok'; node: unknown }
    | { kind: 'unsupported'; reason: MathJsonSubstitutionUnsupportedReason; message: string } {
    const currentKey = normalizedKey(current);
    if (currentKey === carrierKey) {
      const replacement = replacementForPower(1);
      if (replacement.kind === 'unsupported') {
        return replacement;
      }
      state.changed = true;
      pushUnique(state.usedSubstitutions, carrierSymbol);
      return replacement;
    }

    if (
      isNodeArray(current)
      && current[0] === 'Power'
      && current.length === 3
      && normalizedKey(current[1]) === carrierKey
    ) {
      const exponent = positiveIntegerExponent(current[2]);
      if (exponent.kind === 'unsupported') {
        return exponent;
      }
      const replacement = replacementForPower(exponent.value);
      if (replacement.kind === 'unsupported') {
        return replacement;
      }
      state.changed = true;
      pushUnique(state.usedSubstitutions, carrierSymbol);
      return replacement;
    }

    if (!isNodeArray(current) || current.length === 0) {
      return { kind: 'ok', node: current };
    }

    const [operator, ...operands] = current;
    const nextOperands: unknown[] = [];
    for (const operand of operands) {
      const next = visit(operand);
      if (next.kind === 'unsupported') {
        return next;
      }
      nextOperands.push(next.node);
    }
    return { kind: 'ok', node: [operator, ...nextOperands] };
  }

  const reduced = visit(node);
  if (reduced.kind === 'unsupported') {
    return finishUnsupported(reduced.reason, reduced.message, node, state);
  }
  return finishOk(reduced.node, state, options.maxNodeCount ?? DEFAULT_MAX_NODE_COUNT);
}
