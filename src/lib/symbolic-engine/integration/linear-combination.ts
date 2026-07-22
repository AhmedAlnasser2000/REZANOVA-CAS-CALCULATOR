import { ComputeEngine } from '@cortex-js/compute-engine';
import { addAntiderivativeExpressions } from '../../calculus/engine/antiderivative-expression';
import { flattenAdd, isNodeArray } from '../patterns';
import {
  integrationDetailSection,
  integrationMathRow,
  integrationTextRow,
} from './detail-readback';
import { negateGeneratedLatex } from './generated-latex';
import { symbolicSuccess, unsupportedCandidateMetadata } from './metadata';
import type { IntegralResolution, IntegralStrategy } from './types';

const ce = new ComputeEngine();
const LINEAR_COMBINATION_TERM_CAP = 6;

type SignedTerm = {
  node: unknown;
  sign: 1 | -1;
};

type RouteTerm = (
  node: unknown,
  variable: string,
  recognitionGates: boolean,
) => IntegralResolution | undefined;

function signedAddTerms(node: unknown, sign: 1 | -1 = 1): SignedTerm[] {
  if (isNodeArray(node) && node[0] === 'Add') {
    return flattenAdd(node).flatMap((term) => signedAddTerms(term, sign));
  }

  if (isNodeArray(node) && node[0] === 'Subtract') {
    const [first, ...rest] = node.slice(1);
    return [
      ...(first === undefined ? [] : signedAddTerms(first, sign)),
      ...rest.flatMap((term) => signedAddTerms(term, sign === 1 ? -1 : 1)),
    ];
  }

  if (isNodeArray(node) && node[0] === 'Negate' && node.length === 2) {
    return signedAddTerms(node[1], sign === 1 ? -1 : 1);
  }

  return [{ node, sign }];
}

function combineSignedLatex(parts: Array<{ latex: string; sign: 1 | -1 }>) {
  return parts.map((part, index) => {
    const latex = part.sign === 1 ? part.latex : negateGeneratedLatex(part.latex);
    return index === 0 || latex.startsWith('-') ? latex : `+${latex}`;
  }).join('');
}

function dominantStrategy(strategies: IntegralStrategy[]): IntegralStrategy {
  const [first] = strategies;
  return strategies.every((strategy) => strategy === first)
    ? first
    : strategies.every((strategy) => strategy === 'direct-rule' || strategy === 'affine-linear')
      ? 'direct-rule'
      : strategies.includes('u-substitution')
        ? 'u-substitution'
        : 'integration-by-parts';
}

function mergeSupplementLatex(results: IntegralResolution[]) {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const result of results) {
    if (result.kind !== 'success') {
      continue;
    }
    for (const line of result.exactSupplementLatex ?? []) {
      if (seen.has(line)) {
        continue;
      }
      seen.add(line);
      merged.push(line);
    }
  }
  return merged.length > 0 ? merged : undefined;
}

function mergeDetailSections(results: IntegralResolution[]) {
  const merged = results
    .flatMap((result) => result.kind === 'success' ? (result.detailSections ?? []) : []);
  return merged.length > 0 ? merged : undefined;
}

function mergeFactNodes(results: IntegralResolution[]) {
  const merged = results
    .flatMap((result) => result.kind === 'success' ? (result.factNodes ?? []) : []);
  return merged.length > 0 ? merged : undefined;
}

function mergeDetailNodes(results: IntegralResolution[]) {
  const merged = results
    .flatMap((result) => result.kind === 'success' ? (result.detailNodes ?? []) : []);
  return merged.length > 0 ? merged : undefined;
}

function combineNativeAntiderivatives(
  results: Array<Extract<IntegralResolution, { kind: 'success' }>>,
  terms: Array<{ node: unknown; sign: 1 | -1 }>,
) {
  const nativeTerms: Parameters<typeof addAntiderivativeExpressions>[0]['terms'] = [];
  for (const [index, result] of results.entries()) {
    if (!result.antiderivativeExpression) {
      return undefined;
    }
    nativeTerms.push({
      expression: result.antiderivativeExpression,
      sign: terms[index].sign,
    });
  }
  return addAntiderivativeExpressions({
    terms: nativeTerms,
    source: 'calculus.integration:linear-combination',
  });
}

export function tryLinearCombinationFallback(
  node: unknown,
  variable: string,
  recognitionGates: boolean,
  routeTerm: RouteTerm,
): IntegralResolution | undefined {
  if (!isNodeArray(node) || (node[0] !== 'Add' && node[0] !== 'Subtract')) {
    return undefined;
  }

  const terms = signedAddTerms(node);
  if (terms.length < 2 || terms.length > LINEAR_COMBINATION_TERM_CAP) {
    return undefined;
  }

  const results: Array<Extract<IntegralResolution, { kind: 'success' }>> = [];
  const blockedTerms: string[] = [];
  for (const term of terms) {
    const result = routeTerm(term.node, variable, recognitionGates);
    if (!result || result.kind !== 'success') {
      blockedTerms.push(`${term.sign === -1 ? '-' : ''}${ce.box(term.node as Parameters<typeof ce.box>[0]).latex}`);
      continue;
    }
    results.push(result);
  }

  if (blockedTerms.length > 0) {
    return {
      kind: 'error',
      error: 'This antiderivative could not be determined symbolically in this milestone.',
      candidate: unsupportedCandidateMetadata(node, variable),
      detailSections: [integrationDetailSection('Integration Term Plan', [
        integrationTextRow(`Resolved terms: ${results.length}`),
        integrationMathRow('Blocked terms: ', blockedTerms.join(', ')),
        integrationTextRow('Calcwiz does not present a partial antiderivative as a complete answer.'),
      ])],
    };
  }

  const exactLatex = combineSignedLatex(
    results.map((result, index) => ({
      latex: result.exactLatex,
      sign: terms[index].sign,
    })),
  );
  const antiderivativeExpression = combineNativeAntiderivatives(results, terms);
  return symbolicSuccess(
    node,
    variable,
    exactLatex,
    dominantStrategy(results.map((result) => result.strategy)),
    {
      status: 'verified-exact',
      reason: 'verified by internal Risch-Norman linear-combination rule proof',
    },
    mergeSupplementLatex(results),
    mergeDetailSections(results),
    antiderivativeExpression,
    mergeFactNodes(results),
    mergeDetailNodes(results),
    'precomputed-exact',
  );
}
