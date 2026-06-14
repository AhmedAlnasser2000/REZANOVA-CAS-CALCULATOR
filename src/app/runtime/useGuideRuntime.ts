import { useState } from 'react';
import { getSelectedGuideExample } from '../../lib/guide/examples';
import {
  getActiveGuideHomeEntries,
  getGuideArticle,
  getGuideModeRef,
} from '../../lib/guide/content';
import {
  clampGuideIndex,
  getGuideListEntries,
  getGuideParentRoute,
  getGuideRouteMeta,
  moveGuideIndex,
} from '../../lib/guide/navigation';
import { guideSoftActionLabel } from '../logic/appUtils';
import type {
  CapabilityId,
  GuideModeId,
  GuideRoute,
  ModeId,
} from '../../types/calculator';

type GuideSelectionState = {
  home: number;
  domain: {
    basics: number;
    algebra: number;
    discrete: number;
    calculus: number;
    linearAlgebra: number;
    trigonometry: number;
    statistics: number;
    geometry: number;
  };
  symbolLookup: number;
  modeGuide: number;
  search: number;
  article: Record<string, number>;
};

type UseGuideRuntimeOptions = {
  closeHistoryPanel: () => void;
  closeLauncher: () => void;
  currentMode: ModeId;
  enabledCapabilities: readonly CapabilityId[];
  openLauncher: () => void;
  setMode: (mode: ModeId) => void;
};

function defaultGuideSelection(): GuideSelectionState {
  return {
    home: 0,
    domain: {
      basics: 0,
      algebra: 0,
      discrete: 0,
      calculus: 0,
      linearAlgebra: 0,
      trigonometry: 0,
      statistics: 0,
      geometry: 0,
    },
    symbolLookup: 0,
    modeGuide: 0,
    search: 0,
    article: {},
  };
}

export function useGuideRuntime({
  closeHistoryPanel,
  closeLauncher,
  currentMode,
  enabledCapabilities,
  openLauncher,
  setMode,
}: UseGuideRuntimeOptions) {
  const [guideRoute, setGuideRoute] = useState<GuideRoute>({ screen: 'home' });
  const [guideSelection, setGuideSelection] =
    useState<GuideSelectionState>(() => defaultGuideSelection());

  const guideRouteMeta = currentMode === 'guide'
    ? getGuideRouteMeta(guideRoute, enabledCapabilities)
    : null;
  const guideListEntries = currentMode === 'guide'
    ? getGuideListEntries(guideRoute, enabledCapabilities)
    : [];
  const currentGuideSelectionIndex =
    currentMode !== 'guide'
      ? 0
      : guideRoute.screen === 'home'
        ? guideSelection.home
        : guideRoute.screen === 'domain'
          ? guideSelection.domain[guideRoute.domainId]
          : guideRoute.screen === 'symbolLookup'
            ? guideSelection.symbolLookup
            : guideRoute.screen === 'modeGuide' && !guideRoute.modeId
              ? guideSelection.modeGuide
              : guideRoute.screen === 'search'
                ? guideSelection.search
                : guideRoute.screen === 'article'
                  ? (guideSelection.article[guideRoute.articleId] ?? 0)
                  : 0;
  const selectedGuideListEntry =
    currentMode === 'guide' && guideListEntries.length > 0
      ? guideListEntries[clampGuideIndex(currentGuideSelectionIndex, guideListEntries.length)]
      : undefined;
  const guideArticle =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getGuideArticle(guideRoute.articleId)
      : null;
  const selectedGuideExample =
    currentMode === 'guide' && guideRoute.screen === 'article'
      ? getSelectedGuideExample(guideArticle ?? undefined, currentGuideSelectionIndex)
      : undefined;
  const guideModeRef =
    currentMode === 'guide' && guideRoute.screen === 'modeGuide' && guideRoute.modeId
      ? getGuideModeRef(guideRoute.modeId)
      : undefined;
  const activeGuideHomeEntries = getActiveGuideHomeEntries(enabledCapabilities);
  const guideSearchQuery =
    currentMode === 'guide'
    && (guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup')
      ? guideRoute.query
      : '';
  const guideSoftMenu = guideRouteMeta?.softActions.map((action) => {
    const meta = guideSoftActionLabel(action);
    return {
      id: action,
      label: meta.label,
      hotkey: meta.hotkey,
    };
  }) ?? [];

  function openGuideRoute(route: GuideRoute) {
    setGuideRoute(route);
  }

  function setCurrentGuideSelectionIndex(index: number) {
    setGuideSelection((currentSelection) => {
      if (guideRoute.screen === 'home') {
        return { ...currentSelection, home: index };
      }

      if (guideRoute.screen === 'domain') {
        return {
          ...currentSelection,
          domain: {
            ...currentSelection.domain,
            [guideRoute.domainId]: index,
          },
        };
      }

      if (guideRoute.screen === 'symbolLookup') {
        return { ...currentSelection, symbolLookup: index };
      }

      if (guideRoute.screen === 'modeGuide' && !guideRoute.modeId) {
        return { ...currentSelection, modeGuide: index };
      }

      if (guideRoute.screen === 'search') {
        return { ...currentSelection, search: index };
      }

      if (guideRoute.screen === 'article') {
        return {
          ...currentSelection,
          article: {
            ...currentSelection.article,
            [guideRoute.articleId]: index,
          },
        };
      }

      return currentSelection;
    });
  }

  function moveCurrentGuideSelection(delta: number) {
    const count =
      guideRoute.screen === 'article'
        ? (guideArticle?.examples.length ?? 0)
        : guideListEntries.length;
    setCurrentGuideSelectionIndex(moveGuideIndex(currentGuideSelectionIndex, delta, count));
  }

  function openSelectedGuideEntry() {
    if (selectedGuideListEntry) {
      openGuideRoute(selectedGuideListEntry.route);
    }
  }

  function goBackInGuide() {
    const parentRoute = getGuideParentRoute(guideRoute);
    if (parentRoute) {
      openGuideRoute(parentRoute);
    } else {
      openLauncher();
    }
  }

  function setGuideQuery(query: string) {
    if (guideRoute.screen === 'search') {
      setGuideRoute({ screen: 'search', query });
      return;
    }

    if (guideRoute.screen === 'symbolLookup') {
      setGuideRoute({ screen: 'symbolLookup', query });
    }
  }

  function openGuideArticle(articleId: string) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'article', articleId });
    setMode('guide');
  }

  function openGuideHome() {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'home' });
    setMode('guide');
  }

  function openGuideMode(modeId: GuideModeId) {
    closeLauncher();
    closeHistoryPanel();
    setGuideRoute({ screen: 'modeGuide', modeId });
    setMode('guide');
  }

  function resetGuideRuntime() {
    setGuideRoute({ screen: 'home' });
    setGuideSelection(defaultGuideSelection());
  }

  return {
    activeGuideHomeEntries,
    currentGuideSelectionIndex,
    goBackInGuide,
    guideArticle,
    guideListEntries,
    guideModeRef,
    guideRoute,
    guideRouteMeta,
    guideSearchQuery,
    guideSelection,
    guideSoftMenu,
    moveCurrentGuideSelection,
    openGuideArticle,
    openGuideHome,
    openGuideMode,
    openGuideRoute,
    openSelectedGuideEntry,
    resetGuideRuntime,
    selectedGuideExample,
    selectedGuideListEntry,
    setCurrentGuideSelectionIndex,
    setGuideQuery,
  };
}
