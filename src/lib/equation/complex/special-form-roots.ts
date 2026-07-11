import type { ComplexExactForm, DisplayDetailSection } from '../../../types/calculator';
import { quadraticRootNodes } from '../../algebra/polynomial-factor/quadratic';
import { analyzeVariablesFromLatex } from '../../algebra/variable-core';
import { complex } from '../../numeric/complex';
import {
  createComplexPrincipalRootBranchNode,
  complexPrincipalRootBranches,
  isComplexPrincipalRootDegree,
  principalRootBaseLatex,
  principalRootMultiplierLatex,
} from '../roots/complex-principal-roots';
import type { EquationAlgebraicIsolationSuccess } from '../equation-algebraic-isolation';
import { buildBranchReadback } from './branches';
import {
  collectCarrierSpecialForm,
  MAX_COMPLEX_SPECIAL_FORM_DEGREE,
  solveAffineCarrierLatex,
  type AffineCarrierBase,
} from './special-form-carrier';
import { ce, containsTarget, isArrayNode, latexForNode, simplifyNode } from './math-json';
import type { ComplexEquationBranch, ComplexEquationOptions, MathJson } from './types';

type ComplexSpecialFormStopReason =
  | 'parse-error'
  | 'non-equation'
  | 'target-not-found'
  | 'no-special-form'
  | 'total-degree-limit'
  | 'symbolic-coefficients'
  | 'unsupported-carrier-shape'
  | 'complex-carrier-root';

export type ComplexSpecialFormRootsResult =
  | EquationAlgebraicIsolationSuccess
  | {
      kind: 'unsupported';
      reason: ComplexSpecialFormStopReason;
      message: string;
      target: string;
      parameterNames: string[];
    };

function stop(
  reason: ComplexSpecialFormStopReason,
  message: string,
  target: string,
  parameterNames: string[],
): Extract<ComplexSpecialFormRootsResult, { kind: 'unsupported' }> {
  return { kind: 'unsupported', reason, message, target, parameterNames };
}

function parameterNamesFromLatex(latex: string, target: string) {
  const analysis = analyzeVariablesFromLatex(latex, { allowSymbolicParameters: true });
  return analysis.symbols
    .filter((symbol) => symbol.name !== target)
    .filter((symbol) =>
      symbol.identifierKind === 'single-symbol-variable'
      || symbol.identifierKind === 'named-variable'
      || symbol.identifierKind === 'indexed-symbol-variable')
    .map((symbol) => symbol.name);
}

function zeroFormNode(json: unknown): MathJson | null {
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return null;
  }
  return simplifyNode(['Subtract', json[1] as MathJson, json[2] as MathJson]);
}

function containsExplicitImaginaryUnit(node: MathJson): boolean {
  if (node === 'ImaginaryUnit' || node === 'i') {
    return true;
  }
  if (Array.isArray(node)) {
    if (node[0] === 'Complex') {
      return true;
    }
    return node.slice(1).some((child) => containsExplicitImaginaryUnit(child as MathJson));
  }
  if (node && typeof node === 'object') {
    return Object.values(node).some((child) =>
      child !== undefined && containsExplicitImaginaryUnit(child));
  }
  return false;
}

function scalarSign(value: number) {
  return Math.abs(value) <= 1e-12 ? 0 : Math.sign(value);
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function piFractionLatex(numerator: number, denominator: number) {
  if (numerator === 0) {
    return '0';
  }
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;
  const piNumerator = reducedNumerator === 1 ? '\\pi' : `${reducedNumerator}\\pi`;
  return reducedDenominator === 1 ? piNumerator : `\\frac{${piNumerator}}{${reducedDenominator}}`;
}

function nthRootMagnitudeLatex(node: MathJson, degree: number) {
  const latex = latexForNode(simplifyNode(['Power', simplifyNode(node), ['Rational', 1, degree]] as MathJson));
  return latex === '1' ? '' : latex;
}

function exactBranchLatex(magnitudeLatex: string, angleLatex: string, complexExactForm: ComplexExactForm) {
  if (angleLatex === '0') {
    return magnitudeLatex || '1';
  }
  if (complexExactForm === 'cis') {
    return `${magnitudeLatex}\\operatorname{cis}\\left(${angleLatex}\\right)`;
  }

  const unit = `\\cos\\left(${angleLatex}\\right)+i\\sin\\left(${angleLatex}\\right)`;
  return magnitudeLatex ? `${magnitudeLatex}\\left(${unit}\\right)` : unit;
}

function complexCarrierRootBranches(
  value: { node: MathJson; numeric: number },
  degree: number,
  complexExactForm: ComplexExactForm,
): ComplexEquationBranch[] {
  const sign = scalarSign(value.numeric);
  if (sign === 0) {
    return [{ exactLatex: '0', approxValue: complex(0, 0) }];
  }

  const absNode = sign < 0 ? simplifyNode(['Negate', value.node] as MathJson) : value.node;
  const magnitudeLatex = nthRootMagnitudeLatex(absNode, degree);
  const radius = Math.pow(Math.abs(value.numeric), 1 / degree);
  const phaseNumeratorBase = sign < 0 ? 1 : 0;
  return Array.from({ length: degree }, (_, index) => {
    const phaseNumerator = phaseNumeratorBase + 2 * index;
    const angleLatex = piFractionLatex(phaseNumerator, degree);
    const angle = (phaseNumerator * Math.PI) / degree;
    return {
      exactLatex: exactBranchLatex(magnitudeLatex, angleLatex, complexExactForm),
      approxValue: complex(radius * Math.cos(angle), radius * Math.sin(angle)),
    };
  });
}

function targetBranchesForCarrierRoot(
  carrier: AffineCarrierBase,
  carrierValue: { node: MathJson; numeric: number },
  degree: number,
  complexExactForm: ComplexExactForm,
) {
  return complexCarrierRootBranches(carrierValue, degree, complexExactForm).map((branch) => ({
    ...branch,
    exactLatex: solveAffineCarrierLatex(carrier, branch.exactLatex),
  }));
}

function omegaLatex(branchIndex: number) {
  return `\\omega_{${branchIndex}}`;
}

function compactPrincipalRootBranchLatex(
  radicand: MathJson,
  degree: number,
  branchIndex: number,
) {
  if (!isComplexPrincipalRootDegree(degree)) {
    return null;
  }
  const node = createComplexPrincipalRootBranchNode({ radicand, degree, branchIndex });
  return `${principalRootBaseLatex(node)}${omegaLatex(branchIndex)}`;
}

function omegaDefinitionLatex(
  degree: number,
  branchIndex: number,
  complexExactForm: ComplexExactForm,
) {
  if (!isComplexPrincipalRootDegree(degree)) {
    return null;
  }
  const node = createComplexPrincipalRootBranchNode({
    radicand: 'r',
    degree,
    branchIndex,
  });
  return `${omegaLatex(branchIndex)}=${principalRootMultiplierLatex(node, complexExactForm) || '1'}`;
}

function complexPowerDefinitionSection(options: {
  carrierValue: MathJson;
  degree: number;
  complexExactForm: ComplexExactForm;
}): DisplayDetailSection | null {
  if (!isComplexPrincipalRootDegree(options.degree)) {
    return null;
  }
  const omegaDefinitions = Array.from({ length: options.degree }, (_, branchIndex) =>
    omegaDefinitionLatex(options.degree, branchIndex, options.complexExactForm))
    .filter((line): line is string => Boolean(line));

  return {
    title: 'Complex Power Definitions',
    lineKind: 'text',
    lines: [
      `r=${latexForNode(options.carrierValue)}`,
      ...omegaDefinitions,
      `u_{k}=\\operatorname{PrincipalRoot}_{${options.degree}}\\left(r\\right)\\omega_{k},\\quad k=0,\\ldots,${options.degree - 1}`,
      'PrincipalRoot notation carries the internal Complex principal-argument and branch-cut policy.',
    ],
  };
}

function targetBranchesForSymbolicCarrierRoot(
  carrier: AffineCarrierBase,
  carrierValue: MathJson,
  degree: number,
): ComplexEquationBranch[] | null {
  if (!isComplexPrincipalRootDegree(degree)) {
    return null;
  }

  return complexPrincipalRootBranches(carrierValue, degree).map((node) => {
    const rootLatex = compactPrincipalRootBranchLatex(
      node.radicand,
      node.degree,
      node.branchIndex,
    );
    if (!rootLatex) {
      return {
        exactLatex: 'unsupported-principal-root',
      };
    }
    const exactLatex = solveAffineCarrierLatex(carrier, rootLatex);
    return {
      exactLatex,
    };
  });
}

function buildSuccess(options: {
  equationLatex: string;
  target: string;
  parameterNames: string[];
  carrierLatex: string;
  routeLines: string[];
  branches: ComplexEquationBranch[];
  outputStyle?: ComplexEquationOptions['outputStyle'];
  complexExactForm?: ComplexEquationOptions['complexExactForm'];
  preserveOrder?: boolean;
  definitionSection?: DisplayDetailSection | null;
}): EquationAlgebraicIsolationSuccess {
  const readback = buildBranchReadback(
    options.target,
    options.branches,
    options.outputStyle ?? 'exact',
    options.complexExactForm ?? 'rectangular',
    { preserveOrder: options.preserveOrder },
  );
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Complex Special-Form Route',
      lineKind: 'text',
      lines: [
        'Domain intent: Complex.',
        ...options.routeLines,
        `Carrier: ${options.carrierLatex}.`,
        `Visible branch count: ${options.branches.length}.`,
      ],
    },
    {
      title: 'Solve Target',
      lineKind: 'text',
      lines: [
        `Selected target: ${options.target}`,
        options.parameterNames.length > 0
          ? `Symbolic parameters: ${options.parameterNames.join(', ')}`
          : 'No symbolic parameters were preserved.',
      ],
    },
    ...(options.definitionSection ? [options.definitionSection] : []),
  ];

  return {
    kind: 'success',
    target: options.target,
    parameterNames: options.parameterNames,
    generatedEquationLatex: options.equationLatex,
    exactLatex: readback.exactLatex,
    branchReadback: readback.branchReadback,
    approxText: readback.approxText,
    detailSections,
    answerDomain: 'complex',
  };
}

export function solveComplexSpecialFormRootsEquation(
  equationLatex: string,
  target: string,
  options: ComplexEquationOptions = {},
): ComplexSpecialFormRootsResult {
  const parameterNames = parameterNamesFromLatex(equationLatex, target);
  let json: MathJson;
  try {
    json = ce.parse(equationLatex).json as MathJson;
  } catch {
    return stop('parse-error', 'The equation could not be parsed for complex special-form solving.', target, parameterNames);
  }
  if (!isArrayNode(json) || json[0] !== 'Equal' || json.length !== 3) {
    return stop('non-equation', 'Enter an = equation before complex special-form solving.', target, parameterNames);
  }
  if (!containsTarget(json, target)) {
    return stop('target-not-found', `Selected target ${target} was not found in this equation.`, target, parameterNames);
  }

  const zeroForm = zeroFormNode(json);
  if (!zeroForm) {
    return stop('no-special-form', 'No complex special-form structure was detected.', target, parameterNames);
  }

  const collected = collectCarrierSpecialForm(zeroForm, target);
  if (collected.kind === 'degree-limit') {
    return stop(
      'total-degree-limit',
      `Complex special-form roots are capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
      target,
      parameterNames,
    );
  }
  if (collected.kind === 'symbolic-coefficients') {
    return stop(
      'symbolic-coefficients',
      'Complex special-form roots with symbolic carrier coefficients are deferred until a formal principal-branch root policy exists.',
      target,
      parameterNames,
    );
  }
  if (collected.kind === 'unsupported-carrier') {
    return stop(
      'unsupported-carrier-shape',
      'Complex special-form roots currently require a pure or affine selected-target carrier with exact-rational target coefficient.',
      target,
      parameterNames,
    );
  }
  if (collected.kind === 'no-special-form') {
    return stop('no-special-form', 'No complex special-form structure was detected.', target, parameterNames);
  }

  const carrierLatex = latexForNode(collected.carrier.base);
  const complexExactForm = options.complexExactForm ?? 'rectangular';
  if (collected.kind === 'direct') {
    if (collected.degree <= 4) {
      return stop('no-special-form', 'No complex special-form structure was detected.', target, parameterNames);
    }
    const branches = targetBranchesForCarrierRoot(
      collected.carrier,
      { node: collected.carrierValue, numeric: collected.carrierValueNumeric },
      collected.degree,
      complexExactForm,
    );
    return buildSuccess({
      equationLatex,
      target,
      parameterNames,
      carrierLatex,
      branches,
      outputStyle: options.outputStyle,
      complexExactForm: options.complexExactForm,
      routeLines: [
        `Detected exact-rational direct carrier power ${carrierLatex}^{${collected.degree}}.`,
        `Solved all ${collected.degree} bounded complex branches using the selected complex exact form.`,
      ],
    });
  }

  if (collected.kind === 'direct-symbolic') {
    if (collected.degree <= 4 && containsExplicitImaginaryUnit(collected.carrierValue)) {
      return stop('no-special-form', 'No complex special-form structure was detected.', target, parameterNames);
    }
    const branches = targetBranchesForSymbolicCarrierRoot(
      collected.carrier,
      collected.carrierValue,
      collected.degree,
    );
    if (!branches) {
      return stop(
        'total-degree-limit',
        `Complex special-form roots are capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
        target,
        parameterNames,
      );
    }
    return buildSuccess({
      equationLatex,
      target,
      parameterNames,
      carrierLatex,
      branches,
      outputStyle: options.outputStyle,
      complexExactForm: options.complexExactForm,
      preserveOrder: true,
      definitionSection: complexPowerDefinitionSection({
        carrierValue: collected.carrierValue,
        degree: collected.degree,
        complexExactForm,
      }),
      routeLines: [
        `Detected symbolic direct carrier power ${carrierLatex}^{${collected.degree}} with exact-rational target coefficient.`,
        'Rendered bounded Complex branches with compact PrincipalRoot and root-of-unity notation.',
      ],
    });
  }

  if (collected.totalDegree <= 4) {
    return stop('no-special-form', 'No complex special-form structure was detected.', target, parameterNames);
  }
  const carrierRoots = quadraticRootNodes(collected.quadratic);
  if (carrierRoots.kind !== 'real') {
    return stop(
      'complex-carrier-root',
      'Complex carrier quadratics with non-real carrier roots are deferred.',
      target,
      parameterNames,
    );
  }

  const branches = carrierRoots.roots.flatMap((root) =>
    targetBranchesForCarrierRoot(
      collected.carrier,
      { node: root.node as MathJson, numeric: root.numeric },
      collected.carrierDegree,
      complexExactForm,
    ));
  if (branches.length > MAX_COMPLEX_SPECIAL_FORM_DEGREE) {
    return stop(
      'total-degree-limit',
      `Complex special-form roots are capped at ${MAX_COMPLEX_SPECIAL_FORM_DEGREE} visible branches.`,
      target,
      parameterNames,
    );
  }

  return buildSuccess({
    equationLatex,
    target,
    parameterNames,
    carrierLatex,
    branches,
    outputStyle: options.outputStyle,
    complexExactForm: options.complexExactForm,
    routeLines: [
      `Detected an exact-rational quadratic in the carrier power ${carrierLatex}^{${collected.carrierDegree}}.`,
      'Solved real carrier roots, then enumerated bounded complex branches for each carrier value.',
      `Total selected-target degree: ${collected.totalDegree}.`,
    ],
  });
}
