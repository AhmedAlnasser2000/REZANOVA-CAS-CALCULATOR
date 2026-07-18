import type {
  DisplayAnswerRowsReadback,
  SerializableMathJson,
} from '../../../types/calculator';
import { createEquationResultOutcome } from './producer';
import {
  createEquationFiniteRootSuccessOutcome as createFrozenEquationFiniteRootSuccessOutcome,
  type EquationFiniteRootSuccessInput,
} from './finite-root-producer';
import {
  equationMathValuesWithOwnedReadback,
  equationOwnedMathJsonLeavesFromDocument,
} from './owned-readback-math';
import type { CanonicalResultProducerOptionsV1 } from '../../result-contract';

function nodeArray(value: SerializableMathJson): SerializableMathJson[] | undefined {
  return Array.isArray(value) ? value as SerializableMathJson[] : undefined;
}

function finiteRootRows(input: EquationFiniteRootSuccessInput): {
  answerRows: DisplayAnswerRowsReadback;
  leaves: Array<{ canonicalLatex: string; mathJson: SerializableMathJson; source: string }>;
} | undefined {
  const branchReadback = input.branchReadback;
  const root = input.primaryMath.mathJson;
  if (!branchReadback || root === undefined) return undefined;
  const node = nodeArray(root);
  if (!node) return undefined;

  const branches = branchReadback.relationLatex === '\\in'
    && node[0] === 'Element'
    && node.length === 3
    && nodeArray(node[2])?.[0] === 'Set'
      ? { target: node[1] as SerializableMathJson, values: nodeArray(node[2])!.slice(1) }
      : branchReadback.relationLatex === '='
        && node[0] === 'Equal'
        && node.length === 3
          ? { target: node[1] as SerializableMathJson, values: [node[2] as SerializableMathJson] }
          : undefined;
  if (!branches || branches.values.length !== branchReadback.branchesLatex.length) return undefined;

  return {
    answerRows: {
      label: branchReadback.label ?? 'Exact roots',
      rows: branchReadback.branchesLatex.map((branch) => ({
        latex: `${branchReadback.targetLatex}=${branch}`,
      })),
    },
    leaves: branches.values.map((branch, index) => ({
      canonicalLatex: `${branchReadback.targetLatex}=${branchReadback.branchesLatex[index]}`,
      mathJson: ['Equal', branches.target, branch],
      source: `equation-finite-root-answer-row:${index}`,
    })),
  };
}

export function createEquationFiniteRootSuccessOutcome(
  input: EquationFiniteRootSuccessInput,
  options: CanonicalResultProducerOptionsV1 = {},
) {
  const frozen = createFrozenEquationFiniteRootSuccessOutcome(input, options);
  const rows = finiteRootRows(input);
  if (!rows) return frozen;
  const outcome = { ...frozen, answerRows: rows.answerRows };
  return createEquationResultOutcome(outcome, {
    mathValues: equationMathValuesWithOwnedReadback({
      outcome,
      routeId: input.mathJsonRouteId,
      leaves: [
        ...equationOwnedMathJsonLeavesFromDocument(
          frozen.canonicalResult,
          'equation-finite-root-frozen-document',
        ),
        ...rows.leaves,
      ],
    }),
  });
}

export type { EquationFiniteRootSuccessInput } from './finite-root-producer';
