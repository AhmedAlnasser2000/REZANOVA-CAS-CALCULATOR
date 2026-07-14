import { describe, expect, it } from 'vitest';
import {
  defaultStatisticsScreenForSection,
  getStatisticsParentScreen,
  getStatisticsRouteMeta,
  getStatisticsSoftActions,
  moveStatisticsMenuIndex,
  statisticsSectionForScreen,
  statisticsWorkspaceScreenForLegacyScreen,
} from './navigation';

describe('Statistics section navigation', () => {
  it('retains route metadata and guide links for legacy launch targets', () => {
    expect(getStatisticsRouteMeta('home').breadcrumb).toEqual(['Statistics']);
    expect(getStatisticsRouteMeta('probabilityHome').guideArticleId).toBe('statistics-probability');
    expect(getStatisticsRouteMeta('inferenceHome').guideArticleId).toBe('statistics-inference');
    expect(getStatisticsRouteMeta('correlation').breadcrumb).toEqual([
      'Statistics',
      'Correlation',
    ]);
    expect(getStatisticsRouteMeta('binomial').editorMode).toBe('editable');
    expect(getStatisticsRouteMeta('frequency').focusTarget).toBe('guidedForm');
  });

  it('retains legacy menu movement, parents, and soft actions', () => {
    expect(moveStatisticsMenuIndex('home', 0, -1)).toBe(0);
    expect(moveStatisticsMenuIndex('home', 3, 10)).toBe(6);
    expect(moveStatisticsMenuIndex('probabilityHome', 0, 10)).toBe(2);
    expect(moveStatisticsMenuIndex('inferenceHome', 0, 10)).toBe(0);
    expect(getStatisticsParentScreen('home')).toBeNull();
    expect(getStatisticsParentScreen('dataEntry')).toBe('home');
    expect(getStatisticsParentScreen('binomial')).toBe('probabilityHome');
    expect(getStatisticsParentScreen('meanInference')).toBe('inferenceHome');
    expect(getStatisticsSoftActions('home').map((action) => action.id)).toEqual([
      'open', 'guide', 'back', 'exit',
    ]);
    expect(getStatisticsSoftActions('descriptive').map((action) => action.id)).toEqual([
      'evaluate', 'guide', 'menu', 'clear', 'history',
    ]);
  });

  it('maps every legacy screen into one of the four consolidated sections', () => {
    expect(statisticsSectionForScreen('home')).toBe('dataSummary');
    expect(statisticsSectionForScreen('frequency')).toBe('dataSummary');
    expect(statisticsSectionForScreen('probabilityHome')).toBe('probability');
    expect(statisticsSectionForScreen('poisson')).toBe('probability');
    expect(statisticsSectionForScreen('inferenceHome')).toBe('inference');
    expect(statisticsSectionForScreen('meanInference')).toBe('inference');
    expect(statisticsSectionForScreen('regression')).toBe('relationships');
    expect(statisticsSectionForScreen('correlation')).toBe('relationships');
  });

  it('resolves legacy menu screens to usable section surfaces', () => {
    expect(statisticsWorkspaceScreenForLegacyScreen('home')).toBe('descriptive');
    expect(statisticsWorkspaceScreenForLegacyScreen('probabilityHome')).toBe('binomial');
    expect(statisticsWorkspaceScreenForLegacyScreen('inferenceHome')).toBe('meanInference');
    expect(defaultStatisticsScreenForSection('relationships')).toBe('regression');
  });
});
