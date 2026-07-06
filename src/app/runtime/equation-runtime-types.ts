import type { MathfieldElement } from 'mathlive';
import type { RefObject } from 'react';
import type {
  defaultEquationComplexRegionPanelState,
  defaultEquationNumericSolvePanelState,
} from '../logic/appUtils';
import type { EditorAnalysisControlState } from '../../lib/editor/editor-analysis-control';
import type { PendingHistoryTicketReservation } from '../../lib/ooe/job-launch/launch-tickets';
import type { WorkspaceInstanceRuntimeContext } from '../../types/calculator/workspace-instance-types';
import type { WorkspaceInstance } from './workspace-instances';
import type {
  DisplayOutcome,
  EquationScreen,
  HistoryEntry,
  ModeId,
  Settings,
  SettingsPatch,
  StoredVariableValue,
  VariableSubstitutionSnapshot,
} from '../../types/calculator';

export type ReplayVariableSubstitutions = {
  mode: ModeId;
  inputLatex: string;
  substitutions: VariableSubstitutionSnapshot[];
} | null;

export type EquationRequestKind = 'symbolic' | 'numeric-interval' | 'complex-region';

export type TransitionFn = (callback: () => void) => void;

export type EquationMenuScreen = 'home' | 'polynomialMenu' | 'simultaneousMenu';

export type CommitEquationOutcome = (
  outcome: DisplayOutcome,
  inputLatex: string,
  mode: ModeId,
  context?: Partial<Pick<
    HistoryEntry,
    | 'equationSolveTarget'
    | 'equationScreen'
    | 'equationSeed'
    | 'equationAnswerMode'
    | 'equationDomainIntent'
    | 'complexExactForm'
    | 'numericInterval'
    | 'variableSubstitutions'
  >> & {
    historyTicketId?: string | null;
    historyLaunchOrder?: number;
    suppressDisplayCommit?: boolean;
  },
) => void;

export type UseEquationRuntimeOptions = {
  activeFieldRef: RefObject<MathfieldElement | null>;
  ansLatex: string;
  commitOutcome: CommitEquationOutcome;
  currentMode: ModeId;
  currentModeRef: RefObject<ModeId>;
  discardHistoryTicket: (ticketId?: string | null) => void;
  displayOutcome: DisplayOutcome | null;
  editorAnalysisControl: EditorAnalysisControlState;
  getActiveWorkspaceInstanceRuntimeContext?: () => WorkspaceInstanceRuntimeContext | null;
  getWorkspaceInstances?: () => readonly WorkspaceInstance[];
  isLauncherOpen: boolean;
  mainFieldRef: RefObject<MathfieldElement | null>;
  openGuideArticle: (articleId: string) => void;
  openGuideMode: (modeId: 'equation') => void;
  openLauncher: () => void;
  patchSettings: (patch: SettingsPatch) => void;
  replayVariableSubstitutions: ReplayVariableSubstitutions;
  reserveHistoryTicket: (input: {
    mode: ModeId;
    inputLatex: string;
    capabilityId?: string;
    inputRevisionId?: string;
    workspaceInstance?: WorkspaceInstanceRuntimeContext | null;
  }) => PendingHistoryTicketReservation | null;
  routeToModeDestination?: (mode: ModeId, applyDestination: () => void) => boolean;
  settings: Pick<
    Settings,
    | 'angleUnit'
    | 'outputStyle'
    | 'equationAnswerMode'
    | 'equationDomainIntent'
    | 'complexExactForm'
  >;
  setDisplayOutcome: (outcome: DisplayOutcome | null) => void;
  setMode: (mode: ModeId) => void;
  setRuntimeStatusOverride: (status: string | null) => void;
  startTransition: TransitionFn;
  storedVariables: StoredVariableValue[];
  clearReplayVariableSubstitutions: () => void;
};

export type ActiveEquationRuntimeState = {
  equationLatex: string;
  equationInputLatex: string;
  equationScreen: EquationScreen;
  equationSolveTarget: string | null;
  quadraticCoefficients: number[];
  cubicCoefficients: number[];
  quarticCoefficients: number[];
  polynomialSystem2Latex: readonly [string, string];
  system2: number[][];
  system3: number[][];
  equationNumericSolvePanel: ReturnType<typeof defaultEquationNumericSolvePanelState>;
  equationComplexRegionPanel: ReturnType<typeof defaultEquationComplexRegionPanelState>;
  settings: Pick<
    Settings,
    | 'angleUnit'
    | 'outputStyle'
    | 'equationAnswerMode'
    | 'equationDomainIntent'
    | 'complexExactForm'
  >;
  ansLatex: string;
  variableMemory: StoredVariableValue[];
  replayVariableSubstitutions: ReplayVariableSubstitutions;
};
