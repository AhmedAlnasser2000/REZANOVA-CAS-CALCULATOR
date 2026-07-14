import type { CanonicalMathValueV1, CanonicalResultDocumentV1 } from './canonical-result-types';
import type {
  CanonicalMathValueV2,
  CanonicalResultDocumentV2,
} from './canonical-result-v2-types';
import type { CanonicalResultDocumentV3 } from './canonical-result-v3-types';
import type { TransferTarget } from './execution-types';
import type { ModeId } from './mode-types';
import type { RuntimeAdvisories } from './runtime-policy-types';

export type PromptOutcome = {
  kind: 'prompt';
  title: string;
  message: string;
  targetMode: ModeId;
  carryLatex: string;
  warnings: string[];
  runtimeAdvisories?: RuntimeAdvisories;
};

export type CanonicalRuntimeActionV1 =
  | {
      kind: 'send';
      target: TransferTarget;
      math: CanonicalMathValueV1;
    }
  | {
      kind: 'load-core-draft';
      mode: 'geometry' | 'trigonometry' | 'statistics';
      math: CanonicalMathValueV1;
    };

export type CanonicalRuntimeActionV2 =
  | {
      version: 2;
      kind: 'send';
      target: TransferTarget;
      math: CanonicalMathValueV2;
    }
  | {
      version: 2;
      kind: 'load-core-draft';
      mode: 'geometry' | 'trigonometry' | 'statistics';
      math: CanonicalMathValueV2;
    };

export type CanonicalRuntimeActionV3 =
  | {
      version: 3;
      kind: 'send';
      target: TransferTarget;
      math: CanonicalMathValueV2;
    }
  | {
      version: 3;
      kind: 'load-core-draft';
      mode: 'geometry' | 'trigonometry' | 'statistics';
      math: CanonicalMathValueV2;
    };

type CanonicalRuntimeResultBase = {
  canonicalResult: CanonicalResultDocumentV1;
  actions?: CanonicalRuntimeActionV1[];
  runtimeAdvisories?: RuntimeAdvisories;
};

export type CanonicalRuntimeResultOutcome =
  | (CanonicalRuntimeResultBase & { kind: 'success' })
  | (CanonicalRuntimeResultBase & { kind: 'error' });

type CanonicalRuntimeResultBaseV2 = {
  canonicalResult: CanonicalResultDocumentV2;
  actions?: CanonicalRuntimeActionV2[];
  runtimeAdvisories?: RuntimeAdvisories;
};

export type CanonicalRuntimeResultOutcomeV2 =
  | (CanonicalRuntimeResultBaseV2 & { kind: 'success' })
  | (CanonicalRuntimeResultBaseV2 & { kind: 'error' });

type CanonicalRuntimeResultBaseV3 = {
  canonicalResult: CanonicalResultDocumentV3;
  actions?: CanonicalRuntimeActionV3[];
  runtimeAdvisories?: RuntimeAdvisories;
};

export type CanonicalRuntimeResultOutcomeV3 =
  | (CanonicalRuntimeResultBaseV3 & { kind: 'success' })
  | (CanonicalRuntimeResultBaseV3 & { kind: 'error' });

export type CanonicalRuntimeVersionedResultOutcome =
  | CanonicalRuntimeResultOutcome
  | CanonicalRuntimeResultOutcomeV2
  | CanonicalRuntimeResultOutcomeV3;

export type CanonicalRuntimeAction =
  | CanonicalRuntimeActionV1
  | CanonicalRuntimeActionV2
  | CanonicalRuntimeActionV3;

export type CanonicalRuntimeOutcome = CanonicalRuntimeVersionedResultOutcome | PromptOutcome;
