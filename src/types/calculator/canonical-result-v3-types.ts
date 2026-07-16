import type {
  CanonicalMathValueV2,
  CanonicalResultCompoundPresentationV2,
  CanonicalResultDocumentV2,
  CanonicalResultPrimaryV2,
} from './canonical-result-v2-types';

export type CanonicalResultAngleUnitV3 = 'deg' | 'rad' | 'grad';

export type CanonicalResultAngleQuantityPrimaryV3 = {
  kind: 'angle-quantity';
  presentation: CanonicalResultCompoundPresentationV2;
  magnitude: CanonicalMathValueV2;
  unit: CanonicalResultAngleUnitV3;
};

export type CanonicalResultPrimaryV3 =
  | CanonicalResultPrimaryV2
  | CanonicalResultAngleQuantityPrimaryV3;

export type CanonicalResultDocumentV3 = Omit<
  CanonicalResultDocumentV2,
  'version' | 'primary'
> & {
  version: 3;
  primary?: CanonicalResultPrimaryV3;
};
