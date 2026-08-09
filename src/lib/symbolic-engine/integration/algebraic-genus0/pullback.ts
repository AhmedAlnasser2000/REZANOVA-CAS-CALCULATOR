import {
  resolveDirectRuleIntegralFromAst,
  resolveSymbolicIntegralFromAst,
} from '../dispatch';
import {
  divideMathJsonNodes,
  multiplyMathJsonNodes,
  simplifyMathJsonNode,
  simplifyMathJsonNodeOrOriginal,
} from '../../primitives/simplification/simplification';
import {
  substituteMathJsonSubtree,
  substituteMathJsonSymbols,
} from '../../primitives/substitution/substitution';
import {
  boxLatex,
  isNodeArray,
  termKey,
} from '../../patterns';
import { normalizeAst } from '../../normalize';
import { profileAlgebraicGenus0Candidate } from './profile';
import {
  parametrizeAlgebraicGenus0Radicand,
  type AlgebraicGenus0ParametrizationReady,
  type AlgebraicGenus0ParametrizationStopReason,
} from './parametrization';
import type { IntegralResolution } from '../types';

export type AlgebraicGenus0PullbackStopReason =
  | 'integration-stop'
  | 'multiple-radical-substitution-stop'
  | 'node-limit'
  | 'parametrization-stop'
  | 'profile-stop'
  | 'radical-substitution-stop'
  | 'symbol-substitution-stop';

export type AlgebraicGenus0PullbackSuccess = {
  kind: 'success';
  variable: string;
  parameter: string;
  parametrization: AlgebraicGenus0ParametrizationReady;
  pullbackNode: unknown;
  pullbackLatex: string;
  pullbackIntegral: Extract<IntegralResolution, { kind: 'success' }>;
  pullbackAntiderivativeLatex: string;
  exactSupplementLatex: string[];
};

export type AlgebraicGenus0PullbackStop = {
  kind: 'stop';
  variable: string;
  parameter: string;
  reason: AlgebraicGenus0PullbackStopReason;
  detail: string;
  profileReason?: string;
  parametrizationReason?: AlgebraicGenus0ParametrizationStopReason;
};

export type AlgebraicGenus0Pullback =
  | AlgebraicGenus0PullbackSuccess
  | AlgebraicGenus0PullbackStop;

type RadicalOccurrence = {
  node: unknown;
  canonicalRadicand: unknown;
  reciprocal: boolean;
};

const PULLBACK_NODE_LIMIT = 3000;

function stop(input: {
  variable: string;
  parameter: string;
  reason: AlgebraicGenus0PullbackStopReason;
  detail: string;
  profileReason?: string;
  parametrizationReason?: AlgebraicGenus0ParametrizationStopReason;
}): AlgebraicGenus0PullbackStop {
  return { kind: 'stop', ...input };
}

function isExactOne(node: unknown) {
  return node === 1
    || (
      isNodeArray(node)
      && node[0] === 'Rational'
      && node[1] === 1
      && node[2] === 1
    );
}

function canonicalRadicand(rawRadicand: unknown) {
  if (
    isNodeArray(rawRadicand)
    && rawRadicand[0] === 'Divide'
    && rawRadicand.length === 3
    && isExactOne(rawRadicand[1])
  ) {
    return {
      radicand: rawRadicand[2],
      reciprocal: true,
    };
  }

  return {
    radicand: rawRadicand,
    reciprocal: false,
  };
}

function collectRadicals(node: unknown, target: RadicalOccurrence[] = []) {
  if (!isNodeArray(node)) {
    return target;
  }

  if (node[0] === 'Sqrt' && node.length === 2) {
    const canonical = canonicalRadicand(node[1]);
    target.push({
      node,
      canonicalRadicand: canonical.radicand,
      reciprocal: canonical.reciprocal,
    });
  }

  for (const child of node.slice(1)) {
    collectRadicals(child, target);
  }

  return target;
}

function key(node: unknown) {
  return termKey(normalizeAst(simplifyMathJsonNodeOrOriginal(node)));
}

function replacementForRadical(
  occurrence: RadicalOccurrence,
  parametrization: AlgebraicGenus0ParametrizationReady,
) {
  return occurrence.reciprocal
    ? divideMathJsonNodes(1, parametrization.radicalParamNode)
    : parametrization.radicalParamNode;
}

function combineSupplements(
  parametrization: AlgebraicGenus0ParametrizationReady,
  integration: Extract<IntegralResolution, { kind: 'success' }>,
) {
  const seen = new Set<string>();
  const combined: string[] = [];
  for (const line of [
    ...parametrization.exactSupplementLatex,
    ...(integration.exactSupplementLatex ?? []),
  ]) {
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    combined.push(line);
  }
  return combined;
}

export function pullbackAlgebraicGenus0Integral(
  integrand: unknown,
  variable = 'x',
  requestedParameter?: string,
): AlgebraicGenus0Pullback {
  const parameter = requestedParameter && requestedParameter !== variable
    ? requestedParameter
    : variable === 't'
      ? 's'
      : 't';
  const profile = profileAlgebraicGenus0Candidate(integrand, variable);
  if (profile.kind !== 'ready') {
    return stop({
      variable,
      parameter,
      reason: 'profile-stop',
      profileReason: profile.reason,
      detail: profile.detail ?? `The algebraic genus-0 profiler stopped with ${profile.reason}.`,
    });
  }

  const radicals = collectRadicals(integrand);
  const [firstRadical] = radicals;
  if (!firstRadical) {
    return stop({
      variable,
      parameter,
      reason: 'profile-stop',
      profileReason: 'no-radical',
      detail: 'No square-root occurrence was available for pullback substitution.',
    });
  }

  const parametrization = parametrizeAlgebraicGenus0Radicand(
    firstRadical.canonicalRadicand,
    variable,
    parameter,
  );
  if (parametrization.kind !== 'success') {
    return stop({
      variable,
      parameter,
      reason: 'parametrization-stop',
      parametrizationReason: parametrization.reason,
      detail: parametrization.detail,
    });
  }

  const radicandKey = key(firstRadical.canonicalRadicand);
  let substituted: unknown = integrand;
  for (const occurrence of radicals) {
    if (key(occurrence.canonicalRadicand) !== radicandKey) {
      return stop({
        variable,
        parameter,
        reason: 'multiple-radical-substitution-stop',
        detail: 'Pullback substitution accepts one canonical radical extension per integrand.',
      });
    }

    const radicalSubstitution = substituteMathJsonSubtree(
      substituted,
      occurrence.node,
      replacementForRadical(occurrence, parametrization),
      {
        id: occurrence.reciprocal ? 'reciprocal-radical' : 'radical',
        maxNodeCount: PULLBACK_NODE_LIMIT,
      },
    );
    if (radicalSubstitution.kind !== 'ok') {
      return stop({
        variable,
        parameter,
        reason: radicalSubstitution.reason === 'node-limit' ? 'node-limit' : 'radical-substitution-stop',
        detail: radicalSubstitution.message,
      });
    }
    substituted = radicalSubstitution.node;
  }

  const variableSubstitution = substituteMathJsonSymbols(
    substituted,
    new Map([[variable, parametrization.variableParamNode]]),
    {
      protectedSymbols: [parameter],
      maxNodeCount: PULLBACK_NODE_LIMIT,
    },
  );
  if (variableSubstitution.kind !== 'ok') {
    return stop({
      variable,
      parameter,
      reason: variableSubstitution.reason === 'node-limit' ? 'node-limit' : 'symbol-substitution-stop',
      detail: variableSubstitution.message,
    });
  }

  const pullback = simplifyMathJsonNode(
    multiplyMathJsonNodes(variableSubstitution.node, parametrization.derivativeParamNode),
    { maxNodeCount: PULLBACK_NODE_LIMIT },
  );
  if (pullback.kind !== 'ok') {
    return stop({
      variable,
      parameter,
      reason: 'node-limit',
      detail: pullback.message,
    });
  }

  const pullbackIntegral = resolveDirectRuleIntegralFromAst(pullback.node, parameter)
    ?? resolveSymbolicIntegralFromAst(pullback.node, parameter);
  if (pullbackIntegral.kind !== 'success') {
    return stop({
      variable,
      parameter,
      reason: 'integration-stop',
      detail: pullbackIntegral.error,
    });
  }

  return {
    kind: 'success',
    variable,
    parameter,
    parametrization,
    pullbackNode: pullback.node,
    pullbackLatex: boxLatex(pullback.node),
    pullbackIntegral,
    pullbackAntiderivativeLatex: pullbackIntegral.exactLatex,
    exactSupplementLatex: combineSupplements(parametrization, pullbackIntegral),
  };
}
