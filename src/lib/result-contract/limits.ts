import type { MathJsonValidationFailure } from '../display/printer/math-json';

export const CANONICAL_RESULT_MAX_NODES = 10_000;
export const CANONICAL_RESULT_MAX_DEPTH = 64;
export const CANONICAL_RESULT_MAX_BYTES = 640_000;
export const CANONICAL_RESULT_TABLE_MAX_HEADERS = 16;
export const CANONICAL_RESULT_TABLE_MAX_ROWS = 100;

export type CanonicalResultValidationLimits = {
  maxNodes?: number;
  maxDepth?: number;
  maxBytes?: number;
};

export type CanonicalResultValidationFailure = {
  reason:
    | 'invalid-root'
    | 'unsupported-value'
    | 'non-finite-number'
    | 'non-plain-object'
    | 'cyclic-value'
    | 'node-limit'
    | 'depth-limit'
    | 'byte-limit'
    | 'invalid-shape'
    | 'invalid-math-json'
    | 'custom-math-json-operator'
    | 'unsupported-version';
  message: string;
  path?: string;
  mathJsonFailure?: MathJsonValidationFailure;
};
