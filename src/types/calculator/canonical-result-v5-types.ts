import type { CanonicalMathValueV2, CanonicalResultDocumentV2 } from './canonical-result-v2-types';

/** An all-distinct-roots binder; logarithms are local complex primitives. */
export interface CanonicalRootLogTermV5 {
  rootVariable: string;
  modulus: CanonicalMathValueV2;
  weight: CanonicalMathValueV2;
  argument: CanonicalMathValueV2;
  norm: CanonicalMathValueV2;
}
export interface CanonicalRationalPrimitivePrimaryV5 {
  kind: 'rational-antiderivative';
  semantics: 'formal-local-complex';
  variable: string;
  integrationConstant: string;
  rationalPart: CanonicalMathValueV2;
  terms: CanonicalRootLogTermV5[];
  conditions: {
    sourceExclusions: CanonicalMathValueV2[];
    inputDenominator: CanonicalMathValueV2;
    rationalDenominator: CanonicalMathValueV2;
    logNorms: CanonicalMathValueV2[];
  };
}
export type CanonicalResultDocumentV5 = Omit<CanonicalResultDocumentV2, 'version' | 'primary'> & {
  version: 5;
  primary: CanonicalRationalPrimitivePrimaryV5;
};
