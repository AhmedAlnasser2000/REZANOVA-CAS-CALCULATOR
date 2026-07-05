import { describe, expect, it } from 'vitest';
import { ACTIVE_CAPABILITIES } from '../virtual-keyboard/capabilities';
import {
  getActiveGuideArticles,
  getActiveGuideDomains,
  getActiveGuideHomeEntries,
  getActiveGuideModeRefs,
  getGuideArticle,
  getGuideArticlesForDomain,
  getGuideModeRef,
} from './content';
import { searchGuide } from './search';

describe('guide content parity contract', () => {
  it('keeps required core article ids available', () => {
    const requiredArticleIds = [
      'algebra-equations',
      'trig-equations',
      'geometry-solids-3d',
      'statistics-probability',
      'statistics-inference',
      'calculus-integrals',
      'trig-period-phase',
    ] as const;

    requiredArticleIds.forEach((articleId) => {
      expect(getGuideArticle(articleId)).toBeDefined();
    });
  });

  it('keeps active-article capability gating stable for track-critical articles', () => {
    const activeIds = new Set(getActiveGuideArticles(ACTIVE_CAPABILITIES).map((article) => article.id));

    expect(activeIds.has('algebra-equations')).toBe(true);
    expect(activeIds.has('trig-equations')).toBe(true);
    expect(activeIds.has('trig-period-phase')).toBe(true);
    expect(activeIds.has('statistics-inference')).toBe(true);
    expect(activeIds.has('geometry-solids-3d')).toBe(true);
  });

  it('keeps mode-ref coverage for active app modes', () => {
    expect(getGuideModeRef('equation')?.title).toBe('Equation');
    expect(getGuideModeRef('calculus')?.title).toBe('Calculus');
    expect(getGuideModeRef('trigonometry')?.title).toBe('Trigonometry');
    expect(getGuideModeRef('geometry')?.title).toBe('Geometry');
    expect(getGuideModeRef('statistics')?.title).toBe('Statistics');
  });

  it('keeps every active domain article reachable from its domain list', () => {
    for (const domain of getActiveGuideDomains(ACTIVE_CAPABILITIES)) {
      const domainArticleIds = getGuideArticlesForDomain(domain.id).map((article) => article.id);

      expect(domainArticleIds.length, `${domain.id} should expose domain articles`).toBeGreaterThan(0);
      for (const articleId of domain.articleIds) {
        expect(domainArticleIds, `${articleId} should be listed under ${domain.id}`).toContain(articleId);
        expect(getGuideArticle(articleId), `${articleId} should resolve to Guide content`).toBeDefined();
      }
    }
  });

  it('keeps active mode references and related links on active articles', () => {
    const activeIds = new Set(getActiveGuideArticles(ACTIVE_CAPABILITIES).map((article) => article.id));

    for (const modeRef of getActiveGuideModeRefs(ACTIVE_CAPABILITIES)) {
      for (const articleId of modeRef.articleIds) {
        expect(activeIds.has(articleId), `${modeRef.modeId} mode ref points to inactive ${articleId}`).toBe(true);
      }
    }

    for (const article of getActiveGuideArticles(ACTIVE_CAPABILITIES)) {
      for (const articleId of article.relatedArticleIds) {
        expect(activeIds.has(articleId), `${article.id} links to inactive ${articleId}`).toBe(true);
      }
    }
  });

  it('keeps home entries aligned with active domains and utility pages', () => {
    const homeEntries = getActiveGuideHomeEntries(ACTIVE_CAPABILITIES);
    const activeDomainIds = getActiveGuideDomains(ACTIVE_CAPABILITIES).map((domain) => domain.id);

    expect(homeEntries.map((entry) => entry.id)).toEqual([
      ...activeDomainIds,
      'symbolLookup',
      'modeGuide',
    ]);
  });

  it('keeps active article titles discoverable through search', () => {
    for (const article of getActiveGuideArticles(ACTIVE_CAPABILITIES)) {
      expect(
        searchGuide(article.title, ACTIVE_CAPABILITIES).some((result) => result.id === article.id),
        `${article.id} should be searchable by title`,
      ).toBe(true);
    }
  });
});
