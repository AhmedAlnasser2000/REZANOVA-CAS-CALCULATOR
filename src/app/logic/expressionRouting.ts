import type { CalculateScreen, EquationScreen, ModeId } from '../../types/calculator';
import { canonicalizeMathInput } from '../../lib/input/input-canonicalization';
import { isCalculusMode } from '../../lib/calculus/calculus-identity';
import { readMathClipboard } from '../../lib/clipboard';

type ActiveExpressionContext = {
  isLauncherOpen: boolean;
  isEquationMenuOpen: boolean;
  isTrigMenuOpen: boolean;
  isStatisticsMenuOpen: boolean;
  currentMode: ModeId;
  calculateScreen: CalculateScreen;
  calculateLatex: string;
  calculateWorkbenchExpressionLatex: string;
  equationInputLatex: string;
  isCalculusMenuOpen: boolean;
  calculusWorkbenchExpression: string;
  trigDraftLatex: string;
  statisticsDraftLatex: string;
  geometryDraftLatex: string;
  tablePrimaryLatex: string;
};

type EditExpressionDeps = {
  currentMode: ModeId;
  focusTrigEditor: () => void;
  focusStatisticsEditor: () => void;
  focusGeometryEditor: () => void;
  setClipboardNotice: (notice: string) => void;
  loadLatexIntoEditor: (latex: string) => void;
  getActiveExpressionLatex: () => string;
};

type PasteIntoEditorDeps = {
  isLauncherOpen: boolean;
  currentMode: ModeId;
  geometryEditorIsEditable: boolean;
  statisticsEditorIsEditable: boolean;
  trigEditorIsEditable: boolean;
  equationScreen: EquationScreen;
  activeFieldRef: { current: { focus?: (options?: FocusOptions) => void; insert: (text: string) => void } | null };
  geometryDraftFieldRef: { current: { insert: (text: string) => void } | null };
  statisticsDraftFieldRef: { current: { insert: (text: string) => void } | null };
  trigDraftFieldRef: { current: { insert: (text: string) => void } | null };
  focusGeometryEditor: () => void;
  focusStatisticsEditor: () => void;
  focusTrigEditor: () => void;
  setClipboardNotice: (notice: string) => void;
  loadLatexIntoEditor: (latex: string) => void;
  canonicalizePastedText?: (
    text: string,
    mode: ModeId,
  ) => string | null | undefined | Promise<string | null | undefined>;
  screenHint?: string;
  readClipboard?: typeof readMathClipboard;
};

async function canonicalizePastedMathText(
  text: string,
  mode: ModeId,
  screenHint?: string,
  customCanonicalize?: (
    text: string,
    mode: ModeId,
  ) => string | null | undefined | Promise<string | null | undefined>,
) {
  if (customCanonicalize) {
    return await customCanonicalize(text, mode) ?? text;
  }

  const canonicalized = canonicalizeMathInput(text, {
    mode,
    screenHint: screenHint ?? (mode === 'equation'
      ? 'symbolic'
      : isCalculusMode(mode)
        ? 'integrals'
        : 'standard'),
    liveAssist: true,
  });

  return canonicalized.ok ? canonicalized.canonicalLatex : text;
}

export function activeExpressionLatexFromContext(context: ActiveExpressionContext) {
  if (
    context.isLauncherOpen
    || context.isEquationMenuOpen
    || context.isTrigMenuOpen
    || context.isStatisticsMenuOpen
  ) {
    return '';
  }

  if (context.currentMode === 'calculate') {
    return context.calculateScreen === 'standard'
      ? context.calculateLatex
      : context.calculateWorkbenchExpressionLatex;
  }

  if (context.currentMode === 'equation') {
    return context.equationInputLatex;
  }

  if (isCalculusMode(context.currentMode)) {
    return context.isCalculusMenuOpen ? '' : context.calculusWorkbenchExpression;
  }

  if (context.currentMode === 'trigonometry') {
    return context.trigDraftLatex;
  }

  if (context.currentMode === 'statistics') {
    return context.statisticsDraftLatex;
  }

  if (context.currentMode === 'geometry') {
    return context.geometryDraftLatex;
  }

  if (context.currentMode === 'table') {
    return context.tablePrimaryLatex;
  }

  return '';
}

export function editActiveExpressionWithDeps(deps: EditExpressionDeps) {
  if (deps.currentMode === 'trigonometry') {
    deps.focusTrigEditor();
    deps.setClipboardNotice('Trigonometry editor focused');
    return;
  }

  if (deps.currentMode === 'statistics') {
    deps.focusStatisticsEditor();
    deps.setClipboardNotice('Statistics editor focused');
    return;
  }

  if (deps.currentMode === 'geometry') {
    deps.focusGeometryEditor();
    deps.setClipboardNotice('Geometry editor focused');
    return;
  }

  deps.loadLatexIntoEditor(deps.getActiveExpressionLatex());
}

export async function pasteIntoEditorWithDeps(deps: PasteIntoEditorDeps) {
  let readResult;
  try {
    readResult = await (deps.readClipboard ?? readMathClipboard)();
  } catch {
    deps.setClipboardNotice('Clipboard blocked');
    return;
  }
  const text = readResult.ok ? readResult.canonicalLatex : readResult.textFallback;
  if (!text?.trim()) {
    deps.setClipboardNotice(
      !readResult.ok && readResult.reason === 'blocked' ? 'Clipboard blocked' : 'Paste unavailable',
    );
    return;
  }

  try {
    const mathText = readResult.ok && readResult.source !== 'text'
      ? text
      : await canonicalizePastedMathText(
          text,
          deps.currentMode,
          deps.screenHint,
          deps.canonicalizePastedText,
        );
    if (
      !deps.isLauncherOpen
      && (deps.currentMode === 'calculate'
        || isCalculusMode(deps.currentMode)
        || deps.currentMode === 'matrix'
        || deps.currentMode === 'vector'
        || deps.currentMode === 'trigonometry'
        || (deps.currentMode === 'geometry' && deps.geometryEditorIsEditable)
        || deps.currentMode === 'statistics'
        || (deps.currentMode === 'equation' && deps.equationScreen === 'symbolic'))
      && deps.activeFieldRef.current
    ) {
      deps.activeFieldRef.current.focus?.({ preventScroll: true });
      deps.activeFieldRef.current.insert(mathText);
      deps.setClipboardNotice('Pasted into editor');
      return;
    }

    if (deps.currentMode === 'geometry' && deps.geometryEditorIsEditable) {
      deps.focusGeometryEditor();
      deps.geometryDraftFieldRef.current?.insert(mathText);
      deps.setClipboardNotice('Pasted into Geometry editor');
      return;
    }

    if (deps.currentMode === 'statistics' && deps.statisticsEditorIsEditable) {
      deps.focusStatisticsEditor();
      deps.statisticsDraftFieldRef.current?.insert(mathText);
      deps.setClipboardNotice('Pasted into Statistics editor');
      return;
    }

    if (deps.currentMode === 'trigonometry' && deps.trigEditorIsEditable) {
      deps.focusTrigEditor();
      deps.trigDraftFieldRef.current?.insert(mathText);
      deps.setClipboardNotice('Pasted into Trigonometry editor');
      return;
    }

    deps.loadLatexIntoEditor(mathText);
  } catch {
    deps.setClipboardNotice('Clipboard blocked');
  }
}
