import type { CanonicalMathValueV1, CanonicalResultDocumentV1 } from './canonical-result-types';
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

export type CanonicalRuntimeResultOutcome = {
  kind: 'success' | 'error';
  canonicalResult: CanonicalResultDocumentV1;
  actions?: CanonicalRuntimeActionV1[];
  runtimeAdvisories?: RuntimeAdvisories;
};

export type CanonicalRuntimeOutcome = CanonicalRuntimeResultOutcome | PromptOutcome;
