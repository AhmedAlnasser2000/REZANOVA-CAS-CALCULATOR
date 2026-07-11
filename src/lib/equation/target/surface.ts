import { ComputeEngine } from '@cortex-js/compute-engine';
import type { DisplayOutcome, PeriodicFamilyInfo, SolveDomainConstraint } from '../../../types/calculator';
import {
  analyzeVariablesFromLatex,
  type VariableAnalysis,
  type VariableSymbolFact,
} from '../../algebra/variable-core';
import { namedVariableLatex } from '../../algebra/named-variable';

const ce = new ComputeEngine();

export type EquationSolveTargetCandidate = {
  name: string;
  label: string;
};

export type EquationSolveTargetStatus =
  | 'ready'
  | 'no-target'
  | 'unsupported'
  | 'parameterized-unsupported';

export type EquationSolveTargetResolution = {
  candidates: EquationSolveTargetCandidate[];
  selectedTarget: string | null;
  shouldShowSelector: boolean;
  status: EquationSolveTargetStatus;
  message?: string;
  analysis: VariableAnalysis;
};

function isSupportedEquationTarget(symbol: VariableSymbolFact) {
  return (
    symbol.identifierKind === 'named-variable'
    || (symbol.identifierKind === 'single-symbol-variable' && /^[A-Za-z]$/.test(symbol.name))
  );
}

function targetLabel(name: string) {
  return name;
}

export function equationTargetLatex(name: string) {
  return /^[A-Za-z]$/.test(name) ? name : namedVariableLatex(name);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceLatexSymbolToken(value: string, from: string, toLatex: string) {
  if (from === toLatex) {
    return value;
  }

  const pattern = new RegExp(`(?<![A-Za-z0-9_\\\\{])${escapeRegExp(from)}(?![A-Za-z0-9_}])`, 'g');
  return value.replace(pattern, toLatex);
}

export function resolveEquationSolveTarget(
  equationLatex: string,
  selectedTarget?: string | null,
): EquationSolveTargetResolution {
  const analysis = analyzeVariablesFromLatex(equationLatex, {
    allowSymbolicParameters: true,
  });
  const candidates = analysis.symbols
    .filter(isSupportedEquationTarget)
    .map((symbol) => ({
      name: symbol.name,
      label: targetLabel(symbol.name),
    }));
  const selectedCandidate = selectedTarget && candidates.some((candidate) => candidate.name === selectedTarget)
    ? selectedTarget
    : candidates.find((candidate) => candidate.name === 'x')?.name ?? candidates[0]?.name ?? null;

  const unsupportedStop = analysis.stops.find((stop) =>
    stop.reason === 'unsupported-named-string-variable'
    || stop.reason === 'ambiguous-identifier'
    || stop.reason === 'parse-error');
  if (unsupportedStop) {
    return {
      candidates,
      selectedTarget: null,
      shouldShowSelector: false,
      status: 'unsupported',
      message: unsupportedStop.message,
      analysis,
    };
  }

  if (candidates.length === 0) {
    return {
      candidates,
      selectedTarget: null,
      shouldShowSelector: false,
      status: 'no-target',
      message: analysis.reservedIdentifiers.length > 0
        ? 'Only reserved constants, units, or functions were found; no solve target is available.'
        : 'Enter an equation containing a supported variable.',
      analysis,
    };
  }

  if (candidates.length > 1) {
    return {
      candidates,
      selectedTarget: selectedCandidate,
      shouldShowSelector: true,
      status: 'parameterized-unsupported',
      message: selectedCandidate
        ? `Choose ${selectedCandidate} as the solve target to preserve the other symbols as parameters.`
        : 'Choose a solve target before solving this multi-symbol equation.',
      analysis,
    };
  }

  return {
    candidates,
    selectedTarget: candidates[0].name,
    shouldShowSelector: false,
    status: 'ready',
    analysis,
  };
}

function replaceSymbol(node: unknown, from: string, to: string): unknown {
  if (typeof node === 'string') {
    return node === from ? to : node;
  }

  if (Array.isArray(node)) {
    const [operator, ...operands] = node;
    return [operator, ...operands.map((operand) => replaceSymbol(operand, from, to))];
  }

  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, replaceSymbol(value, from, to)]),
    );
  }

  return node;
}

export function retargetEquationLatexToX(latex: string, target: string) {
  if (target === 'x') {
    return latex;
  }

  const parsed = ce.parse(latex);
  return ce.box(replaceSymbol(parsed.json, target, 'x') as Parameters<typeof ce.box>[0]).latex;
}

function replaceXToken(value: string, target: string, latex = true) {
  if (target === 'x') {
    return value;
  }

  return value.replace(/\bx\b/g, latex ? equationTargetLatex(target) : target);
}

function rewritePeriodicFamilyTarget(
  family: PeriodicFamilyInfo | undefined,
  target: string,
): PeriodicFamilyInfo | undefined {
  if (!family || target === 'x') {
    return family;
  }

  return {
    ...family,
    carrierLatex: replaceXToken(family.carrierLatex, target),
    parameterLatex: replaceXToken(family.parameterLatex, target),
    parameterConstraintLatex: family.parameterConstraintLatex?.map((entry) => replaceXToken(entry, target)),
    branchesLatex: family.branchesLatex.map((entry) => replaceXToken(entry, target)),
    discoveredFamilies: family.discoveredFamilies?.map((entry) => replaceXToken(entry, target)),
    representatives: family.representatives?.map((entry) => ({
      ...entry,
      exactLatex: entry.exactLatex ? replaceXToken(entry.exactLatex, target) : entry.exactLatex,
      approxText: entry.approxText ? replaceXToken(entry.approxText, target, false) : entry.approxText,
    })),
    suggestedIntervals: family.suggestedIntervals?.map((entry) => ({
      ...entry,
      start: replaceXToken(entry.start, target),
      end: replaceXToken(entry.end, target),
    })),
    piecewiseBranches: family.piecewiseBranches?.map((entry) => ({
      conditionLatex: replaceXToken(entry.conditionLatex, target),
      resultLatex: replaceXToken(entry.resultLatex, target),
    })),
    principalRangeLatex: family.principalRangeLatex ? replaceXToken(family.principalRangeLatex, target) : family.principalRangeLatex,
    reducedCarrierLatex: family.reducedCarrierLatex ? replaceXToken(family.reducedCarrierLatex, target) : family.reducedCarrierLatex,
  };
}

function withoutCanonicalMath(outcome: Exclude<DisplayOutcome, { kind: 'prompt' }>) {
  if (outcome.kind !== 'success' || !outcome.canonicalMath) {
    return outcome;
  }

  const rest = { ...outcome };
  delete rest.canonicalMath;
  return rest;
}

export function rewriteEquationOutcomeTarget(outcome: DisplayOutcome, target: string): DisplayOutcome {
  if (target === 'x') {
    return outcome;
  }

  if (outcome.kind === 'prompt') {
    return {
      ...outcome,
      carryLatex: replaceXToken(outcome.carryLatex, target),
    };
  }

  const rewritten = {
    ...withoutCanonicalMath(outcome),
    exactLatex: outcome.exactLatex ? replaceXToken(outcome.exactLatex, target) : outcome.exactLatex,
    periodicFamily: rewritePeriodicFamilyTarget(outcome.periodicFamily, target),
    exactSupplementLatex: outcome.exactSupplementLatex?.map((entry) => replaceXToken(entry, target)),
    approxText: outcome.approxText ? replaceXToken(outcome.approxText, target, false) : outcome.approxText,
    detailSections: outcome.detailSections?.map((section) => ({
      ...section,
      lines: section.lines.map((line) => replaceXToken(line, target, false)),
    })),
    actions: outcome.actions?.map((action) =>
      action.kind === 'send'
        ? { ...action, latex: replaceXToken(action.latex, target) }
        : { ...action, latex: replaceXToken(action.latex, target) },
    ),
    resolvedInputLatex: outcome.resolvedInputLatex
      ? replaceXToken(outcome.resolvedInputLatex, target)
      : outcome.resolvedInputLatex,
    transformSummaryLatex: outcome.transformSummaryLatex
      ? replaceXToken(outcome.transformSummaryLatex, target)
      : outcome.transformSummaryLatex,
  };

  return rewritten as DisplayOutcome;
}

export function formatNamedEquationOutcomeTarget(outcome: DisplayOutcome, target: string): DisplayOutcome {
  const targetLatex = equationTargetLatex(target);
  if (targetLatex === target) {
    return outcome;
  }

  if (outcome.kind === 'prompt') {
    return {
      ...outcome,
      carryLatex: replaceLatexSymbolToken(outcome.carryLatex, target, targetLatex),
    };
  }

  return {
    ...withoutCanonicalMath(outcome),
    exactLatex: outcome.exactLatex ? replaceLatexSymbolToken(outcome.exactLatex, target, targetLatex) : outcome.exactLatex,
    exactSupplementLatex: outcome.exactSupplementLatex?.map((entry) => replaceLatexSymbolToken(entry, target, targetLatex)),
    actions: outcome.actions?.map((action) =>
      action.kind === 'send'
        ? { ...action, latex: replaceLatexSymbolToken(action.latex, target, targetLatex) }
        : { ...action, latex: replaceLatexSymbolToken(action.latex, target, targetLatex) },
    ),
    resolvedInputLatex: outcome.resolvedInputLatex
      ? replaceLatexSymbolToken(outcome.resolvedInputLatex, target, targetLatex)
      : outcome.resolvedInputLatex,
    transformSummaryLatex: outcome.transformSummaryLatex
      ? replaceLatexSymbolToken(outcome.transformSummaryLatex, target, targetLatex)
      : outcome.transformSummaryLatex,
  } as DisplayOutcome;
}

export function retargetDomainConstraintsToX(
  constraints: SolveDomainConstraint[] | undefined,
  target: string,
): SolveDomainConstraint[] | undefined {
  if (!constraints || target === 'x') {
    return constraints;
  }

  return constraints.map((constraint) => {
    if ('expressionLatex' in constraint) {
      return {
        ...constraint,
        expressionLatex: retargetEquationLatexToX(constraint.expressionLatex, target),
      };
    }
    return constraint;
  });
}
