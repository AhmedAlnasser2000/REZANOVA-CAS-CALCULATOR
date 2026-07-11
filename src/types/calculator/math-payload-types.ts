import type { MathJsonExpression } from '@cortex-js/compute-engine';

export type SerializableMathJson = MathJsonExpression;

export type DisplayMathPayloadV1 = {
  version: 1;
  canonicalLatex: string;
  mathJson?: SerializableMathJson;
};
