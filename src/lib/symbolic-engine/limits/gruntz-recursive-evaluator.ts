import type {
  DisplayDetailLinePart,
  DisplayDetailSection,
  LimitTargetKind,
} from '../../../types/calculator';
import { isNodeArray } from '../patterns';
import {
  buildLimitConditionalCases,
  type LimitConditionalCaseRow,
} from './conditional-cases';
import {
  limitDetailSection,
  limitMathPart,
  limitTextPart,
} from './detail-readback';
import {
  gruntzNodeToLatex,
  type GruntzBranchAssumption,
  type GruntzCoefficientDriver,
  type GruntzMrvSetOptions,
} from './gruntz-foundation';
import {
  buildGruntzSignLimitExtractionContract,
  type GruntzSignLimitExtractionContract,
} from './gruntz-sign-extraction';
import { profileSymbolicLimitsResult } from '../../display/printer';

const GRUNTZ_RECURSIVE_DEPTH_CAP = 4;

export type GruntzRecursiveRoute =
  | 'direct-sign-extraction'
  | 'exponential-exponent'
  | 'exponential-quotient'
  | 'unsupported';

export type GruntzRecursiveEvaluatorContract = {
  supported: boolean;
  variable: string;
  route: GruntzRecursiveRoute;
  resultKind?: 'zero' | 'finite' | 'infinity' | 'casewise';
  exactLatex?: string;
  depth: number;
  sourceLatex: string;
  transformedLatex?: string;
  extraction?: GruntzSignLimitExtractionContract;
  children?: GruntzRecursiveEvaluatorContract[];
  cases?: LimitConditionalCaseRow[];
  detailSections?: DisplayDetailSection[];
  evidenceRows?: DisplayDetailLinePart[][];
  branchAssumptions?: GruntzBranchAssumption[];
  coefficientDrivers?: GruntzCoefficientDriver[];
  stopReason?: string;
};

function nodeKey(node: unknown) {
  return JSON.stringify(node);
}

function negateNode(node: unknown): unknown {
  return isNodeArray(node) && node[0] === 'Negate' && node.length === 2
    ? node[1]
    : ['Negate', node];
}

function addNode(terms: unknown[]): unknown {
  const flattened = terms.flatMap((term) =>
    isNodeArray(term) && term[0] === 'Add' ? term.slice(1) : [term]);
  const filtered = flattened.filter((term) => !(typeof term === 'number' && term === 0));
  if (filtered.length === 0) {
    return 0;
  }
  return filtered.length === 1 ? filtered[0] : ['Add', ...filtered];
}

function splitTerms(node: unknown) {
  return isNodeArray(node) && node[0] === 'Add' ? node.slice(1) : [node];
}

function subtractNodes(left: unknown, right: unknown): unknown {
  const rightTerms = splitTerms(right);
  const matchedRight = rightTerms.findIndex((term) => nodeKey(term) === nodeKey(left));
  if (matchedRight >= 0) {
    const residual = rightTerms.filter((_, index) => index !== matchedRight);
    return residual.length === 0 ? 0 : negateNode(addNode(residual));
  }

  const leftTerms = splitTerms(left);
  const remainingRight = [...rightTerms];
  const remainingLeft = leftTerms.filter((leftTerm) => {
    const match = remainingRight.findIndex((rightTerm) => nodeKey(rightTerm) === nodeKey(leftTerm));
    if (match < 0) {
      return true;
    }
    remainingRight.splice(match, 1);
    return false;
  });

  return addNode([
    ...remainingLeft,
    ...remainingRight.map(negateNode),
  ]);
}

function expExponent(node: unknown): unknown | undefined {
  return isNodeArray(node) && node[0] === 'Power' && node.length === 3 && node[1] === 'ExponentialE'
    ? node[2]
    : undefined;
}

function expFromExponentLimit(exponent: GruntzRecursiveEvaluatorContract) {
  if (!exponent.supported) {
    return undefined;
  }
  if (exponent.resultKind === 'infinity' && exponent.exactLatex === String.raw`\infty`) {
    return String.raw`\infty`;
  }
  if (exponent.resultKind === 'infinity' && exponent.exactLatex === String.raw`-\infty`) {
    return '0';
  }
  if (exponent.resultKind === 'zero' || exponent.exactLatex === '0') {
    return '1';
  }
  if (exponent.resultKind === 'finite' && exponent.exactLatex) {
    return `e^{${exponent.exactLatex}}`;
  }
  return undefined;
}

function invertInfinityLatex(latex: string | undefined) {
  if (latex === String.raw`\infty`) {
    return String.raw`-\infty`;
  }
  if (latex === String.raw`-\infty`) {
    return String.raw`\infty`;
  }
  if (latex === '0') {
    return '0';
  }
  return undefined;
}

function simplePositiveUnboundedCarrier(node: unknown, variable: string, targetKind: Exclude<LimitTargetKind, 'finite'>): boolean {
  if (targetKind !== 'posInfinity') {
    return false;
  }
  if (node === variable) {
    return true;
  }
  if (!isNodeArray(node)) {
    return false;
  }
  if (node[0] === 'Log' && node.length === 2) {
    return simplePositiveUnboundedCarrier(node[1], variable, targetKind);
  }
  if (node[0] === 'Power' && node.length === 3 && node[1] === variable && typeof node[2] === 'number' && node[2] > 0) {
    return true;
  }
  return false;
}

function simpleExponentLimitLatex(
  node: unknown,
  variable: string,
  targetKind: Exclude<LimitTargetKind, 'finite'>,
): string | undefined {
  if (simplePositiveUnboundedCarrier(node, variable, targetKind)) {
    return String.raw`\infty`;
  }
  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return invertInfinityLatex(simpleExponentLimitLatex(node[1], variable, targetKind));
  }
  return undefined;
}

function expCaseRows(exponent: GruntzRecursiveEvaluatorContract): LimitConditionalCaseRow[] | undefined {
  if (!exponent.cases) {
    return undefined;
  }
  const mapped = exponent.cases.map((row) => {
    const valueLatex =
      row.valueLatex === String.raw`\infty` ? String.raw`\infty`
        : row.valueLatex === String.raw`-\infty` ? '0'
          : row.valueLatex === '0' ? '1'
            : undefined;
    if (!valueLatex) {
      return undefined;
    }
    return {
      ...row,
      valueLatex,
      proofRows: [
        ...(row.proofRows ?? []),
        [
          limitTextPart('Exponentiating this branch gives '),
          limitMathPart(valueLatex),
          limitTextPart('.'),
        ],
      ],
    };
  });
  return mapped.every(Boolean) ? mapped as LimitConditionalCaseRow[] : undefined;
}

function recursiveSection(input: {
  route: GruntzRecursiveRoute;
  sourceLatex: string;
  transformedLatex?: string;
  resultLatex?: string;
}): DisplayDetailSection {
  const rows: DisplayDetailLinePart[][] = [[
    limitTextPart('Recursive Gruntz route: '),
    limitTextPart(input.route.replaceAll('-', ' ')),
    limitTextPart('.'),
  ]];
  rows.push([
    limitTextPart('Source: '),
    limitMathPart(input.sourceLatex),
    limitTextPart('.'),
  ]);
  if (input.transformedLatex) {
    rows.push([
      limitTextPart('Transformed: '),
      limitMathPart(input.transformedLatex),
      limitTextPart('.'),
    ]);
  }
  if (input.resultLatex) {
    rows.push([
      limitTextPart('Conclusion: '),
      limitMathPart(input.resultLatex),
      limitTextPart('.'),
    ]);
  }
  return limitDetailSection('Gruntz Recursive Evaluation', rows);
}

function mergeDetails(
  current: DisplayDetailSection,
  child?: GruntzRecursiveEvaluatorContract,
  extraction?: GruntzSignLimitExtractionContract,
) {
  return [
    current,
    ...(child?.detailSections ?? []),
    ...(extraction?.detailSections ?? []),
  ];
}

function fromDirectExtraction(input: {
  node: unknown;
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  options: GruntzMrvSetOptions;
  depth: number;
}): GruntzRecursiveEvaluatorContract | undefined {
  const extraction = buildGruntzSignLimitExtractionContract(
    input.node,
    input.variable,
    input.targetKind,
    input.options,
  );
  if (!extraction.supported) {
    return undefined;
  }
  const sourceLatex = gruntzNodeToLatex(input.node);
  return {
    supported: true,
    variable: input.variable,
    route: 'direct-sign-extraction',
    resultKind: extraction.resultKind,
    exactLatex: extraction.exactLatex,
    depth: input.depth,
    sourceLatex,
    extraction,
    cases: extraction.cases,
    detailSections: mergeDetails(recursiveSection({
      route: 'direct-sign-extraction',
      sourceLatex,
      resultLatex: extraction.exactLatex,
    }), undefined, extraction),
    evidenceRows: extraction.evidenceRows,
    branchAssumptions: extraction.branchAssumptions,
    coefficientDrivers: extraction.coefficientDrivers,
  };
}

function fromExponentialExponent(input: {
  node: unknown;
  exponent: unknown;
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  options: GruntzMrvSetOptions;
  depth: number;
}): GruntzRecursiveEvaluatorContract | undefined {
  const simpleExponentLatex = simpleExponentLimitLatex(input.exponent, input.variable, input.targetKind);
  if (simpleExponentLatex) {
    const exactLatex = simpleExponentLatex === String.raw`\infty`
      ? String.raw`\infty`
      : simpleExponentLatex === String.raw`-\infty`
        ? '0'
        : '1';
    return {
      supported: true,
      variable: input.variable,
      route: 'exponential-exponent',
      resultKind: exactLatex === '0' ? 'zero' : exactLatex === String.raw`\infty` ? 'infinity' : 'finite',
      exactLatex,
      depth: input.depth,
      sourceLatex: gruntzNodeToLatex(input.node),
      transformedLatex: gruntzNodeToLatex(input.exponent),
      detailSections: [recursiveSection(profileSymbolicLimitsResult({
        route: 'exponential-exponent',
        sourceLatex: gruntzNodeToLatex(input.node),
        transformedLatex: gruntzNodeToLatex(input.exponent),
        resultLatex: exactLatex,
      }))],
    };
  }

  const child = buildGruntzRecursiveEvaluatorContract(
    input.exponent,
    input.variable,
    input.targetKind,
    input.options,
    input.depth + 1,
  );
  const cases = expCaseRows(child);
  if (cases) {
    const builtCases = buildLimitConditionalCases({ rows: cases });
    if (!builtCases.ok) {
      return {
        supported: false,
        variable: input.variable,
        route: 'exponential-exponent',
        depth: input.depth,
        sourceLatex: gruntzNodeToLatex(input.node),
        transformedLatex: gruntzNodeToLatex(input.exponent),
        children: [child],
        cases,
        detailSections: builtCases.detailSections,
        stopReason: builtCases.error,
      };
    }
    return {
      supported: true,
      variable: input.variable,
      route: 'exponential-exponent',
      resultKind: 'casewise',
      exactLatex: builtCases.exactLatex,
      depth: input.depth,
      sourceLatex: gruntzNodeToLatex(input.node),
      transformedLatex: gruntzNodeToLatex(input.exponent),
      children: [child],
      cases,
      detailSections: [
        recursiveSection({
          route: 'exponential-exponent',
          sourceLatex: gruntzNodeToLatex(input.node),
          transformedLatex: gruntzNodeToLatex(input.exponent),
          resultLatex: builtCases.exactLatex,
        }),
        ...builtCases.detailSections,
        ...(child.detailSections ?? []),
      ],
      branchAssumptions: child.branchAssumptions,
      coefficientDrivers: child.coefficientDrivers,
    };
  }

  const exactLatex = expFromExponentLimit(child);
  if (!exactLatex) {
    return undefined;
  }
  const resultKind = exactLatex === '0' ? 'zero'
    : exactLatex === String.raw`\infty` || exactLatex === String.raw`-\infty` ? 'infinity'
      : 'finite';
  return {
    supported: true,
    variable: input.variable,
    route: 'exponential-exponent',
    resultKind,
    exactLatex,
    depth: input.depth,
    sourceLatex: gruntzNodeToLatex(input.node),
    transformedLatex: gruntzNodeToLatex(input.exponent),
    children: [child],
    detailSections: mergeDetails(recursiveSection(profileSymbolicLimitsResult({
      route: 'exponential-exponent',
      sourceLatex: gruntzNodeToLatex(input.node),
      transformedLatex: gruntzNodeToLatex(input.exponent),
      resultLatex: exactLatex,
    })), child),
    branchAssumptions: child.branchAssumptions,
    coefficientDrivers: child.coefficientDrivers,
  };
}

function fromExponentialQuotient(input: {
  node: unknown;
  variable: string;
  targetKind: Exclude<LimitTargetKind, 'finite'>;
  options: GruntzMrvSetOptions;
  depth: number;
}): GruntzRecursiveEvaluatorContract | undefined {
  if (!isNodeArray(input.node) || input.node[0] !== 'Divide' || input.node.length !== 3) {
    return undefined;
  }
  const numeratorExponent = expExponent(input.node[1]);
  const denominatorExponent = expExponent(input.node[2]);
  if (!numeratorExponent || !denominatorExponent) {
    return undefined;
  }
  const exponentDifference = subtractNodes(numeratorExponent, denominatorExponent);
  const transformedNode = ['Power', 'ExponentialE', exponentDifference];
  const child = buildGruntzRecursiveEvaluatorContract(
    transformedNode,
    input.variable,
    input.targetKind,
    input.options,
    input.depth + 1,
  );
  if (!child.supported) {
    return undefined;
  }
  return {
    supported: true,
    variable: input.variable,
    route: 'exponential-quotient',
    resultKind: child.resultKind,
    exactLatex: child.exactLatex,
    depth: input.depth,
    sourceLatex: gruntzNodeToLatex(input.node),
    transformedLatex: gruntzNodeToLatex(transformedNode),
    children: [child],
    cases: child.cases,
    detailSections: mergeDetails(recursiveSection({
      route: 'exponential-quotient',
      sourceLatex: gruntzNodeToLatex(input.node),
      transformedLatex: gruntzNodeToLatex(transformedNode),
      resultLatex: child.exactLatex,
    }), child),
    branchAssumptions: child.branchAssumptions,
    coefficientDrivers: child.coefficientDrivers,
  };
}

export function buildGruntzRecursiveEvaluatorContract(
  node: unknown,
  variable = 'x',
  targetKind: Exclude<LimitTargetKind, 'finite'> = 'posInfinity',
  options: GruntzMrvSetOptions = {},
  depth = 0,
): GruntzRecursiveEvaluatorContract {
  if (depth > GRUNTZ_RECURSIVE_DEPTH_CAP) {
    return {
      supported: false,
      variable,
      route: 'unsupported',
      depth,
      sourceLatex: gruntzNodeToLatex(node),
      stopReason: 'The recursive Gruntz evaluator reached its depth cap.',
    };
  }

  return fromDirectExtraction({ node, variable, targetKind, options, depth })
    ?? fromExponentialQuotient({ node, variable, targetKind, options, depth })
    ?? (
      expExponent(node)
        ? fromExponentialExponent({
          node,
          exponent: expExponent(node) as unknown,
          variable,
          targetKind,
          options,
          depth,
        })
        : undefined
    )
    ?? {
      supported: false,
      variable,
      route: 'unsupported',
      depth,
      sourceLatex: gruntzNodeToLatex(node),
      stopReason: 'No recursive Gruntz route supported this expression.',
    };
}
