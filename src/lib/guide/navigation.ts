import type {
  CapabilityId,
  GuideHomeEntry,
  GuideRoute,
  GuideRouteMeta,
  GuideSearchResult,
  GuideSoftAction,
} from '../../types/calculator';
import {
  getActiveGuideArticles,
  getActiveGuideDomains,
  getActiveGuideHomeEntries,
  getActiveGuideModeRefs,
  getGuideArticle,
  getGuideArticlesForDomain,
  getGuideModeRef,
} from './content';
import { getActiveGuideSymbols } from './symbols';
import { searchGuide } from './search';

export type GuideListEntry =
  | {
      id: string;
      hotkey?: string;
      title: string;
      description: string;
      route: GuideRoute;
    }
  | {
      id: string;
      hotkey?: string;
      title: string;
      description: string;
      route: GuideRoute;
      resultKind: GuideSearchResult['kind'];
    };

function routeSoftActions(route: GuideRoute): GuideSoftAction[] {
  switch (route.screen) {
    case 'home':
      return ['open', 'search', 'symbols', 'modes', 'back', 'exit'];
    case 'domain':
      return ['open', 'search', 'symbols', 'back', 'exit'];
    case 'article':
      return ['load', 'search', 'copy', 'back', 'exit'];
    case 'symbolLookup':
      return ['open', 'search', 'back', 'exit'];
    case 'modeGuide':
      return ['open', 'search', 'back', 'exit'];
    case 'search':
      return ['open', 'search', 'back', 'exit'];
  }
}

export function getGuideRouteMeta(
  route: GuideRoute,
  enabledCapabilities: readonly CapabilityId[],
): GuideRouteMeta {
  switch (route.screen) {
    case 'home':
      return {
        title: 'Guide Home',
        breadcrumb: ['Guide', 'Home'],
        description: 'Browse active topics, symbol reference, and mode guidance.',
        focusTarget: 'menu',
        softActions: routeSoftActions(route),
      };
    case 'domain': {
      const domain = getActiveGuideDomains(enabledCapabilities).find((item) => item.id === route.domainId);
      return {
        title: domain?.title ?? 'Domain',
        breadcrumb: ['Guide', domain?.title ?? 'Domain'],
        description: domain?.summary ?? 'Browse articles for this domain.',
        focusTarget: 'menu',
        softActions: routeSoftActions(route),
      };
    }
    case 'article': {
      const article = getGuideArticle(route.articleId);
      const domain = article ? getActiveGuideDomains(enabledCapabilities).find((item) => item.id === article.domainId) : undefined;
      return {
        title: article?.title ?? 'Article',
        breadcrumb: ['Guide', domain?.title ?? 'Article', article?.title ?? 'Article'],
        description: article?.summary ?? 'Read this guide article and launch examples.',
        focusTarget: 'article',
        softActions: routeSoftActions(route),
      };
    }
    case 'symbolLookup':
      return {
        title: 'Symbol Lookup',
        breadcrumb: ['Guide', 'Symbol Lookup'],
        description: 'Search active symbols, operators, keyboard pages, and support levels.',
        focusTarget: 'search',
        softActions: routeSoftActions(route),
      };
    case 'modeGuide':
      return {
        title: route.modeId ? getGuideModeRef(route.modeId)?.title ?? 'Mode Guide' : 'Mode Guide',
        breadcrumb: ['Guide', 'Mode Guide', ...(route.modeId ? [getGuideModeRef(route.modeId)?.title ?? route.modeId] : [])],
        description: route.modeId
          ? getGuideModeRef(route.modeId)?.summary ?? 'Mode details.'
          : 'Learn when to use each main calculator mode.',
        focusTarget: route.modeId ? 'article' : 'menu',
        softActions: routeSoftActions(route),
      };
    case 'search':
      return {
        title: 'Search',
        breadcrumb: ['Guide', 'Search'],
        description: route.query.trim()
          ? `Search results for "${route.query.trim()}".`
          : 'Search domains, articles, symbols, and modes.',
        focusTarget: 'search',
        softActions: routeSoftActions(route),
      };
  }
}

export function getGuideParentRoute(route: GuideRoute): GuideRoute | null {
  switch (route.screen) {
    case 'home':
      return null;
    case 'domain':
    case 'symbolLookup':
    case 'search':
      return { screen: 'home' };
    case 'modeGuide':
      return route.modeId ? { screen: 'modeGuide' } : { screen: 'home' };
    case 'article': {
      const article = getGuideArticle(route.articleId);
      return article ? { screen: 'domain', domainId: article.domainId } : { screen: 'home' };
    }
  }
}

export function clampGuideIndex(index: number, count: number) {
  if (count <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), count - 1);
}

export function moveGuideIndex(index: number, delta: number, count: number) {
  return clampGuideIndex(index + delta, count);
}

function homeEntryToRoute(entry: GuideHomeEntry): GuideRoute {
  if (entry.id === 'symbolLookup') {
    return { screen: 'symbolLookup', query: '' };
  }

  if (entry.id === 'modeGuide') {
    return { screen: 'modeGuide' };
  }

  return { screen: 'domain', domainId: entry.id };
}

export function getGuideListEntries(
  route: GuideRoute,
  enabledCapabilities: readonly CapabilityId[],
): GuideListEntry[] {
  switch (route.screen) {
    case 'home':
      return getActiveGuideHomeEntries(enabledCapabilities).map((entry) => ({
        id: entry.id,
        hotkey: entry.hotkey,
        title: entry.title,
        description: entry.description,
        route: homeEntryToRoute(entry),
      }));
    case 'domain':
      return getGuideArticlesForDomain(route.domainId)
        .filter((article) => getActiveGuideArticles(enabledCapabilities).some((candidate) => candidate.id === article.id))
        .map((article, index) => ({
          id: article.id,
          hotkey: `${index + 1}`,
          title: article.title,
          description: article.summary,
          route: { screen: 'article', articleId: article.id } as GuideRoute,
        }));
    case 'symbolLookup':
      return getActiveGuideSymbols(enabledCapabilities)
        .filter((symbol) => {
          const query = route.query.trim().toLowerCase();
          if (!query) {
            return true;
          }

          return symbol.label.toLowerCase().includes(query)
            || symbol.meaning.toLowerCase().includes(query)
            || (symbol.keyboardPageId ?? '').toLowerCase().includes(query);
        })
        .map((symbol) => ({
          id: symbol.id,
          title: symbol.label,
          description: `${symbol.meaning} • ${symbol.keyboardPageId ?? 'no page'}`,
          route: { screen: 'article', articleId: symbol.articleIds[0] } as GuideRoute,
          resultKind: 'symbol' as const,
        }));
    case 'modeGuide':
      if (route.modeId) {
        return [];
      }

      return getActiveGuideModeRefs(enabledCapabilities).map((modeRef, index) => ({
        id: modeRef.modeId,
        hotkey: `${index + 1}`,
        title: modeRef.title,
        description: modeRef.summary,
        route: { screen: 'modeGuide', modeId: modeRef.modeId } as GuideRoute,
      }));
    case 'search':
      return searchGuide(route.query, enabledCapabilities).map((result) => ({
        id: `${result.kind}-${result.id}`,
        title: result.title,
        description: result.description,
        route: result.route,
        resultKind: result.kind,
      }));
    case 'article':
      return [];
  }
}
