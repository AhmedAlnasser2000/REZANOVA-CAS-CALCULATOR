import type {
  CapabilityId,
  GuideRoute,
  GuideSearchResult,
} from '../../types/calculator';
import {
  getActiveGuideArticles,
  getActiveGuideDomains,
  getActiveGuideModeRefs,
} from './content';
import { getActiveGuideSymbols } from './symbols';

function includesNormalized(value: string, query: string) {
  return value.toLowerCase().includes(query);
}

export function searchGuide(
  query: string,
  enabledCapabilities: readonly CapabilityId[],
): GuideSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const domainResults: GuideSearchResult[] = getActiveGuideDomains(enabledCapabilities)
    .filter((domain) =>
      includesNormalized(domain.title, normalizedQuery)
      || includesNormalized(domain.summary, normalizedQuery),
    )
    .map((domain) => ({
      kind: 'domain',
      id: domain.id,
      title: domain.title,
      description: domain.summary,
      route: { screen: 'domain', domainId: domain.id } satisfies GuideRoute,
    }));

  const articleResults: GuideSearchResult[] = getActiveGuideArticles(enabledCapabilities)
    .filter((article) =>
      includesNormalized(article.title, normalizedQuery)
      || includesNormalized(article.summary, normalizedQuery)
      || article.whatItIs.some((item) => includesNormalized(item, normalizedQuery))
      || article.whatItMeans?.some((item) => includesNormalized(item, normalizedQuery)) === true
      || article.howToUse.some((item) => includesNormalized(item, normalizedQuery))
      || article.concepts.some((concept) => includesNormalized(concept, normalizedQuery))
      || article.whereToFindIt.some((item) => includesNormalized(item, normalizedQuery))
      || article.pitfalls.some((pitfall) => includesNormalized(pitfall, normalizedQuery))
      || article.exactVsNumeric?.some((item) => includesNormalized(item, normalizedQuery)) === true
    )
    .map((article) => ({
      kind: 'article',
      id: article.id,
      title: article.title,
      description: article.summary,
      route: { screen: 'article', articleId: article.id } satisfies GuideRoute,
    }));

  const symbolResults: GuideSearchResult[] = getActiveGuideSymbols(enabledCapabilities)
    .filter((symbol) =>
      includesNormalized(symbol.label, normalizedQuery)
      || includesNormalized(symbol.meaning, normalizedQuery)
      || includesNormalized(symbol.keyboardPageId ?? '', normalizedQuery),
    )
    .map((symbol) => ({
      kind: 'symbol',
      id: symbol.id,
      title: symbol.label,
      description: symbol.meaning,
      route: { screen: 'article', articleId: symbol.articleIds[0] } satisfies GuideRoute,
      symbolId: symbol.id,
    }));

  const modeResults: GuideSearchResult[] = getActiveGuideModeRefs(enabledCapabilities)
    .filter((modeRef) =>
      includesNormalized(modeRef.title, normalizedQuery)
      || includesNormalized(modeRef.summary, normalizedQuery)
      || modeRef.bestFor.some((item) => includesNormalized(item, normalizedQuery))
      || modeRef.avoidFor.some((item) => includesNormalized(item, normalizedQuery)),
    )
    .map((modeRef) => ({
      kind: 'mode',
      id: modeRef.modeId,
      title: modeRef.title,
      description: modeRef.summary,
      route: { screen: 'modeGuide', modeId: modeRef.modeId } satisfies GuideRoute,
    }));

  return [...domainResults, ...articleResults, ...symbolResults, ...modeResults];
}
