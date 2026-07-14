import type {
  CanonicalMathValueV2,
  CanonicalResultCompoundPresentationV2,
  CanonicalResultDocumentV2,
  CanonicalResultPrimaryV2,
} from './canonical-result-v2-types';
import type { CanonicalResultDocumentV1 } from './canonical-result-types';

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

export type CanonicalResultDocument =
  | CanonicalResultDocumentV1
  | CanonicalResultDocumentV2
  | CanonicalResultDocumentV3;

export type CanonicalResultVersion = CanonicalResultDocument['version'];
