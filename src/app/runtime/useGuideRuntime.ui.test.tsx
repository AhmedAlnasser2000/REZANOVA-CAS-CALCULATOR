import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModeId } from '../../types/calculator';
import { createKeyboardContext } from '../../lib/virtual-keyboard/capabilities';
import { useGuideRuntime } from './useGuideRuntime';

function renderGuideRuntime(initialProps: { currentMode?: ModeId } = {}) {
  const closeHistoryPanel = vi.fn();
  const closeLauncher = vi.fn();
  const openLauncher = vi.fn();
  const setMode = vi.fn();
  const enabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;

  const hook = renderHook(
    (props: { currentMode: ModeId }) =>
      useGuideRuntime({
        closeHistoryPanel,
        closeLauncher,
        currentMode: props.currentMode,
        enabledCapabilities,
        openLauncher,
        setMode,
      }),
    {
      initialProps: {
        currentMode: initialProps.currentMode ?? 'guide',
      },
    },
  );

  return {
    closeHistoryPanel,
    closeLauncher,
    hook,
    openLauncher,
    setMode,
  };
}

describe('useGuideRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists Guide selection independently by route type', () => {
    const { hook } = renderGuideRuntime();

    act(() => {
      hook.result.current.setCurrentGuideSelectionIndex(2);
    });

    expect(hook.result.current.guideSelection.home).toBe(2);
    expect(hook.result.current.currentGuideSelectionIndex).toBe(2);

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'domain', domainId: 'calculus' });
    });
    act(() => {
      hook.result.current.setCurrentGuideSelectionIndex(1);
    });

    expect(hook.result.current.guideSelection.domain.calculus).toBe(1);
    expect(hook.result.current.currentGuideSelectionIndex).toBe(1);

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'home' });
    });

    expect(hook.result.current.currentGuideSelectionIndex).toBe(2);
  });

  it('updates Guide search and symbol lookup query routes', () => {
    const { hook } = renderGuideRuntime();

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'search', query: '' });
    });
    act(() => {
      hook.result.current.setGuideQuery('integral');
    });

    expect(hook.result.current.guideRoute).toEqual({ screen: 'search', query: 'integral' });
    expect(hook.result.current.guideSearchQuery).toBe('integral');

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'symbolLookup', query: '' });
    });
    act(() => {
      hook.result.current.setGuideQuery('pi');
    });

    expect(hook.result.current.guideRoute).toEqual({ screen: 'symbolLookup', query: 'pi' });
    expect(hook.result.current.guideSearchQuery).toBe('pi');
  });

  it('moves article example selection and exposes the selected Guide example', () => {
    const { hook } = renderGuideRuntime();

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'article', articleId: 'calculus-derivatives' });
    });

    expect(hook.result.current.guideArticle?.id).toBe('calculus-derivatives');
    expect(hook.result.current.selectedGuideExample).toBeDefined();
    const firstExample = hook.result.current.selectedGuideExample;

    act(() => {
      hook.result.current.moveCurrentGuideSelection(1);
    });

    expect(hook.result.current.currentGuideSelectionIndex).toBe(1);
    expect(hook.result.current.selectedGuideExample).toBeDefined();
    expect(hook.result.current.selectedGuideExample).not.toBe(firstExample);
  });

  it('opens selected Guide entries and navigates parent routes before launcher fallback', () => {
    const { hook, openLauncher } = renderGuideRuntime();

    act(() => {
      hook.result.current.openSelectedGuideEntry();
    });

    expect(hook.result.current.guideRoute.screen).not.toBe('home');

    act(() => {
      hook.result.current.openGuideRoute({ screen: 'article', articleId: 'calculus-derivatives' });
    });
    act(() => {
      hook.result.current.goBackInGuide();
    });

    expect(hook.result.current.guideRoute).toEqual({ screen: 'domain', domainId: 'calculus' });

    act(() => {
      hook.result.current.goBackInGuide();
    });

    expect(hook.result.current.guideRoute).toEqual({ screen: 'home' });

    act(() => {
      hook.result.current.goBackInGuide();
    });

    expect(openLauncher).toHaveBeenCalledTimes(1);
  });

  it('opens Guide surfaces through shell helpers and resets Guide runtime state', () => {
    const { closeHistoryPanel, closeLauncher, hook, setMode } = renderGuideRuntime();

    act(() => {
      hook.result.current.openGuideArticle('advanced-integrals');
    });

    expect(hook.result.current.guideRoute).toEqual({
      screen: 'article',
      articleId: 'advanced-integrals',
    });
    expect(closeLauncher).toHaveBeenCalled();
    expect(closeHistoryPanel).toHaveBeenCalled();
    expect(setMode).toHaveBeenCalledWith('guide');

    act(() => {
      hook.result.current.openGuideMode('calculus');
    });

    expect(hook.result.current.guideRoute).toEqual({
      screen: 'modeGuide',
      modeId: 'calculus',
    });

    act(() => {
      hook.result.current.setCurrentGuideSelectionIndex(3);
      hook.result.current.resetGuideRuntime();
    });

    expect(hook.result.current.guideRoute).toEqual({ screen: 'home' });
    expect(hook.result.current.guideSelection.home).toBe(0);
  });
});
