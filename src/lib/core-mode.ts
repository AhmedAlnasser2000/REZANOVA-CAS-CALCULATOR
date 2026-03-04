import type {
  CoreDraftSource,
  CoreDraftState,
  CoreDraftStyle,
} from '../types/calculator';

export function createCoreDraftState(
  rawLatex = '',
  style: CoreDraftStyle = 'structured',
  source: CoreDraftSource = 'guided',
  executable = true,
): CoreDraftState {
  return {
    rawLatex,
    style,
    source,
    executable,
  };
}

export function isCoreDraftEditable(state: CoreDraftState) {
  return state.executable;
}
