import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EDITOR_ANALYSIS_DEBOUNCE_MS } from './lib/editor/editor-analysis-runtime';
import { WEB_PREVIEW_APP_STATE_STORAGE_KEY } from './lib/app-state/tauri';
import { DEFAULT_SETTINGS, type HistoryEntry } from './types/calculator';
import {
  expectMathStaticLatex,
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

async function openCalculusTool(
  user: Awaited<ReturnType<typeof renderAppMain>>['user'],
  ...toolLabels: string[]
) {
  await openLauncherApp(user, 'Calculus', 'Calculus');
  for (const toolLabel of toolLabels) {
    await user.click(await screen.findByRole('button', { name: new RegExp(toolLabel, 'i') }));
  }
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
  await waitFor(() => expect(screen.getByTestId('display-outcome-success')).toBeInTheDocument());
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

async function openNumericIntervalPanel(
  user: Awaited<ReturnType<typeof renderAppMain>>['user'],
  inputLatex: string,
) {
  await openEquationSymbolic(user);
  setMathFieldLatex(
    'main-editor',
    '\\left|x+1\\right|=e^x',
  );
  await user.click(screen.getByTestId('soft-action-solve'));
  await waitFor(() => expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(
    'absolute-value family is outside the current exact bounded solve set',
  ));
  await waitForDisplayQueueToSettle();
  const existingPanel = screen.queryByText('Numeric Interval Solve');
  if (!existingPanel) {
    await user.click(await screen.findByRole('button', { name: 'Numeric Solve' }));
  }
  await screen.findByText('Numeric Interval Solve');
  setMathFieldLatex('main-editor', inputLatex);
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
    const historyEntry: HistoryEntry = {
      id: 'memory-history',
      mode: 'equation',
      inputLatex: 'x+1=2',
      resultLatex: 'x=1',
      equationSolveTarget: 'x',
      timestamp: '2026-05-25T00:00:00Z',
    };
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
    await user.click(await screen.findByRole('button', { name: /equation/i }));
    await screen.findByRole('button', { name: /symbolic/i });
    expect(screen.queryByTestId('left-menu-inspector')).not.toBeInTheDocument();
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
    const firstEntry: HistoryEntry = {
      id: 'delete-me',
      mode: 'calculate',
      inputLatex: '1+1',
      resultLatex: '2',
      timestamp: '2026-05-29T00:00:00Z',
    };
    const secondEntry: HistoryEntry = {
      id: 'keep-me',
      mode: 'calculate',
      inputLatex: '2+2',
      resultLatex: '4',
      timestamp: '2026-05-29T00:00:01Z',
    };
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
    const restoredHistory: HistoryEntry[] = Array.from({ length: 36 }, (_, index) => ({
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
    expect(entries).toHaveLength(36);
    expect(screen.queryByTestId('history-entry-expanded')).not.toBeInTheDocument();
    for (const entry of entries.slice(0, 6)) {
      expect(within(entry).getByTestId('history-entry-preview')).toBeInTheDocument();
      expect(within(entry).queryByText('Answer')).not.toBeInTheDocument();
      expect(within(entry).queryByText('Valid when')).not.toBeInTheDocument();
    }

    await user.click(within(entries[0]).getByTestId('history-entry-toggle'));
    expect(within(entries[0]).getByTestId('history-entry-expanded')).toBeInTheDocument();
    expect(within(entries[0]).getByText('Answer')).toBeInTheDocument();
    await user.click(within(entries[0]).getByTestId('history-entry-delete'));
    await waitFor(() => expect(screen.getAllByTestId('history-entry')).toHaveLength(35));
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
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent(/a\s*=\s*4/);

    await user.click(screen.getByTestId('variables-toggle'));
    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'a' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '9' } });
    await user.click(screen.getByTestId('variables-set-button'));
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '5');
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent(/a\s*=\s*4/);
  });

  it('does not substitute stored values while solving Equation symbolic targets', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('variables-toggle'));
    await screen.findByTestId('variables-panel');
    fireEvent.change(screen.getByTestId('variables-name-input'), { target: { value: 'x' } });
    fireEvent.change(screen.getByTestId('variables-value-input'), { target: { value: '2' } });
    await user.click(screen.getByTestId('variables-set-button'));
    await user.click(within(screen.getByTestId('variables-panel')).getByRole('button', { name: /close/i }));

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+z=5');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=5-x');
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
      expect(within(activeLauncherPanel).getByRole('button', { name: /equation/i })).toBeInTheDocument();
    });
    launcherPanel = document.querySelector('.launcher-panel') as HTMLElement;
    await user.click(within(launcherPanel).getByRole('button', { name: /equation/i }));

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

  it('restart clears Equation preview and result cards while keeping the route intro', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+1=3');
    await waitFor(() => expect(screen.getByLabelText('x+1=3')).toBeInTheDocument());
    expect(screen.getByTestId('display-expression-preview-card')).toBeInTheDocument();

    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=2');

    await user.click(screen.getByTestId('editor-runtime-restart'));

    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '');
      expect(screen.queryByTestId('display-outcome-success')).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText('x+1=3')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('x=2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('display-expression-preview-card')).not.toBeInTheDocument();
    expect(screen.getAllByText('Enter an equation in x, then press EXE or F1 to solve.').length)
      .toBeGreaterThan(0);
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

  it('solves explicit named variables as Equation targets', async () => {
    setViewportWidth(2400);
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '@mass+2=7');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\mathrm{mass}=5');
  });

  it('replays guided Calculus history into the same tool state', async () => {
    const { user } = await renderAppMain();

    await openCalculusTool(user, 'Integrals', 'Indefinite');
    setMathFieldLatex('main-editor', '2x');
    await user.click(screen.getByTestId('keypad-execute'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Calculus');
    expect(screen.getByTestId('display-outcome-root')).toHaveTextContent('Rule-based symbolic');

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);

    await waitFor(() => {
      expect(screen.getByTestId('main-editor')).toHaveAttribute('data-value', '2x');
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

    await user.click(screen.getByTestId('settings-ui-scale-130'));
    await user.click(screen.getByTestId('settings-math-scale-115'));
    await user.click(screen.getByTestId('settings-result-scale-145'));
    await user.click(screen.getByTestId('settings-high-contrast'));
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-output-style-exact'));
    await user.click(screen.getByTestId('settings-auto-switch-equation'));

    const shell = screen.getByTestId('calculator-shell') as HTMLElement;
    expect(shell.style.getPropertyValue('--ui-scale')).toBe('1.3');
    expect(shell.style.getPropertyValue('--math-scale')).toBe('1.15');
    expect(shell.style.getPropertyValue('--result-scale')).toBe('1.45');
    expect(shell.className).toContain('is-high-contrast');
    expect(screen.getByTestId('quick-setting-angle-unit')).toHaveTextContent('RAD');
    expect(screen.getByTestId('quick-setting-output-style')).toHaveTextContent('EXACT');
    expect(screen.getByTestId('quick-setting-auto-equation')).toHaveTextContent('Auto Eq On');
    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex Off');
  });

  it('persists the Complex toggle and marks Equation symbolic results without changing solving', async () => {
    const firstRender = await renderAppMain();

    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex Off');
    await firstRender.user.click(screen.getByTestId('quick-setting-equation-domain-intent'));
    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex On');

    firstRender.unmount();
    const { user } = await renderAppMain();

    expect(screen.getByTestId('quick-setting-equation-domain-intent')).toHaveTextContent('Complex On');
    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+1=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=1');
    expect(screen.getByText('Domain intent: Complex')).toBeInTheDocument();
  });

  it('renders Equation inequality solution sets with the visible solution chip', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('quick-setting-equation-domain-intent'));
    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '2x+3\\le7');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x\\le2');
    expect(screen.getByText('Solution: Inequality set')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-detail-sections')).not.toHaveTextContent('x < = 2');
    expect(screen.getByTestId('display-outcome-valid-when')).toHaveTextContent('Valid when');
    expectMathStaticLatex(
      screen.getByTestId('display-outcome-supplement-0'),
      /Complex intent is enabled; ordered inequalities are solved over the real line/,
    );
  });

  it('routes typed split inequality operators through Equation instead of Calculate', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '(x-1)^2 < = 0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=1');
    expect(screen.getByText('Solution: Inequality set')).toBeInTheDocument();
    expect(screen.queryByText(/Inequalities and .*notation are visible in Algebra/)).not.toBeInTheDocument();
  });

  it('collapses verbose Equation inequality validity sections until expanded', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln(\\sqrt{x^2-1})<4');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    const validWhen = screen.getByTestId('display-outcome-valid-when') as HTMLDetailsElement;
    expect(validWhen.tagName).toBe('DETAILS');
    expect(validWhen.open).toBe(false);
    expect(validWhen).toHaveTextContent('Valid when · 3 facts');

    await user.click(within(validWhen).getByText(/Valid when/i));
    expect(validWhen.open).toBe(true);
  });

  it('marks complex Equation answers without duplicating the domain intent chip', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('quick-setting-equation-domain-intent'));
    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^2+1=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Domain: Complex')).toBeInTheDocument();
    expect(screen.queryByText('Domain intent: Complex')).not.toBeInTheDocument();
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

  it('respects the selected angle unit when running Equation numeric interval solve', async () => {
    const { user } = await renderAppMain();

    await openNumericIntervalPanel(user, '\\sin\\left(x\\right)=\\frac{1}{2}');

    async function setNumericInterval(start: string, end: string, subdivisions?: string) {
      const startInput = screen.getByLabelText('Start');
      const endInput = screen.getByLabelText('End');
      await user.clear(startInput);
      await user.type(startInput, start);
      fireEvent.blur(startInput);
      await user.clear(endInput);
      await user.type(endInput, end);
      fireEvent.blur(endInput);
      if (subdivisions) {
        const subdivisionsInput = screen.getByLabelText('Subdivisions');
        await user.clear(subdivisionsInput);
        await user.type(subdivisionsInput, subdivisions);
        fireEvent.blur(subdivisionsInput);
      }
    }

    await setNumericInterval('20', '40', '96');
    expect(screen.queryByRole('button', { name: 'Run Numeric Solve' })).not.toBeInTheDocument();
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x ≈ 30');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await setNumericInterval('0', '1');
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x ≈ 0.523599');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-grad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await setNumericInterval('30', '40');
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x ≈ 33.3333');
  });

  it('lets Equation numeric interval solve continue past unresolved composition guidance when a valid interval is provided', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());
    await openNumericIntervalPanel(user, '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '1');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '2');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x ≈ 1.19328');
    expect(screen.getAllByText(/Bracket-first adaptive bisection \+ local-minimum recovery/i).length).toBeGreaterThan(0);
  });

  it('shows unit-aware branch guidance when Equation numeric interval solve misses a trig-composition branch', async () => {
    const { user } = await renderAppMain();

    await openNumericIntervalPanel(user, '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '0');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '10');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeError();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent('ln(x+1) stays about in');
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent('45 deg + 180 deg * k');
  }, 10000);

  it('accepts scientific notation in Equation numeric interval inputs', async () => {
    const { user } = await renderAppMain();

    await openNumericIntervalPanel(user, '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '3e19');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '4e19');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');

    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(
      screen.getByText(
        /Numeric solve on \[30000000000000000000, 40000000000000000000\] with 512 subdivisions/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('3493427');
  }, 10000);

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

  it('applies numeric-output settings live to preview and approximate equation output', async () => {
    const { user } = await renderAppMain();
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');

    const digitsInput = screen.getByTestId('settings-approx-digits-input');
    await user.clear(digitsInput);
    await user.type(digitsInput, '3');
    fireEvent.blur(digitsInput);
    await user.click(screen.getByTestId('settings-notation-mode-scientific'));
    await user.click(screen.getByTestId('settings-scientific-style-e'));

    expect(screen.getByTestId('settings-numeric-preview-result')).toHaveTextContent('1.235e6');
    await user.click(screen.getByTestId('settings-toggle'));

    await openNumericIntervalPanel(user, '\\log(x^2+9x-5)=\\log(8x+\\ln 4)');

    const startInput = screen.getByLabelText('Start');
    const endInput = screen.getByLabelText('End');
    const subdivisionsInput = screen.getByLabelText('Subdivisions');

    await user.clear(startInput);
    await user.type(startInput, '1');
    fireEvent.blur(startInput);
    await user.clear(endInput);
    await user.type(endInput, '3');
    fireEvent.blur(endInput);
    await user.clear(subdivisionsInput);
    await user.type(subdivisionsInput, '512');
    await user.click(screen.getByTestId('editor-runtime-run'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent('x ≈ 2.076e0');
    expect(screen.queryByTestId('display-outcome-approx')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy Result' }));
    expect(writeTextSpy).toHaveBeenLastCalledWith('x ≈ 2.076e0');
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
    expect(writeTextSpy).toHaveBeenCalledWith('x^(1/6)');

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
    expect(writeTextSpy).toHaveBeenLastCalledWith('x^(1/6)');

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
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x>0/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\+1>0/);
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

  it('renders Equation conditions and suppresses send action on solved cases', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.queryByTestId('display-outcome-action-send-equation')).not.toBeInTheDocument();
    const supplementLatex = Array.from(
      document.querySelectorAll('[data-testid^="display-outcome-supplement-"] [data-raw-latex]'),
    )
      .map((node) => node.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(supplementLatex).toContain('x\\ge0');
    expect(supplementLatex).toContain('x\\ne0');
  });

  it('solves Equation simultaneous Polynomial 2x2 systems through resultant projection', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Core', 'Equation');
    let equationMenu = document.querySelector('.equation-menu-list') as HTMLElement;
    await user.click(within(equationMenu).getByRole('button', { name: /simultaneous/i }));

    equationMenu = await waitFor(() => {
      const menu = document.querySelector('.equation-menu-list') as HTMLElement | null;
      expect(menu).toBeInTheDocument();
      return menu as HTMLElement;
    });
    expect(within(equationMenu).getByText('2x2').closest('button')).toHaveTextContent(
      'Solve a 2x2 linear system',
    );
    expect(within(equationMenu).getByText('3x3').closest('button')).toHaveTextContent(
      'Solve a 3x3 linear system',
    );
    await user.click(within(equationMenu).getByRole('button', { name: /polynomial 2x2/i }));

    const equation1 = await screen.findByTestId('polynomial-system-equation-1');
    const equation2 = await screen.findByTestId('polynomial-system-equation-2');
    expect(equation1).toHaveAttribute('data-placeholder', 'First equation');
    expect(equation2).toHaveAttribute('data-placeholder', 'Second equation');

    setMathFieldLatex('polynomial-system-equation-1', 'y=x^2');
    setMathFieldLatex('polynomial-system-equation-2', 'y=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(within(screen.getByTestId('display-outcome-answer-block')).getByText('Answer'))
      .toBeInTheDocument();
    const exactLatex = screen.getByTestId('display-outcome-exact')
      .querySelector('[data-raw-latex]')
      ?.getAttribute('data-raw-latex') ?? '';
    expect(exactLatex).toContain('\\left(-1,1\\right)');
    expect(exactLatex).toContain('\\left(1,1\\right)');

    const details = screen.getByTestId('display-outcome-detail-sections');
    expect(details).toHaveTextContent('Polynomial System');
    expect(details).toHaveTextContent('Resultant Projection');
    expect(details).toHaveTextContent('Candidate Check');
  });

  it('solves single-variable non-x equations without showing a target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'z+1=3');

    await waitFor(() =>
      expect(screen.queryByTestId('equation-solve-target-selector')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=2');
  });

  it('solves affine multi-symbol equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+z=5');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    expect(selector).toHaveTextContent('Solve for');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=5-x');
    expect(screen.getByText(/Symbolic parameters: x/i)).toBeInTheDocument();
  });

  it('shows target choices for raw adjacent-letter products while keeping the ambiguity hint', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'mass=2');

    const hints = await screen.findByTestId('variable-hint-strip');
    expect(hints).toHaveTextContent('mass');
    expect(hints).toHaveTextContent('ambiguous');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    expect(selector).toHaveTextContent('a');
    expect(selector).toHaveTextContent('m');
    expect(selector).toHaveTextContent('s');
    await user.click(within(selector).getByRole('button', { name: 's' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/s=/);
  });

  it('replays selected-target Equation history with the original target restored', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x+z=5');

    let selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));
    await waitForDisplayOutcomeSuccess();

    selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'x' }));
    expect(within(selector).getByRole('button', { name: 'x' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByTestId('history-toggle'));
    await user.click((await screen.findAllByTestId('history-entry'))[0]);

    await waitFor(() => {
      const replaySelector = screen.getByTestId('equation-solve-target-selector');
      expect(within(replaySelector).getByRole('button', { name: 'z' })).toHaveAttribute('aria-pressed', 'true');
    });

    await user.click(screen.getByTestId('soft-action-solve'));
    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=5-x');
  });

  it('solves quadratic multi-symbol equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'z^2+x z+1=0');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/z=/);
    expectAnyExactBranchLatex(/x\^2-4/);
    expect(screen.getByText(/Symbolic parameters: x/i)).toBeInTheDocument();
  });

  it('solves rational multi-symbol equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{z-a}=b');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /z=\\frac\{ab\+1\}\{b\}/);
    expect(screen.getByText(/Symbolic parameters: a, b/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Rational Solve')).toBeInTheDocument();
  });

  it('solves nested rational equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{1+\\frac{1}{z-a}}=b');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /z=/);
    expect(screen.getByText(/Symbolic parameters: a, b/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Rational Solve')).toBeInTheDocument();
  });

  it('solves factorable polynomial equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '(z-a)(z-b)(z-c)=0');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/z=/);
    expect(screen.getByText(/Symbolic parameters: a, b, c/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Factorable Polynomial Solve')).toBeInTheDocument();
  });

  it('solves nonperiodic carrier equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\left|z-a\\right|=b');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/z=a\+b/);
    expectAnyExactBranchLatex(/z=a-b/);
    expect(screen.getByText(/Symbolic parameters: a, b/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Carrier Solve')).toBeInTheDocument();
  });

  it('solves exp-log equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(z+a\\right)=b');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=e^{b}-a');
    expect(screen.getByText(/Symbolic parameters: a, b/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Exp/Log Solve')).toBeInTheDocument();
  });

  it('solves symbolic-base exp-log equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'a^z=b');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'z=\\log_{a}\\left(b\\right)');
    expect(screen.getByTestId('display-outcome-answer-block')).toHaveTextContent('Answer');
    const validWhen = screen.getByTestId('display-outcome-valid-when');
    expect(validWhen).toHaveTextContent('Valid when');
    fireEvent.click(within(validWhen).getByText(/Valid when/i));
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /a>0/);
    expect(screen.getByText(/Symbolic parameters: a, b/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Exp/Log Solve')).toBeInTheDocument();
  });

  it('solves direct affine trig equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(z\\right)=a');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/z=/);
    expectAnyExactBranchLatex(/\\arcsin/);
    expect(screen.getByText(/Symbolic parameters: a/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Trig Solve')).toBeInTheDocument();
  });

  it('solves mixed sine/cosine equations through the explicit target selector', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'A\\sin\\left(z\\right)+B\\cos\\left(z\\right)=C');

    const selector = await screen.findByTestId('equation-solve-target-selector');
    await user.click(within(selector).getByRole('button', { name: 'z' }));
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/z=/);
    expectAnyExactBranchLatex(/atan2/);
    expect(screen.getByText(/Symbolic parameters: A, B, C/i)).toBeInTheDocument();
    expect(screen.getByText('Parameterized Mixed Trig Solve')).toBeInTheDocument();
  });

  it('shows the Equation algebra tray and keeps transforms separate from solve', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{x}+\\frac{1}{x+1}=1');
    await user.click(screen.getByTestId('soft-action-algebra'));

    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('useLCD'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText(/Cleared the equation/i)).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /=0/);
    expect(screen.getByTestId('algebra-transform-useLCD')).toBeInTheDocument();
  });

  it('preprocesses fractional-power notation into existing Equation solve families without broadening solve scope', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{1}{2}}=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=9');
  });

  it('solves PRL4 same-base equality families with visible provenance and conditions', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(x+1\\right)=\\ln\\left(2x-3\\right)');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /2x-3>0/);
    expect(screen.getByText('Same-Base Equality')).toBeInTheDocument();
  });

  it('uses preserved-domain wording when a same-base log equality reduces to an invalid real candidate', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln(4x+2)=\\ln(5x+6)');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/undefined in the real domain/i);
  });

  it('solves PRL4 bounded mixed-base log families exactly in Equation mode', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\log_{2}\\left(x\\right)+\\log_{4}\\left(x\\right)=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expect(screen.getByText('Log Base Normalize')).toBeInTheDocument();
  });

  it('solves PRL4 bounded rational-power families with power-lift provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{3}{2}}=8');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=4');
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
  });

  it('solves COMP1 non-periodic outer inversions through the guarded Equation backend', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(x^2+1\\right)=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expectAnyExactBranchLatex(/\\sqrt/);
  });

  it('solves COMP2 two-step non-periodic chains with nested-recursion provenance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{\\log_{3}\\left((x+1)^2\\right)}=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByText('Candidate Checked')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/8/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/10/);
  });

  it('hands COMP2 inversions into the bounded trig solver when the downstream branch set is finite', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(\\sin\\left(x\\right)\\right)=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=2\\pi k+\\frac{\\pi}{2}');
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/k = 0/);
  });

  it('hands COMP2 inversions into bounded PRL/algebra families without fabricating exact output', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{\\left(x+1\\right)^{\\frac{2}{3}}}=3');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Root Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/26/);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/28/);
  });

  it('proves impossible COMP1 trig compositions from the bounded inner image', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(x\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText('Range Guard')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/inner image/i);
  });

  it('renders finite COMP3 trig composition branches as symbolic periodic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/arccos/);
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
  });

  it('renders COMP4 nonlinear-in-k families as symbolic periodic branches with parameter constraints', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^2\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-periodic-family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
    expect(screen.getByTestId('display-outcome-periodic-parameter-constraints')).toHaveTextContent(/Parameter constraints/i);
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
  });

  it(
    'renders COMP10 quadratic periodic carriers as symbolic parameterized branches',
    async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^2+x\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
      expect(screen.getByTestId('display-outcome-periodic-parameter-constraints')).toHaveTextContent(/Parameter constraints/i);
      expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/near x/i);
    },
    15000,
  );

  it('returns reduced-carrier exact periodic families for broader mixed polynomial carriers after COMP11', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(x^3+x\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /x\^3\+x/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-periodic-family'), /x\^3\+x/);
  });

  it('renders COMP3 tan-log composition families symbolically with interval guidance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\tan\\left(\\ln\\left(x+1\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Composition Branch')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/exp/);
    expect(screen.getByTestId('display-outcome-periodic-intervals')).toHaveTextContent(/1\.19328/);
  });

  it('formats periodic composition families in degree mode with unit-native numeric branches', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(\\sin\\left(x\\right)\\right)=0');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k\+90/);
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/x=90/);
  });

  it('solves COMP4 bounded outer inverse-trig handoff through one supported follow-on step', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\ln\\left(x+1\\right)\\right)=45');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/e/);
  });

  it('renders COMP5 deeper periodic reductions through inverse-trig carriers as symbolic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/π/);
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toHaveTextContent(/k = 0/);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toBeInTheDocument();
  });

  it('renders COMP5 inverse-trig follow-on in degree mode with unit-aware periodic branches', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\cos\\left(\\arcsin\\left(\\sin\\left(x\\right)\\right)\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Outer Inversion')).toBeInTheDocument();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k\+60/);
  });

  it('keeps COMP7 deep nested periodic carriers on structured multi-parameter guidance when exact closure would overreach', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\cos\\left(\\tan\\left(x\\right)\\right)\\right)=0.00002');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Nested Recursion')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/second independent periodic parameter/i);
    expect(screen.getByTestId('display-outcome-periodic-family')).toHaveTextContent(/tan\(x\)/i);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toHaveTextContent(/cos/i);
    expect(screen.getByTestId('display-outcome-periodic-discovered-families')).toHaveTextContent(/tan/i);
    expect(screen.getByTestId('display-outcome-periodic-stop-reason')).toHaveTextContent(/multiple independent periodic parameters/i);
  });

  it('renders COMP6 reciprocal trig rewrites as symbolic periodic families', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\csc\\left(2x+30\\right)=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByText('Reciprocal Rewrite')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/180k/);
    expect(screen.getByTestId('display-outcome-periodic-reduced-carrier')).toHaveTextContent(/Reduced carrier/i);
    expect(screen.queryByTestId('display-outcome-periodic-stop-reason')).not.toBeInTheDocument();
  });

  it('renders COMP6 reciprocal trig range failures with rewrite provenance', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sec\\left(\\sin\\left(x\\right)\\right)=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText('Range Guard')).toBeInTheDocument();
    expect(screen.getByText('Reciprocal Rewrite')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/inner image/i);
  });

  it('renders COMP6 principal-range reductions with principal-range and piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\tan\\left(\\cos\\left(x\\right)\\right)\\right)=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-principal-range')).toHaveTextContent(/90/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arctan/);
  });

  it('renders COMP8 affine sawtooth closures with exact families and piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(2x+10\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
    expect(screen.getByTestId('display-outcome-periodic-principal-range')).toHaveTextContent(/90/);
  });

  it('renders COMP9 mixed-carrier sawtooth closures beyond affine carriers', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^2\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/360k/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
  });

  it('renders COMP10 quadratic sawtooth carriers as exact families with piecewise details', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^2+x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/√/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
    expect(screen.getByText(/Parameter constraints/i)).toBeInTheDocument();
  });

  it('renders COMP10 shifted-power sawtooth carriers exactly', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-deg'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arctan\\left(\\tan\\left((2x+1)^2+3\\right)\\right)=30');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Parameterized Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-exact')).toHaveTextContent(/180k\+27/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arctan/);
  });

  it('returns reduced-carrier exact sawtooth families for broader polynomial carriers after COMP11', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(x^3+x\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /x\^3\+x/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
  });

  it('returns reduced-carrier exact periodic families for shifted radical carriers after COMP12A', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\sqrt{x+1}-2\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\sqrt\{x\+1\}-2/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-periodic-family'), /\\sqrt\{x\+1\}-2/);
    expect(screen.getByTestId('display-outcome-periodic-reduced-carrier')).toHaveTextContent(/Reduced carrier/i);
    expect(screen.queryByTestId('display-outcome-periodic-stop-reason')).not.toBeInTheDocument();
  });

  it('returns reduced-carrier exact sawtooth families for abs-backed carriers after COMP12A', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\arcsin\\left(\\sin\\left(\\left|x-1\\right|\\right)\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getAllByText('Principal Range').length).toBeGreaterThan(0);
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), /\\vert x-1\\vert/);
    expect(screen.getByTestId('display-outcome-periodic-piecewise')).toHaveTextContent(/arcsin/);
    expect(screen.getByTestId('display-outcome-periodic-reduced-carrier')).toHaveTextContent(/Reduced carrier/i);
    expect(screen.queryByTestId('display-outcome-periodic-stop-reason')).not.toBeInTheDocument();
  });

  it('keeps mixed reduced-carrier composition guidance readable after COMP12B', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sin\\left(\\sqrt{x+1}+x^{\\frac{1}{3}}\\right)=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByTestId('display-outcome-error')).toHaveTextContent(/mixed carrier/i);
    expect(screen.getByTestId('display-outcome-solve-summary')).toHaveTextContent(/Reduced-carrier boundary/i);
    expect(screen.getByTestId('display-outcome-periodic-representatives')).toBeInTheDocument();
    expect(screen.queryByTestId('display-outcome-periodic-reduced-carrier')).not.toBeInTheDocument();
    expect(screen.queryByTestId('display-outcome-periodic-stop-reason')).not.toBeInTheDocument();
  });

  it('renders exact outer-nonperiodic abs context through detail sections after ABS5B', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\ln\\left(\\left|x\\right|+1\\right)=2');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expect(screen.getByTestId('display-outcome-solve-summary')).toHaveTextContent(/outer non-periodic absolute-value family/i);
    expect(screen.getByText('Absolute-Value Reduction')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent(/t = \|x\|/i);
    expect(screen.queryByText('Exact Closure Boundary')).not.toBeInTheDocument();
  });

  it('renders guided outer-nonperiodic abs boundaries separately from periodic-family context after ABS5B', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('settings-toggle'));
    await screen.findByTestId('settings-panel');
    await user.click(screen.getByTestId('settings-angle-unit-rad'));
    await user.click(screen.getByTestId('settings-toggle'));
    await waitFor(() => expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument());

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '2^{\\left|\\sin\\left(x^5+x\\right)\\right|}=2^{\\frac{1}{2}}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeError();
    expect(screen.getByText('Periodic Family')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-solve-summary')).toHaveTextContent(/outer non-periodic absolute-value family/i);
    expect(screen.getByText('Exact Closure Boundary')).toBeInTheDocument();
    expect(screen.getByTestId('display-outcome-detail-sections')).toHaveTextContent(/guided periodic\/composition output/i);
  });

  it('shows the new PRL3 Equation transforms without auto-solving the rewritten equation', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', 'x^{\\frac{1}{2}}=3');
    await user.click(screen.getByTestId('soft-action-algebra'));
    await waitFor(() => expect(screen.getByTestId('algebra-transform-tray')).toBeInTheDocument());
    await user.click(await waitForAlgebraTransform('rewriteAsRoot'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), '\\sqrt{x}=3');
    expect(screen.queryByText(/^x=9$/)).not.toBeInTheDocument();
    expect(screen.getByTestId('algebra-transform-rewriteAsRoot')).toBeInTheDocument();
  });

  it('renders Equation LCD-cleared rational solves with exclusions and provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{x}+\\frac{1}{x+1}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/\\sqrt\{5\}/);
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /x\\ne0/);
    expect(screen.getByText('LCD Clear')).toBeInTheDocument();
  });

  it('renders POLY2 guided quartic exact roots through the bounded factor-first path', async () => {
    const { user } = await renderAppMain();

    await openLauncherApp(user, 'Core', 'Equation');
    await user.click(await screen.findByRole('button', { name: /polynomial/i }));
    await user.click(await screen.findByRole('button', { name: /quartic/i }));

    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex('x=2');
    expectAnyExactBranchLatex('x=1');
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

  it('renders bounded conjugate solves with conditions and provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{\\sqrt{x}+1}=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=1');
    const supplements = screen
      .getAllByTestId(/display-outcome-supplement-/)
      .map((node) => node.querySelector('[data-raw-latex]')?.getAttribute('data-raw-latex') ?? '')
      .join(' ');
    expect(supplements).toContain('x\\ge0');
    expect(supplements).toContain('\\sqrt{x}+1\\ne0');
    expect(screen.getByText('Conjugate Transform')).toBeInTheDocument();
  });

  it('renders POLY-RAD5 selected three-term reciprocal solves only when the bounded sink closes cleanly', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\frac{1}{1+\\sqrt{x}+\\sqrt{x+1}}=\\frac{1}{2}');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectMathStaticLatex(screen.getByTestId('display-outcome-exact'), 'x=0');
    expect(screen.getByText('LCD Clear')).toBeInTheDocument();
  }, 30000);

  it('renders RAD2 sequential radical solves with exact follow-on provenance', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{x+1}=\\sqrt{2x-1}+1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    const exactMath = screen.getByTestId('display-outcome-exact').querySelector('[data-raw-latex]');
    const rawLatex = exactMath?.getAttribute('data-raw-latex') ?? '';
    expect(rawLatex).toContain('x=');
    expect(rawLatex).toContain('\\sqrt');
    expectMathStaticLatex(screen.getByTestId('display-outcome-supplement-0'), /2x-1\\ge0/);
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
  });

  it('renders POLY-RAD1 radical equations that hand off into algebraic biquadratic exact roots', async () => {
    const { user } = await renderAppMain();

    await openEquationSymbolic(user);
    setMathFieldLatex('main-editor', '\\sqrt{x^4-5x^2+4}=1');
    await user.click(screen.getByTestId('soft-action-solve'));

    await waitForDisplayOutcomeSuccess();
    expectAnyExactBranchLatex(/\\sqrt\{13\}/);
    expect(screen.getByText('Radical Isolation')).toBeInTheDocument();
    expect(screen.getByText('Power Lift')).toBeInTheDocument();
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

    expect(await screen.findByRole('button', { name: /identities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /triangles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /angle convert/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /functions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /equations/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /special angles/i })).not.toBeInTheDocument();
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
    expect(screen.getByText('Quality Summary')).toBeInTheDocument();
    expect(screen.getByText(/SSE/i)).toBeInTheDocument();
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
