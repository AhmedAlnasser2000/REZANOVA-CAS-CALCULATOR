import { ComputeEngine } from '@cortex-js/compute-engine';
import {
  MAX_COMPLEX_SPECIAL_FORM_DEGREE,
} from '../complex/special-form-carrier';
import {
  type EquationSelectedTargetRouteFamily,
  planSelectedTargetRouteFamilies,
  profileEquationTargetShape,
} from '../equation-target-shape';
import {
  buildPrincipalRootImageFact,
  type ComplexPrincipalRootImageClassification,
} from '../roots/complex-principal-image';
import {
  type ComplexPrincipalRootDegree,
  isComplexPrincipalRootDegree,
} from '../roots/complex-principal-roots';
import {
  createArithmeticHelpers,
  latexForNode,
  simplifyNode,
  type MathJson,
} from '../parameterized/math-json';
import type { AngleUnit } from '../../../types/calculator';
import {
  compositionLatexForNode,
  hasCompositionTarget,
  isCompositionArrayNode,
  matchSelectedCompositionCarrierChain,
  type CompositionCarrier,
  type CompositionCarrierKind,
  type CompositionCoreStopReason,
  type CompositionMathJson,
} from './core';

const ce = new ComputeEngine();
const { divideNodes, subtractNodes } = createArithmeticHelpers();

const COMPLEX_NESTED_WRAPPER_KINDS = new Set<CompositionCarrierKind>([
  'square-root',
  'nth-root',
  'square-power',
  'odd-power',
  'even-power',
]);

const COMPACT_COMPLEX_ROUTE_FAMILIES = new Set<EquationSelectedTargetRouteFamily>([
  'linear',
  'rational',
  'factorable-polynomial',
  'special-form-roots',
  'algebraic-isolation',
]);

export type ComplexNestedPrincipalImageFact = {
  layer: number;
  carrierLatex: string;
  degree: ComplexPrincipalRootDegree;
  valueLatex: string;
  conditionLatex: string;
  classification: ComplexPrincipalRootImageClassification;
  detailLines: string[];
};

export type ComplexNestedPowerBranchDefinition = {
  layer: number;
  carrierLatex: string;
  exponent: ComplexPrincipalRootDegree;
  valueLatex: string;
  branches: {
    symbolLatex: string;
    valueLatex: string;
  }[];
};

export type ComplexNestedFinalRouteEligibility = {
  equationLatex: string;
  compact: boolean;
  routeFamilies: EquationSelectedTargetRouteFamily[];
  reason?: string;
};

export type ComplexNestedWrapperReady = {
  kind: 'ready';
  depth: 2;
  visibleSolve: 'deferred';
  carrierKinds: [CompositionCarrierKind, CompositionCarrierKind];
  carrierLatex: [string, string];
  layerEquationLatex: string[];
  generatedEquationLatex: string[];
  coefficientFacts: string[];
  principalImageFacts: ComplexNestedPrincipalImageFact[];
  powerBranchDefinitions: ComplexNestedPowerBranchDefinition[];
  compactRouteEligibility: {
    kind: 'eligible' | 'deferred';
    generatedBranchCap: number;
    equations: ComplexNestedFinalRouteEligibility[];
  };
};

export type ComplexNestedWrapperDeferred = {
  kind: 'deferred';
  reason: CompositionCoreStopReason;
  message: string;
  carrierKinds?: CompositionCarrierKind[];
};

export type ComplexNestedWrapperSubstrate =
  | ComplexNestedWrapperReady
  | ComplexNestedWrapperDeferred;

type ActiveBranch = {
  value: MathJson;
};

type ComplexNestedCarrierChain = {
  carriers: [CompositionCarrier, CompositionCarrier];
  depth: 2;
};

function deferred(
  reason: CompositionCoreStopReason,
  message: string,
  carrierKinds?: CompositionCarrierKind[],
): ComplexNestedWrapperDeferred {
  return {
    kind: 'deferred',
    reason,
    message,
    ...(carrierKinds ? { carrierKinds } : {}),
  };
}

function parseEquation(equationLatex: string) {
  try {
    const json = ce.parse(equationLatex).json;
    if (!isCompositionArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
      return null;
    }
    return [json[1] as CompositionMathJson, json[2] as CompositionMathJson] as const;
  } catch {
    return 'parse-error' as const;
  }
}

function mathJson(node: CompositionMathJson): MathJson {
  return node as MathJson;
}

function carrierDegree(carrier: CompositionCarrier): ComplexPrincipalRootDegree | null {
  if (carrier.kind === 'square-root' || carrier.kind === 'square-power') {
    return 2;
  }
  if (
    (carrier.kind === 'nth-root' || carrier.kind === 'odd-power' || carrier.kind === 'even-power')
    && carrier.exponent
    && isComplexPrincipalRootDegree(carrier.exponent)
  ) {
    return carrier.exponent;
  }
  return null;
}

function powerKindForDegree(degree: ComplexPrincipalRootDegree): CompositionCarrierKind {
  if (degree === 2) {
    return 'square-power';
  }
  return degree % 2 === 0 ? 'even-power' : 'odd-power';
}

function hasDisallowedSelectedTargetNestedCarrier(node: unknown, target: string): boolean {
  if (!isCompositionArrayNode(node)) {
    return false;
  }
  const [operator, ...operands] = node;
  if (
    (
      operator === 'Abs'
      || operator === 'Sqrt'
      || operator === 'Root'
      || operator === 'Ln'
      || operator === 'Log'
      || operator === 'Sin'
      || operator === 'Cos'
      || operator === 'Tan'
      || operator === 'Exp'
    )
    && operands.some((operand) => hasCompositionTarget(operand, target))
  ) {
    return true;
  }
  if (operator === 'Power' && operands.length === 2 && hasCompositionTarget(operands[1], target)) {
    return true;
  }
  return operands.some((operand) => hasDisallowedSelectedTargetNestedCarrier(operand, target));
}

function matchRootAroundPowerCarrierChain(
  node: CompositionMathJson,
  target: string,
): ComplexNestedCarrierChain | null {
  if (!isCompositionArrayNode(node)) {
    return null;
  }

  const [outerOperator, outerInner, outerDegreeNode] = node;
  let outerDegree: ComplexPrincipalRootDegree | null = null;
  let outerKind: CompositionCarrierKind | null = null;
  if (outerOperator === 'Sqrt' && outerInner && hasCompositionTarget(outerInner, target)) {
    outerDegree = 2;
    outerKind = 'square-root';
  } else if (
    outerOperator === 'Root'
    && outerInner
    && typeof outerDegreeNode === 'number'
    && isComplexPrincipalRootDegree(outerDegreeNode)
    && hasCompositionTarget(outerInner, target)
  ) {
    outerDegree = outerDegreeNode;
    outerKind = 'nth-root';
  }
  if (!outerDegree || !outerKind || !isCompositionArrayNode(outerInner)) {
    return null;
  }

  const [innerOperator, innerBase, innerExponent] = outerInner;
  if (
    innerOperator !== 'Power'
    || !innerBase
    || typeof innerExponent !== 'number'
    || !isComplexPrincipalRootDegree(innerExponent)
    || !hasCompositionTarget(innerBase, target)
    || hasCompositionTarget(outerDegreeNode, target)
    || hasDisallowedSelectedTargetNestedCarrier(innerBase, target)
  ) {
    return null;
  }

  return {
    depth: 2,
    carriers: [
      {
        kind: outerKind,
        node,
        inner: outerInner,
        labelLatex: compositionLatexForNode(node),
        exponent: outerKind === 'nth-root' ? outerDegree : undefined,
      },
      {
        kind: powerKindForDegree(innerExponent),
        node: outerInner,
        inner: innerBase as CompositionMathJson,
        labelLatex: compositionLatexForNode(outerInner),
        exponent: innerExponent,
      },
    ],
  };
}

function carrierIsPrincipalRoot(carrier: CompositionCarrier) {
  return carrier.kind === 'square-root' || carrier.kind === 'nth-root';
}

function carrierIsPowerRelation(carrier: CompositionCarrier) {
  return carrier.kind === 'square-power'
    || carrier.kind === 'odd-power'
    || carrier.kind === 'even-power';
}

function nonzeroFactForNode(node: MathJson) {
  return `${latexForNode(node)}\\ne0`;
}

function isolatedValueForCarrier(carrier: CompositionCarrier, value: MathJson) {
  if (!carrier.affineShell) {
    return {
      value: simplifyNode(value),
      facts: [] as string[],
    };
  }

  const coefficient = mathJson(carrier.affineShell.coefficient);
  return {
    value: divideNodes(
      subtractNodes(simplifyNode(value), mathJson(carrier.affineShell.constant)),
      coefficient,
    ),
    facts: [nonzeroFactForNode(coefficient)],
  };
}

function powerNode(value: MathJson, degree: ComplexPrincipalRootDegree): MathJson {
  return simplifyNode(['Power', value, degree] as MathJson);
}

function powerBranchSymbol(layer: number, branchIndex: number) {
  return `u_${layer}_${branchIndex}`;
}

function powerBranchValueLatex(valueLatex: string, degree: ComplexPrincipalRootDegree, branchIndex: number) {
  const rootLatex = `\\operatorname{PrincipalRoot}_{${degree}}\\left(${valueLatex}\\right)`;
  return branchIndex === 0 ? rootLatex : `${rootLatex}\\omega_{${branchIndex}}`;
}

function compactEligibilityForEquation(
  equationLatex: string,
  target: string,
): ComplexNestedFinalRouteEligibility {
  const profile = profileEquationTargetShape(equationLatex, target, {
    allowGeneratedImplicitProducts: true,
  });
  const plan = planSelectedTargetRouteFamilies(profile, {
    phase: 'generated-handoff',
  });

  if (profile.status !== 'ok') {
    return {
      equationLatex,
      compact: false,
      routeFamilies: plan.families,
      reason: profile.message,
    };
  }

  if (profile.polynomialDegree !== null && profile.polynomialDegree > 2) {
    return {
      equationLatex,
      compact: false,
      routeFamilies: plan.families,
      reason: 'Generated Complex nested wrapper branch would need a noncompact higher-degree route.',
    };
  }

  const hasCompactFamily = plan.families.some((family) => COMPACT_COMPLEX_ROUTE_FAMILIES.has(family));
  return {
    equationLatex,
    compact: hasCompactFamily,
    routeFamilies: plan.families,
    ...(!hasCompactFamily
      ? { reason: 'Generated branch has no currently approved compact Complex route.' }
      : {}),
  };
}

function generateComplexNestedLayerData(
  carriers: [CompositionCarrier, CompositionCarrier],
  value: CompositionMathJson,
  target: string,
) {
  const coefficientFacts: string[] = [];
  const principalImageFacts: ComplexNestedPrincipalImageFact[] = [];
  const powerBranchDefinitions: ComplexNestedPowerBranchDefinition[] = [];
  const layerEquationLatex: string[] = [];
  let activeBranches: ActiveBranch[] = [{ value: mathJson(value) }];

  for (const [index, carrier] of carriers.entries()) {
    const layer = index + 1;
    const degree = carrierDegree(carrier);
    if (!degree) {
      return null;
    }
    const innerLatex = compositionLatexForNode(carrier.inner);
    const nextBranches: ActiveBranch[] = [];

    for (const branch of activeBranches) {
      const isolated = isolatedValueForCarrier(carrier, branch.value);
      coefficientFacts.push(...isolated.facts);
      const valueLatex = latexForNode(isolated.value);

      if (carrierIsPrincipalRoot(carrier)) {
        const imageFact = buildPrincipalRootImageFact(isolated.value, degree);
        principalImageFacts.push({
          layer,
          carrierLatex: carrier.labelLatex,
          degree,
          valueLatex: imageFact.valueLatex,
          conditionLatex: imageFact.conditionLatex,
          classification: imageFact.classification,
          detailLines: imageFact.detailLines,
        });
        const powered = powerNode(isolated.value, degree);
        layerEquationLatex.push(`${innerLatex}=${latexForNode(powered)}`);
        nextBranches.push({ value: powered });
        continue;
      }

      if (carrierIsPowerRelation(carrier)) {
        const branches = Array.from({ length: degree }, (_, branchIndex) => {
          const symbol = powerBranchSymbol(layer, branchIndex);
          return {
            symbolLatex: symbol,
            valueLatex: powerBranchValueLatex(valueLatex, degree, branchIndex),
          };
        });
        powerBranchDefinitions.push({
          layer,
          carrierLatex: carrier.labelLatex,
          exponent: degree,
          valueLatex,
          branches,
        });
        for (const branchDefinition of branches) {
          layerEquationLatex.push(`${innerLatex}=${branchDefinition.symbolLatex}`);
          nextBranches.push({ value: branchDefinition.symbolLatex });
        }
      }
    }

    activeBranches = nextBranches;
  }

  const generatedEquationLatex = [...new Set(layerEquationLatex.slice(-activeBranches.length))];
  return {
    generatedEquationLatex,
    layerEquationLatex: [...new Set(layerEquationLatex)],
    coefficientFacts: [...new Set(coefficientFacts)],
    principalImageFacts,
    powerBranchDefinitions,
    target,
  };
}

export function isComplexNestedWrapperSubstrateKind(kind: CompositionCarrierKind) {
  return COMPLEX_NESTED_WRAPPER_KINDS.has(kind);
}

export function inspectComplexNestedWrapperSubstrate(
  equationLatex: string,
  target: string,
  _angleUnit: AngleUnit,
): ComplexNestedWrapperSubstrate {
  void _angleUnit;
  const parsed = parseEquation(equationLatex);
  if (parsed === 'parse-error') {
    return deferred('parse-error', 'The equation could not be parsed for Complex nested wrapper readiness.');
  }
  if (!parsed) {
    return deferred('non-equation', 'Enter an = equation before Complex nested wrapper readiness.');
  }

  const [left, right] = parsed;
  if (!hasCompositionTarget(['Equal', left, right], target)) {
    return deferred('target-not-found', `Selected target ${target} was not found in this equation.`);
  }

  let sawTargetOutsideCarrier = false;
  const candidates = [
    { carrierSide: left, valueSide: right },
    { carrierSide: right, valueSide: left },
  ];

  for (const candidate of candidates) {
    if (!hasCompositionTarget(candidate.carrierSide, target)) {
      continue;
    }
    if (hasCompositionTarget(candidate.valueSide, target)) {
      sawTargetOutsideCarrier = true;
      continue;
    }

    const chain = matchSelectedCompositionCarrierChain(candidate.carrierSide, target);
    const fallbackChain = matchRootAroundPowerCarrierChain(candidate.carrierSide, target);
    if (chain.kind === 'blocked') {
      if (!fallbackChain) {
        return deferred(chain.reason, chain.message);
      }
    }
    const matchedChain = chain.kind === 'matched' ? chain : fallbackChain;
    if (!matchedChain) {
      continue;
    }

    const carrierKinds = matchedChain.carriers.map((carrier) => carrier.kind);
    if (!carrierKinds.every((kind) => isComplexNestedWrapperSubstrateKind(kind))) {
      return deferred(
        'unsupported-carrier',
        'Complex nested wrapper substrate excludes abs, exp/log, trig, and mixed-function nesting.',
        carrierKinds,
      );
    }

    const generated = generateComplexNestedLayerData(
      matchedChain.carriers,
      candidate.valueSide,
      target,
    );
    if (!generated) {
      return deferred(
        'unsupported-carrier',
        'Complex nested wrapper substrate could not determine the wrapper index or exponent.',
        carrierKinds,
      );
    }

    const equations = generated.generatedEquationLatex.map((generatedEquation) =>
      compactEligibilityForEquation(generatedEquation, target));
    const underCap = generated.generatedEquationLatex.length <= MAX_COMPLEX_SPECIAL_FORM_DEGREE;
    const compact = underCap && equations.every((equation) => equation.compact);

    return {
      kind: 'ready',
      depth: 2,
      visibleSolve: 'deferred',
      carrierKinds: carrierKinds as [CompositionCarrierKind, CompositionCarrierKind],
      carrierLatex: matchedChain.carriers.map((carrier) => carrier.labelLatex) as [string, string],
      layerEquationLatex: generated.layerEquationLatex,
      generatedEquationLatex: generated.generatedEquationLatex,
      coefficientFacts: generated.coefficientFacts,
      principalImageFacts: generated.principalImageFacts,
      powerBranchDefinitions: generated.powerBranchDefinitions,
      compactRouteEligibility: {
        kind: compact ? 'eligible' : 'deferred',
        generatedBranchCap: MAX_COMPLEX_SPECIAL_FORM_DEGREE,
        equations: underCap
          ? equations
          : equations.map((equation) => ({
              ...equation,
              compact: false,
              reason: `Generated branch count exceeds the ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} Complex branch cap.`,
            })),
      },
    };
  }

  if (sawTargetOutsideCarrier) {
    return deferred(
      'target-outside-carrier',
      'Complex nested wrapper substrate requires the selected target to appear only inside the bounded nested carrier chain.',
    );
  }

  return deferred(
    'no-composition',
    'No supported Complex nested wrapper substrate was found.',
  );
}
