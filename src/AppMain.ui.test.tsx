import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_ANALYSIS_DEBOUNCE_MS } from './lib/editor/editor-analysis-runtime';
import { WEB_PREVIEW_APP_STATE_STORAGE_KEY } from './lib/app-state/tauri';
import { DEFAULT_SETTINGS, type HistoryEntry } from './types/calculator';
import { historyEntryFixture } from './test-utils/history-result-document';
import { displayedDetailLatex, displayedSupplementLatex, revealDetailSection, revealValidWhenIfCollapsed } from './test/displayResultAssertions';
import {
  expectMathStaticLatex,
  openCalculusTool,
  openLauncherApp,
  openEquationSymbolic,
  openGeometrySlope,
  openTable,
  openStatisticsRegression,
  renderAppMain,
  setMathFieldLatex,
  setVisibleSecondaryMathFieldLatex,
} from './test/renderAppMain';
function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  fireEvent(window, new Event('resize'));
}

async function waitForAlgebraTransform(action: string) {
  const testId = `algebra-transform-${action}`;
  await waitFor(() => expect(screen.getByTestId(testId)).toBeInTheDocument());
  return screen.getByTestId(testId);
}

async function waitForDisplayQueueToSettle() {
  await waitFor(() => {
    expect(screen.getByTestId('display-status')).not.toHaveTextContent('Rendering result');
  });
}

async function waitForDisplayOutcomeSuccess() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument(), { timeout: 5_000 });
  await waitForDisplayQueueToSettle();
}

async function waitForDisplayOutcomeError() {
  await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toBeInTheDocument());
  await waitForDisplayQueueToSettle();
}

async function waitPastEditorAnalysisDebounce() {
  await new Promise((resolve) => {
    window.setTimeout(resolve, EDITOR_ANALYSIS_DEBOUNCE_MS + 80);
  });
}

function getDisplayedExactRawLatex() {
  const branchList = screen.queryByTestId('display-outcome-exact-branch-list');
  if (branchList) {
    return Array.from(branchList.querySelectorAll('[data-testid^="display-outcome-exact-branch-"]'))
      .filter((node) => /^display-outcome-exact-branch-\d+$/u.test(
        node.getAttribute('data-testid') ?? '',
      ))
      .map((node) => (
        node.getAttribute('data-raw-latex')
        ?? node.querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex')
        ?? ''
      ));
  }

  const exact = screen.getByTestId('display-outcome-exact');
  return Array.from(exact.querySelectorAll('[data-raw-latex]'))
    .map((node) => node.getAttribute('data-raw-latex') ?? '')
    .filter((latex) => latex.length > 0);
}
function expectAnyExactBranchLatex(expected: RegExp | string) {
  const exactLatex = getDisplayedExactRawLatex();
  expect(exactLatex.length).toBeGreaterThan(0);
  expect(exactLatex.some((latex) => (
    typeof expected === 'string' ? latex === expected : expected.test(latex)
  ))).toBe(true);
}

describe('AppMain UI automation flows', () => {
  beforeEach(() => {
    setViewportWidth(1366);
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('starts Calculate with an empty editor and readable placeholder text', async () => {
    await renderAppMain();

    const editor = screen.getByTestId('main-editor') as HTMLElement & { getValue: () => string };
    expect(editor.getValue()).toBe('');
    expect(editor).toHaveAttribute('data-placeholder', 'Enter an expression');
  });

  it('restores durable calculator memory but starts with a clean editor session', async () => {
    const historyEntry: HistoryEntry = historyEntryFixture({
      id: 'memory-history',
      mode: 'equation',
      inputLatex: 'x+1=2',
      resultLatex: 'x=1',
      equationSolveTarget: 'x',
      timestamp: '2026-05-25T00:00:00Z',
    });
    window.localStorage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      history: [historyEntry],
      variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
      calculatorMemory: {
        version: 1,
        savedAt: '2026-05-25T00:00:00Z',
        currentMode: 'equation',
        previousNonGuideMode: 'equation',
        settings: DEFAULT_SETTINGS,
        history: [historyEntry],
        variableMemory: [{ name: 'a', valueLatex: '5', numericValue: 5 }],
        ansLatex: 'x=1',
        displayOutcome: {
          kind: 'success',
          title: 'Symbolic',
          exactLatex: 'x=1',
          warnings: [],
        },
        session: {
          equation: {
            latex: 'x+1=2',
            screen: 'symbolic',
          },
        },
      },
    }));

    const { user } = await renderAppMain();

    const editor = screen.getByTestId('main-editor') as HTMLElement & { getValue: () => string };
    await waitFor(() => expect(editor.getValue()).toBe(''));
    expect(screen.queryByTestId('display-outcome-success')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('variables-toggle'));
    expect(await screen.findByTestId('variables-entry')).toHaveTextContent('a');
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await user.click(screen.getByTestId('history-toggle'));
    expect(await screen.findAllByTestId('history-entry')).toHaveLength(1);
  });

  it('flushes dirty calculator memory on close and reset controls clear the intended state', async () => {
    await renderAppMain();

    await waitFor(() => {
      fireEvent(window, new Event('beforeunload'));
      const initializedState = JSON.parse(window.localStorage.getItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY) ?? '{}') as { calculatorMemory?: unknown };
      expect(initializedState.calculatorMemory).toBeTruthy();
    });

    setMathFieldLatex('main-editor', '2+2');
    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '2+2'));
    fireEvent(window, new Event('beforeunload'));

    const savedState = JSON.parse(
      window.localStorage.getItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY) ?? '{}',
    ) as { calculatorMemory?: { displayOutcome?: unknown; session?: Record<string, unknown> } };
    expect(savedState.calculatorMemory?.displayOutcome).toBeNull();
    expect(savedState.calculatorMemory?.session).toEqual({});

    fireEvent.click(screen.getByTestId('soft-action-simplify'));
    await waitFor(() => expect(screen.getByTestId('history-toggle')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    fireEvent.click(screen.getByTestId('settings-reset-history'));
    fireEvent.click(screen.getByTestId('history-toggle'));
    expect(await screen.findByText(/No stored history yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    fireEvent.click(screen.getByTestId('settings-reset-calculator-memory'));
    await waitFor(() => {
      const editor = screen.getByTestId('main-editor') as HTMLElement & { getValue: () => string };
      expect(editor.getValue()).toBe('');
    });
  });

  it('opens the settings panel from the top bar and toggles it with Ctrl+,', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));

    const shell = screen.getByTestId('calculator-shell');
    const settingsPanel = await screen.findByTestId('settings-panel');
    expect(settingsPanel).toHaveAttribute('data-settings-presentation', 'outboard');
    expect(screen.getByTestId('side-surface-host')).toHaveAttribute(
      'data-side-surface-presentation',
      'outboard',
    );
    expect(shell.contains(settingsPanel)).toBe(false);

    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    fireEvent.keyDown(window, { key: ',', ctrlKey: true });
    await waitFor(() => expect(screen.getByTestId('settings-panel')).toBeInTheDocument());
  });

  it('renders the settings surface as an overlay on narrow layouts', async () => {
    setViewportWidth(1024);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));

    expect(await screen.findByTestId('settings-panel')).toHaveAttribute(
      'data-settings-presentation',
      'overlay',
    );
    expect(screen.getByTestId('side-surface-overlay-backdrop')).toBeInTheDocument();
  });

  it('renders the variables surface as an overlay on narrow layouts', async () => {
    setViewportWidth(1024);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('variables-toggle'));

    expect(await screen.findByTestId('variables-panel')).toHaveAttribute(
      'data-variables-presentation',
      'overlay',
    );
    expect(screen.getByTestId('side-surface-overlay-backdrop')).toBeInTheDocument();
  });

  it('hides the dev OOE diagnostics surface unless the diagnostics flag is enabled', async () => {
    await renderAppMain();

    expect(screen.queryByTestId('ooe-diagnostics-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ooe-diagnostics-panel')).not.toBeInTheDocument();
  });

  it('opens the dev OOE diagnostics surface when the diagnostics flag is enabled', async () => {
    vi.stubEnv('VITE_SHOW_OOE_DIAGNOSTICS', '1');
    setViewportWidth(1024);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('ooe-diagnostics-toggle'));

    expect(await screen.findByTestId('ooe-diagnostics-panel')).toHaveAttribute(
      'data-ooe-diagnostics-presentation',
      'overlay',
    );
    expect(screen.getByTestId('side-surface-overlay-backdrop')).toBeInTheDocument();

    await user.click(within(screen.getByTestId('ooe-diagnostics-panel')).getByRole('button', {
      name: /close/i,
    }));
    await waitFor(() => {
      expect(screen.queryByTestId('ooe-diagnostics-panel')).not.toBeInTheDocument();
    });
  });

  it('opens Menu in the left inspector without hiding the active editor', async () => {
    setViewportWidth(1024);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('keypad-menu'));

    expect(await screen.findByTestId('left-menu-inspector')).toHaveAttribute(
      'data-left-inspector-presentation',
      'overlay',
    );
    expect(screen.getByTestId('main-editor')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /core/i }));
    await user.click(await screen.findByRole('button', { name: /^\d*\s*equation/i }));
    await waitFor(() => expect(document.querySelector('.equation-menu-list')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByTestId('left-menu-inspector')).not.toBeInTheDocument());
  });

  it('routes keypad layers and lock while preserving one-shot reset behavior', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('keypad-layer-shift'));
    expect(screen.getByTestId('keypad-layer-shift')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('keypad-layer-lock'));
    await user.click(screen.getByTestId('keypad-1'));
    expect(screen.getByTestId('keypad-layer-shift')).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByTestId('keypad-layer-lock'));
    await user.click(screen.getByTestId('keypad-layer-alpha'));
    await user.click(screen.getByTestId('keypad-2'));
    expect(screen.getByTestId('keypad-layer-base')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '!p');
  });

  it('maps physical modifier keys to momentary keypad layers', async () => {
    const { user } = await renderAppMain();

    fireEvent.keyDown(window, { key: 'Shift' });
    expect(screen.getByTestId('keypad-layer-shift')).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByTestId('keypad-3'));
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '\\sqrt[3]{#0}');
    fireEvent.keyUp(window, { key: 'Shift' });
    expect(screen.getByTestId('keypad-layer-base')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'Alt' });
    expect(screen.getByTestId('keypad-layer-alpha')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyUp(window, { key: 'Alt' });
    expect(screen.getByTestId('keypad-layer-base')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(window, { key: 'Control' });
    expect(screen.getByTestId('keypad-layer-ctrl')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyUp(window, { key: 'Control' });
    expect(screen.getByTestId('keypad-layer-base')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps settings and history mutually exclusive', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    await user.click(screen.getByTestId('history-toggle'));
    const shell = screen.getByTestId('calculator-shell');
    const historyPanel = await screen.findByTestId('history-panel');
    expect(historyPanel).toHaveAttribute('data-history-presentation', 'outboard');
    expect(shell.contains(historyPanel)).toBe(false);
    expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    expect(screen.queryByTestId('history-panel')).not.toBeInTheDocument();
  });

  it('deletes one history entry without clearing all history', async () => {
    const firstEntry: HistoryEntry = historyEntryFixture({
      id: 'delete-me',
      mode: 'calculate',
      inputLatex: '1+1',
      resultLatex: '2',
      timestamp: '2026-05-29T00:00:00Z',
    });
    const secondEntry: HistoryEntry = historyEntryFixture({
      id: 'keep-me',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      timestamp: '2026-05-29T00:00:01Z',
    });
    window.localStorage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'calculate',
      settings: DEFAULT_SETTINGS,
      history: [firstEntry, secondEntry],
      variableMemory: [],
      calculatorMemory: null,
    }));
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('history-toggle'));
    const entries = await screen.findAllByTestId('history-entry');
    await user.click(within(entries[0]).getByTestId('history-entry-delete'));

    await waitFor(() => expect(screen.getAllByTestId('history-entry')).toHaveLength(1));
    const persisted = JSON.parse(
      window.localStorage.getItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY) ?? '{}',
    ) as { history?: HistoryEntry[] };
    expect(persisted.history?.map((entry) => entry.id)).toEqual(['delete-me']);
  });

  it('restores many history entries as compact cards after bootstrap', async () => {
    const restoredHistory: HistoryEntry[] = Array.from({ length: 36 }, (_, index) => historyEntryFixture({
      id: `restored-${index}`,
      mode: index % 2 === 0 ? 'equation' : 'calculate',
      inputLatex: index % 2 === 0 ? `x+${index}=5` : `${index}+1`,
      resultLatex: index % 2 === 0 ? `x=${5 - index}` : `${index + 1}`,
      exactSupplementLatex: index % 3 === 0 ? [`x\\ne${index}`] : undefined,
      timestamp: `2026-06-03T00:00:${String(index).padStart(2, '0')}Z`,
    }));
    window.localStorage.setItem(WEB_PREVIEW_APP_STATE_STORAGE_KEY, JSON.stringify({
      currentMode: 'equation',
      settings: DEFAULT_SETTINGS,
      history: restoredHistory,
      variableMemory: [],
      calculatorMemory: null,
    }));
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('history-toggle'));
    const entries = await screen.findAllByTestId('history-entry');
    expect(entries).toHaveLength(20);
    expect(screen.queryByTestId('history-entry-expanded')).not.toBeInTheDocument();
    for (const entry of entries.slice(0, 6)) {
      expect(within(entry).getByTestId('history-entry-preview')).toBeInTheDocument();
      expect(within(entry).queryByText('Valid when')).not.toBeInTheDocument();
    }

    await user.click(within(entries[0]).getByTestId('history-entry-delete'));
    await waitFor(() => expect(screen.getAllByTestId('history-entry')).toHaveLength(20));
  });

  it('stores Calculate variables visibly and replays with the original substitution snapshot', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('variables-toggle'));
    await screen.findByTestId('variables-panel');
    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'a' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '4' } });
    await user.click(screen.getByTestId('variables-set-button'));
    expect(await screen.findByTestId('variables-entry')).toHaveTextContent('a');

    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));
    setMathFieldLatex('main-editor', 'a+1');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '5');
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent('Stored Values');
    await waitFor(() => expect(displayedDetailLatex()).toContain('a=4'));

    await user.click(screen.getByTestId('variables-toggle'));
    fireEvent.change(await screen.findByTestId('variables-name-input'), { target: { value: 'a' } });
    fireEvent.change(await screen.findByTestId('variables-value-input'), { target: { value: '9' } });
    await user.click(screen.getByTestId('variables-set-button'));
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '5');
    expect(revealDetailSection('display-outcome-detail-section-0', 'Stored Values')).toBe(true);
    await waitFor(() => expect(displayedDetailLatex()).toContain('a=4'), { timeout: 5000 });
  });
  it('shows semantic variable hints near the active editor', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('variables-toggle'));
    await screen.findByTestId('variables-panel');
    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'z' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '8' } });
    await user.click(screen.getByTestId('variables-set-button'));
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+z=5');

    await waitFor(() => expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('target'));
    const hints = screen.getByTestId('variable-hint-strip');
    expect(hints).toHaveTextContent('target');
    expect(hints).toHaveTextContent('stored ignored');
    expect(hints).toHaveTextContent('x');
    expect(hints).toHaveTextContent('z');
  });

  it('renders editor runtime controls in editor-capable modes', async () => {
    await renderAppMain();

    const controls = screen.getByTestId('editor-runtime-controls');
    expect(within(controls).getByTestId('editor-runtime-run')).toHaveAttribute(
      'title',
      'Run the current editor input and resume editor analysis.',
    );
    expect(within(controls).getByTestId('editor-runtime-stop')).toHaveAttribute(
      'title',
      'Pause editor analysis and request stop for the current runtime lane.',
    );
    expect(within(controls).getByTestId('editor-runtime-restart')).toHaveAttribute(
      'title',
      'Clear and remount the active editor, then restart editor analysis.',
    );
  });

  it('backs out of Equation Home with the Back soft button and Escape', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Core', 'Equation');

    expect(screen.getAllByText('Equation Home').length).toBeGreaterThan(0);
    expect(screen.getByTestId('soft-action-back')).toHaveTextContent('Back');

    await user.click(screen.getByTestId('soft-action-back'));
    await waitFor(() => expect(document.querySelector('.launcher-panel')).toBeInTheDocument());

    let launcherPanel = document.querySelector('.launcher-panel') as HTMLElement;
    await user.click(within(launcherPanel).getByRole('button', { name: /core/i }));
    await waitFor(() => {
      const activeLauncherPanel = document.querySelector('.launcher-panel') as HTMLElement;
      expect(within(activeLauncherPanel).getByRole('button', { name: /^\d*\s*equation/i })).toBeInTheDocument();
    });
    launcherPanel = document.querySelector('.launcher-panel') as HTMLElement;
    await user.click(within(launcherPanel).getByRole('button', { name: /^\d*\s*equation/i }));

    await waitFor(() => expect(screen.getByTestId('soft-action-back')).toBeInTheDocument());
    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => expect(document.querySelector('.launcher-panel')).toBeInTheDocument());
  });

  it('stops deferred editor preview and hints, then restart clears the active editor', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x+a');

    await waitFor(() => {
      expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('x');
      expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('a');
    });
    await waitFor(() => expect(screen.getByLabelText('x+a')).toBeInTheDocument());

    await user.click(screen.getByTestId('editor-runtime-stop'));
    setMathFieldLatex('main-editor', 'y+b');

    await waitFor(() => {
      expect(screen.getByTestId('display-status')).toHaveTextContent('Editor analysis stopped');
      expect(screen.getByTestId('variable-hint-strip')).toHaveAttribute(
        'data-editor-analysis-status',
        'stopped',
      );
    });
    await waitPastEditorAnalysisDebounce();

    const frozenHints = screen.getByTestId('variable-hint-strip');
    expect(frozenHints).toHaveTextContent('x');
    expect(frozenHints).toHaveTextContent('a');
    expect(frozenHints).not.toHaveTextContent('y');
    expect(frozenHints).not.toHaveTextContent('b');
    expect(screen.getByLabelText('x+a')).toBeInTheDocument();
    expect(screen.queryByLabelText('y+b')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('editor-runtime-restart'));

    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
      expect(screen.queryByTestId('variable-hint-strip')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
  });
  it('runs the latest editor input from the display header after editor analysis is stopped', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('editor-runtime-stop'));
    setMathFieldLatex('main-editor', '2+3');

    await waitFor(() => {
      expect(screen.getByTestId('display-status')).toHaveTextContent('Editor analysis stopped');
    });

    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '5');
  });

  it('stores explicit named variables and hints raw adjacent letters as multiplication', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('variables-toggle'));
    await screen.findByTestId('variables-panel');

    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'mass' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '5' } });
    await user.click(screen.getByTestId('variables-set-button'));
    expect(await screen.findByTestId('variables-message')).toHaveTextContent(
      'Use @name or var(name) to store a multi-character named variable.',
    );

    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: '@mass' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '5' } });
    await user.click(screen.getByTestId('variables-set-button'));
    expect(await screen.findByTestId('variables-entry')).toHaveTextContent('mass');

    setMathFieldLatex('main-editor', '');
    await user.click(within(screen.getByTestId('variables-entry')).getByRole('button', { name: /insert/i }));
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await waitFor(() => expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '@mass'));

    setMathFieldLatex('main-editor', '@mass+2');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '7');
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent(/mass\s*=\s*5/);

    setMathFieldLatex('main-editor', 'hello');
    await waitFor(() =>
      expect(screen.getByTestId('variable-hint-strip')).toHaveTextContent('hello'),
    );
    const hints = screen.getByTestId('variable-hint-strip');
    expect(hints).toHaveTextContent('hello');
    expect(hints).toHaveTextContent('ambiguous');
  });
  it('replays guided Calculus history into the same tool state', async () => {
    const { user } = await renderAppMain();
    await openCalculusTool(user, 'Integrals', 'Indefinite');
    await screen.findByTestId('main-editor');
    setMathFieldLatex('main-editor', '2x');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Calculus');
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Rule-based symbolic');

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);

    const replayedEditor = await screen.findByTestId('main-editor');
    await waitFor(() => {
      expect(replayedEditor).toHaveAttribute('data-value', '2x');
    });
    expect(screen.getAllByText('Indefinite Integral').length).toBeGreaterThan(0);
  });

  it('replays Calculus history into the same tool state', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Series', 'Maclaurin');
    setVisibleSecondaryMathFieldLatex('\\sin(x)');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Calculus');

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);

    await waitFor(() => {
      const field = document.querySelector('math-field.secondary-mathfield');
      expect(field).toHaveAttribute('data-value', '\\sin(x)');
    });
    expect(screen.getByText('Maclaurin Input')).toBeInTheDocument();
  });

  it('applies display settings live and keeps quick toggles in sync', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    expect(screen.getByTestId('settings-ui-scale-browser-hint')).toBeInTheDocument(); // a browser zooms itself
    await user.click(screen.getByTestId('settings-math-scale-115'));
    await user.click(screen.getByTestId('settings-result-scale-145'));
    await user.click(screen.getByTestId('settings-high-contrast'));
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-output-style-exact'));
    await user.click(screen.getByTestId('settings-auto-switch-equation'));

    const shell = screen.getByTestId('calculator-shell') as HTMLElement;
    expect(shell.style.getPropertyValue('--ui-scale')).toBe('');
    expect(shell.style.getPropertyValue('--math-scale')).toBe('1.15');
    expect(shell.style.getPropertyValue('--result-scale')).toBe('1.45');
    expect(shell.className).toContain('is-high-contrast');
    expect(screen.getByTestId('quick-setting-angle-unit')).toHaveTextContent('RAD');
    expect(screen.getByTestId('quick-setting-output-style')).toHaveTextContent('Display Exact');
    expect(screen.getByTestId('quick-setting-auto-equation')).toHaveTextContent('Auto Eq On');
    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex Off');
  });
  it('keeps assumption details concise until detailed facts are enabled', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\int\\frac{1}{x^2-1}dx');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-detail-sections')).toBeInTheDocument());
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent('Partial Fractions');
    expect(screen.getByTestId('display-outcome-detail-sections')).not.toHaveTextContent('Trust:');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-detailed-facts'));

    await waitFor(() => {
      expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent('Trust:');
    });
  });

  it('re-evaluates direct trig numeric input according to the selected angle unit', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sin\\left(\\frac{\\pi}{2}\\right)');
    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('1');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.0274121');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.0246715');
  });

  it('re-evaluates plain numeric direct trig input according to the selected angle unit', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sin\\left(90\\right)');
    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('1');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.893997');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('keypad-execute'));
    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-approx')).toHaveTextContent('0.987688');
  });
  it('updates the symbolic-display preview live from settings controls', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    expectMathStaticLatex(screen.getByTestId('settings-symbolic-preview-result'), 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));
    expectMathStaticLatex(screen.getByTestId('settings-symbolic-preview-result'), 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('settings-symbolic-mode-roots'));
    await user.click(screen.getByTestId('settings-flatten-nested-roots'));
    expectMathStaticLatex(
      screen.getByTestId('settings-symbolic-preview-result'),
      '\\sqrt[3]{\\sqrt{x}}',
    );
  });
  it('applies symbolic-display settings live to rendered exact results while keeping canonical raw exact latex for copy/editor flows', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));

    setMathFieldLatex('main-editor', '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenCalledWith('x^{\\frac{1}{6}}');

    await user.click(screen.getByTestId('display-outcome-action-to-editor'));
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^{\\frac{1}{6}}');
  });

  it('switches read-only math notation live while keeping editor loads on canonical latex', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-powers'));
    await user.click(screen.getByTestId('settings-math-notation-plainText'));

    setMathFieldLatex('main-editor', '\\left(\\sqrt{x}\\right)^{\\frac{1}{3}}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x^(1/6)');
    expect(screen.getByTestId('display-outcome-exact').firstElementChild).toHaveAttribute(
      'data-notation-mode',
      'plainText',
    );

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('x^{\\frac{1}{6}}');

    await user.click(screen.getByTestId('settings-math-notation-latex'));

    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x^{\\frac{1}{6}}');
    expect(screen.getByTestId('display-outcome-exact').firstElementChild).toHaveAttribute(
      'data-notation-mode',
      'latex',
    );

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('x^{\\frac{1}{6}}');

    await user.click(screen.getByTestId('display-outcome-action-to-editor'));
    expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', 'x^{\\frac{1}{6}}');
  });

  it('keeps plain familiar roots as roots in auto mode', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-symbolic-mode-auto'));

    setMathFieldLatex('main-editor', '\\sqrt{x}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\sqrt{x}');
  });

  it('renders Calculate exact results and exclusion supplements', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{3}+\\frac{1}{6x}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{2x+1}{6x}');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('Answer');
    const validWhen = screen.getByTestId('display-outcome-valid-when');
    expect(validWhen).toHaveTextContent('Valid when');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
    expect(screen.queryByTestId('display-outcome-approx')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-detailed-facts'));
    await waitForDisplayQueueToSettle();
    expect(screen.getByTestId('display-outcome-valid-when')).toHaveTextContent(validWhen.textContent ?? '');
  });

  it('renders square-power denominators as x^2 instead of repeated x factors', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{6x^2}+4');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{24x^2+1}{6x^{2}}');
    expect(screen.queryByTestId('display-outcome-approx')).not.toBeInTheDocument();
  });

  it('evaluates broadened numeric power/root/log cases in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\left(-8\\right)^{\\frac{2}{3}}+\\log_{4}\\left(16\\right)');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '6');
  });

  it('shows controlled real-domain errors for invalid numeric power/root/log cases', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt{-4}');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText(/non-negative radicands/i)).toBeInTheDocument();
  });

  it('does not show raw NaN when simplify hits an invalid numeric logarithm', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\log\\left(-8\\right)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText(/positive arguments/i)).toBeInTheDocument();
    expect(screen.queryByText(/^NaN$/)).not.toBeInTheDocument();
  });

  it('shows the Calculate algebra tray and runs explicit transforms', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{x^2-1}{x^2-x}');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('cancelFactors'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText(/Canceled supported common factors/i)).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\frac{x+1}{x}');
    expect(screen.getByTestId('algebra-transform-cancelFactors')).toBeInTheDocument();
  });

  it('canonicalizes bounded same-base log sums under simplify with visible condition lines', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\ln(x)+\\ln(x+1)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\ln\\left(x\\,\\left(x+1\\right)\\right)',
    );
    await revealValidWhenIfCollapsed();
    expect(displayedSupplementLatex()).toContain('x>0');
    expect(displayedSupplementLatex()).toContain('x+1>0');
  });

  it('compacts repeated factors when simplify combines same-base log arguments', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\ln(4x)+\\ln(x^3)');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\ln\\left(4\\,x^{4}\\right)',
    );
  });

  it('shows the new PRL3 Rewrite as Power transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt[3]{\\sqrt{x}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('rewriteAsPower'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ge0/);
    expect(screen.getByTestId('algebra-transform-rewriteAsPower')).toBeInTheDocument();
  });

  it('shows the new PRL3 Rewrite as Root transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^{\\frac{1}{6}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('rewriteAsRoot'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x^{\\frac{1}{6}}');
    expect(
      screen.getByTestId('display-outcome-exact').querySelector('[data-raw-latex="\\\\sqrt[6]{x}"]'),
    ).not.toBeNull();
    expect(screen.getByTestId('algebra-transform-rewriteAsRoot')).toBeInTheDocument();
  });

  it('shows the new PRL3 change-base transform in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\log_{4}(x)');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('changeBase'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-exact'),
      '\\frac{\\ln\\left(x\\right)}{\\ln\\left(4\\right)}',
    );
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x>0/);
    expect(screen.getByTestId('algebra-transform-changeBase')).toBeInTheDocument();
  });

  it('shows widened bounded conjugate transforms in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{2+\\sqrt{x}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('conjugate'));

    await waitForDisplayOutcomeSuccess();
    expect(
      screen
        .getByTestId('display-outcome-exact')
        .querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex'),
    ).toBe('\\frac{2-\\sqrt{x}}{4-x}');
    const affineSupplements = Array.from(
      document.querySelectorAll('[data-testid^="display-outcome-supplement-"] [data-raw-latex]'),
    )
      .map((node) => node.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(affineSupplements).toContain('\\sqrt{x}+2\\ne0');
    expect(affineSupplements).toContain('x\\ge0');
  });

  it('shows selected three-term rationalize transforms in Calculate', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{1+\\sqrt{2}+\\sqrt{3}}');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('rationalize'));

    await waitForDisplayOutcomeSuccess();
    expect(
      screen
        .getByTestId('display-outcome-exact')
        .querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex'),
    ).toBe('\\frac{1}{8}(4-2\\sqrt{6}+2\\sqrt{2})');
    expect(screen.getByTestId('algebra-transform-rationalize')).toBeInTheDocument();
  });

  it('renders transform summary math separately from plain text', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\frac{1}{3}+\\frac{1}{6x^2}');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('combineFractions'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Combined fractions over LCD')).toBeInTheDocument();
    expect(screen.getByLabelText('6x^{2}')).toBeInTheDocument();
  });
  it('renders POLY2 bounded cubic factorization through Calculate > Factor', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^3-6x^2+11x-6');
    await user.click(screen.getByTestId('soft-action-factor'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /(x-1|x\^2-5x\+6)/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/x/);
  });

  it('renders POLY-RAD1 algebraic biquadratic factors through Calculate > Factor', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', 'x^4-5x^2+3');
    await user.click(screen.getByTestId('soft-action-factor'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/\\sqrt\{13\}/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/x²|x\^2|x/);
  });
  it('renders POLY-RAD1 direct radical simplification wins without switching simplify into factor mode', async () => {
    const { user } = await renderAppMain();

    setMathFieldLatex('main-editor', '\\sqrt{x^4-10x^2+25}');
    await user.click(screen.getByTestId('soft-action-simplify'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\vert x\^2-5\\vert/);
  });

  it('keeps Trigonometry home focused on guided trig workflows', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Shape Math', 'Trigonometry');

    await waitFor(() => expect(document.querySelector('.trig-menu-list')).not.toBeNull());
    const trigMenu = document.querySelector('.trig-menu-list') as HTMLElement;
    expect(within(trigMenu).getByRole('button', { name: /identities/i })).toBeInTheDocument();
    expect(within(trigMenu).getByRole('button', { name: /triangles/i })).toBeInTheDocument();
    expect(within(trigMenu).getByRole('button', { name: /angle convert/i })).toBeInTheDocument();
    expect(within(trigMenu).queryByRole('button', { name: /functions/i })).not.toBeInTheDocument();
    expect(within(trigMenu).queryByRole('button', { name: /equations/i })).not.toBeInTheDocument();
    expect(within(trigMenu).queryByRole('button', { name: /special angles/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/1-4: Open/i).length).toBeGreaterThan(0);
  });

  it('shows Geometry handoff actions only when the core returns an eligible unresolved case', async () => {
    const { user } = await renderAppMain();

    await openGeometrySlope(user);
    setMathFieldLatex('main-editor', 'slope(p1=(?,2), p2=(4,2), slope=0)');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitForDisplayOutcomeError();
    expect(screen.getByTestId('display-outcome-action-send-equation')).toBeInTheDocument();
  });

  it('renders Statistics quality sections in the shared result card', async () => {
    const { user } = await renderAppMain();

    await openStatisticsRegression(user);
    setMathFieldLatex('main-editor', 'regression(points={(1,2),(2,4),(3,6)})');
    await user.click(screen.getByTestId('soft-action-evaluate'));

    await waitFor(() => expect(screen.getByTestId('display-outcome-detail-sections')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    await user.click(screen.getByText('Quality Summary'));
    const details = screen.getByTestId('display-outcome-detail-sections');
    expect(details).toHaveTextContent('SSE = 0');
    expect(details.querySelectorAll('.result-math-inline')).toHaveLength(3);
  });

  it('shows undefined table rows plus a warning when sampled rows leave the real domain', async () => {
    const { user } = await renderAppMain();

    await openTable(user);
    setMathFieldLatex('table-primary-editor', '\\sqrt{x}');
    await user.click(screen.getByTestId('soft-action-build'));

    await waitFor(() => expect(screen.getByTestId('table-preview')).toBeInTheDocument());
    await waitForDisplayQueueToSettle();
    expect(screen.getByTestId('table-row-1')).toHaveTextContent('undefined');
    expect(screen.getByText(/outside the real domain/i)).toBeInTheDocument();
  });

  it('uses the top display as a Labs preview instead of showing stale calculator output', async () => {
    vi.stubEnv('VITE_SHOW_LABS', '1');
    vi.stubEnv('VITE_ENABLE_LAB_RUNNERS', '1');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
      {
        runnerId: 'sym-search-planner-ordering',
        experimentId: 'sym-search-planner-ordering',
        title: 'Symbolic Search Planner Ordering',
        description: 'Compare planner orders.',
        acceptedInputKinds: ['equation', 'corpus-case'],
        defaultInputKind: 'equation',
        defaultLatex: '\\sin\\left(x^2+x\\right)=\\frac{1}{2}',
        corpusCases: [],
      },
    ]), { status: 200 })));
    const { user } = await renderAppMain();

    await openTable(user);
    setMathFieldLatex('table-primary-editor', 'x^2');
    await user.click(screen.getByTestId('soft-action-build'));
    await waitFor(() => expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('5 rows generated'));

    await openLauncherApp(user, 'Labs', 'Labs');

    const labsDisplay = await screen.findByTestId('labs-display-preview');
    expect(labsDisplay).toHaveTextContent('Symbolic Search Planner Ordering');
    expect(labsDisplay).toHaveTextContent('Equation input');
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Labs preview');
    expect(screen.getByTestId('display-outcome-root')).not.toHaveTextContent('5 rows generated');
  });
});
