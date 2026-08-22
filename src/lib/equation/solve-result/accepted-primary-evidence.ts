import type {
  CanonicalMathValueV1,
  SerializableMathJson,
} from '../../../types/calculator';
import { extractExactSolutions } from '../guarded/merge';
import type { EquationStageResultCarrierV1 } from './stage-carrier';

function answerNodes(mathJson: SerializableMathJson): SerializableMathJson[] {
  if (!Array.isArray(mathJson)) return [];
  if (mathJson[0] === 'Equal' && mathJson.length === 3) {
    return [mathJson[2] as SerializableMathJson];
  }
  if (
    mathJson[0] === 'Element'
    && Array.isArray(mathJson[2])
    && mathJson[2][0] === 'Set'
  ) {
    return mathJson[2].slice(1) as SerializableMathJson[];
  }
  return [];
}

function normalizeSignedAcceptedNode(node: SerializableMathJson): SerializableMathJson {
  if (
    Array.isArray(node)
    && node[0] === 'Add'
    && node.length === 3
    && typeof node[1] === 'number'
    && node[1] < 0
    && Array.isArray(node[2])
    && node[2][0] === 'Negate'
    && node[2].length === 2
  ) {
    return [
      'Subtract',
      node[2] as unknown as SerializableMathJson,
      Math.abs(node[1]),
    ] as SerializableMathJson;
  }
  return node;
}

export function acceptedPrimaryEvidence(input: {
  source: EquationStageResultCarrierV1;
  exactLatex: string | undefined;
  acceptedLatex: readonly string[];
  target: string;
}): CanonicalMathValueV1 | undefined {
  if (!input.exactLatex || input.acceptedLatex.length === 0) {
    return undefined;
  }
  const sourcePrimary = input.source.document.primaryMath;
  if (!sourcePrimary?.mathJson) {
    return undefined;
  }
  const sourceLatex = extractExactSolutions(sourcePrimary.canonicalLatex);
  const sourceNodes = answerNodes(sourcePrimary.mathJson);
  if (sourceLatex.length !== sourceNodes.length) {
    return undefined;
  }

  const nodes = input.acceptedLatex.map((latex) => {
    const index = sourceLatex.indexOf(latex);
    return index < 0 ? undefined : normalizeSignedAcceptedNode(sourceNodes[index]);
  });
  if (nodes.some((node) => node === undefined)) {
    return undefined;
  }

  return {
    canonicalLatex: input.exactLatex,
    mathJson: nodes.length === 1
      ? ['Equal', input.target, nodes[0] as SerializableMathJson]
      : ['Element', input.target, ['Set', ...nodes] as SerializableMathJson],
  };
}
