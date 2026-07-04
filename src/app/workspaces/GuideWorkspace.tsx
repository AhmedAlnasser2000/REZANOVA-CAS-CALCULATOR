import type { RefObject } from 'react';
import { MODE_LABELS } from '../../lib/navigation/menu';
import { getGuideArticle } from '../../lib/guide/content';
import type { GuideListEntry } from '../../lib/guide/navigation';
import type { GuideArticle, GuideModeRef, GuideRoute, GuideRouteMeta } from '../../types/calculator';

export type GuideWorkspaceProps = {
  route: GuideRoute;
  routeMeta: GuideRouteMeta | null;
  listEntries: GuideListEntry[];
  currentSelectionIndex: number;
  homeEntryCount: number;
  searchInputRef: RefObject<HTMLInputElement | null>;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  searchQuery: string;
  article: GuideArticle | null;
  modeRef: GuideModeRef | null;
  selectedGuideListEntry?: GuideListEntry;
  onOpenGuideRoute: (route: GuideRoute) => void;
  onSetCurrentSelectionIndex: (index: number) => void;
  onSetGuideQuery: (query: string) => void;
  onLaunchGuideExample: (example: GuideArticle['examples'][number]) => void;
  onCopyGuideExample: (example: GuideArticle['examples'][number]) => void;
  surface?: 'calculator' | 'page';
};

const UNIT_CIRCLE_POINTS = [
  { id: '0', x: 1, y: 0, major: true },
  { id: '30', x: 0.866, y: 0.5, major: false },
  { id: '45', x: 0.707, y: 0.707, major: false },
  { id: '60', x: 0.5, y: 0.866, major: false },
  { id: '90', x: 0, y: 1, major: true },
  { id: '120', x: -0.5, y: 0.866, major: false },
  { id: '135', x: -0.707, y: 0.707, major: false },
  { id: '150', x: -0.866, y: 0.5, major: false },
  { id: '180', x: -1, y: 0, major: true },
  { id: '210', x: -0.866, y: -0.5, major: false },
  { id: '225', x: -0.707, y: -0.707, major: false },
  { id: '240', x: -0.5, y: -0.866, major: false },
  { id: '270', x: 0, y: -1, major: true },
  { id: '300', x: 0.5, y: -0.866, major: false },
  { id: '315', x: 0.707, y: -0.707, major: false },
  { id: '330', x: 0.866, y: -0.5, major: false },
];

const UNIT_CIRCLE_RAYS = [
  { label: '30° / π/6', x: 0.866, y: 0.5, labelX: 252, labelY: 94 },
  { label: '45° / π/4', x: 0.707, y: 0.707, labelX: 236, labelY: 64 },
  { label: '60° / π/3', x: 0.5, y: 0.866, labelX: 203, labelY: 45 },
];

function UnitCircleGuideDiagram() {
  const center = 150;
  const radius = 108;

  return (
    <section className="editor-card guide-section unit-circle-guide">
      <h3 className="guide-section-title">Unit Circle Diagram</h3>
      <div className="unit-circle-guide-layout">
        <svg
          className="unit-circle-guide-diagram"
          viewBox="0 0 320 300"
          role="img"
          aria-label="Unit circle with standard degree and radian angle labels"
        >
          <circle className="unit-circle-fill" cx={center} cy={center} r={radius} />
          <line className="unit-circle-axis" x1="26" y1={center} x2="285" y2={center} />
          <line className="unit-circle-axis" x1={center} y1="20" x2={center} y2="280" />
          {UNIT_CIRCLE_RAYS.map((ray) => {
            const rayX = center + ray.x * radius;
            const rayY = center - ray.y * radius;

            return (
              <g key={ray.label}>
                <line className="unit-circle-ray" x1={center} y1={center} x2={rayX} y2={rayY} />
                <text className="unit-circle-ray-label" x={ray.labelX} y={ray.labelY}>
                  {ray.label}
                </text>
              </g>
            );
          })}
          <circle className="unit-circle-outline" cx={center} cy={center} r={radius} />
          <text className="unit-circle-axis-label" x="292" y={center - 8}>cos</text>
          <text className="unit-circle-axis-label" x={center + 8} y="18">sin</text>
          <text className="unit-circle-major-label" x={center + radius + 10} y={center + 18}>0, 2π</text>
          <text className="unit-circle-major-label" x={center} y={center - radius - 15} textAnchor="middle">π/2</text>
          <text className="unit-circle-major-label" x={center - radius - 14} y={center + 18} textAnchor="end">π</text>
          <text className="unit-circle-major-label" x={center} y={center + radius + 20} textAnchor="middle">3π/2</text>
          <text className="unit-circle-quadrant-label" x={center + 47} y={center - 54}>QI</text>
          <text className="unit-circle-quadrant-label" x={center - 61} y={center - 54}>QII</text>
          <text className="unit-circle-quadrant-label" x={center - 64} y={center + 62}>QIII</text>
          <text className="unit-circle-quadrant-label" x={center + 47} y={center + 62}>QIV</text>
          {UNIT_CIRCLE_POINTS.map((point) => {
            const x = center + point.x * radius;
            const y = center - point.y * radius;

            return (
              <circle
                key={point.id}
                className={point.major ? 'unit-circle-point unit-circle-point-major' : 'unit-circle-point'}
                cx={x}
                cy={y}
                r={point.major ? 5 : 3.5}
              />
            );
          })}
        </svg>
        <div className="unit-circle-guide-note">
          <strong>Read it as coordinates</strong>
          <p>
            Every point is (cos θ, sin θ). Tangent is sin θ / cos θ.
          </p>
          <div className="unit-circle-special-list" aria-label="First quadrant special angles">
            <span>30° = π/6</span>
            <span>45° = π/4</span>
            <span>60° = π/3</span>
          </div>
          <p>
            First-quadrant coordinates use 1/2, √2/2, and √3/2. Reflect those points across
            the axes to get the signs in the other quadrants.
          </p>
        </div>
      </div>
    </section>
  );
}

export function GuideWorkspace({
  route,
  routeMeta,
  listEntries,
  currentSelectionIndex,
  homeEntryCount,
  searchInputRef,
  menuPanelRef,
  searchQuery,
  article,
  modeRef,
  onOpenGuideRoute,
  onSetCurrentSelectionIndex,
  onSetGuideQuery,
  onLaunchGuideExample,
  onCopyGuideExample,
  surface = 'calculator',
}: GuideWorkspaceProps) {
  const articleLike = route.screen === 'article' || (route.screen === 'modeGuide' && route.modeId);
  const panelClassName = surface === 'page'
    ? `guide-page-content ${articleLike ? 'guide-page-content--article' : 'guide-page-content--menu'}`
    : `mode-panel ${articleLike ? 'guide-article-panel' : 'guide-menu-panel'}`;

  return (
    <section className={panelClassName}>
      {routeMeta ? (
        <div className="equation-panel-header guide-panel-header">
          <div className="equation-panel-copy">
            <div className="guide-breadcrumbs">
              {routeMeta.breadcrumb.map((segment) => (
                <span key={`${route.screen}-workspace-${segment}`} className="guide-breadcrumb">
                  {segment}
                </span>
              ))}
            </div>
            <div className="card-title-row">
              <strong>{routeMeta.title}</strong>
            </div>
            <p className="equation-hint">{routeMeta.description}</p>
          </div>
        </div>
      ) : null}

      {(route.screen === 'home'
        || route.screen === 'domain'
        || route.screen === 'symbolLookup'
        || route.screen === 'search'
        || (route.screen === 'modeGuide' && !route.modeId)) ? (
          <>
            {(route.screen === 'search' || route.screen === 'symbolLookup') ? (
              <label className="guide-search-row guide-search-row-panel">
                <span>{route.screen === 'symbolLookup' ? 'Filter symbols' : 'Search guide'}</span>
                <input
                  ref={routeMeta?.focusTarget === 'search' ? searchInputRef : undefined}
                  className="guide-search-input"
                  value={searchQuery}
                  onChange={(event) => onSetGuideQuery(event.target.value)}
                  placeholder={route.screen === 'symbolLookup' ? 'sum, sigma, nCr, integral...' : 'Search domains, symbols, modes...'}
                />
              </label>
            ) : null}
            <div
              ref={menuPanelRef}
              className="guide-list"
              tabIndex={-1}
            >
              {listEntries.length === 0 ? (
                <div className="guide-empty">No active guide entries match this view yet.</div>
              ) : listEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  className={`guide-entry ${index === currentSelectionIndex ? 'is-selected' : ''}`}
                  onClick={() => onOpenGuideRoute(entry.route)}
                  onMouseEnter={() => onSetCurrentSelectionIndex(index)}
                >
                  <span className="launcher-entry-hotkey">{entry.hotkey ?? `${index + 1}`}</span>
                  <span className="launcher-entry-content">
                    <strong>{entry.title}</strong>
                    <small>{entry.description}</small>
                  </span>
                  {'resultKind' in entry && entry.resultKind ? (
                    <span className="guide-result-kind">{entry.resultKind}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="guide-menu-help">
              <span>
                {route.screen === 'home'
                  ? `1-${homeEntryCount}: Open | EXE/F1: Select | F5: MENU | F6: Exit`
                  : 'Arrow keys or ◂/▸ move | EXE/F1 opens | F5/Esc back | F6 exit'}
              </span>
            </div>
          </>
        ) : null}

      {route.screen === 'article' && article ? (
        <div className="guide-article">
          <section className="editor-card guide-section guide-teaching-panel">
            <h3 className="guide-section-title">What It Is</h3>
            <ul className="guide-bullets">
              {article.whatItIs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {article.whatItMeans?.length ? (
            <section className="editor-card guide-section guide-meaning-panel">
              <h3 className="guide-section-title">What It Means</h3>
              <ul className="guide-bullets">
                {article.whatItMeans.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {article.id === 'trig-special-angles' ? <UnitCircleGuideDiagram /> : null}
          <section className="editor-card guide-section guide-teaching-panel">
            <h3 className="guide-section-title">How To Use It</h3>
            <ul className="guide-bullets">
              {article.howToUse.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Concepts</h3>
            <ul className="guide-bullets">
              {article.concepts.map((concept) => (
                <li key={concept}>{concept}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Where To Find It</h3>
            <ul className="guide-bullets">
              {article.whereToFindIt.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Best Modes</h3>
            <div className="guide-chip-row">
              {article.bestModes.map((mode) => (
                <button
                  key={mode}
                  className="guide-chip"
                  onClick={() => onOpenGuideRoute({ screen: 'modeGuide', modeId: mode })}
                >
                  {MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Worked Examples</h3>
            <div className="guide-example-list">
              {article.examples.map((example, index) => (
                <article
                  key={example.id}
                  className={`guide-example ${index === currentSelectionIndex ? 'is-selected' : ''}`}
                  onMouseEnter={() => onSetCurrentSelectionIndex(index)}
                >
                  <div className="card-title-row">
                    <strong>{example.title}</strong>
                    {index === currentSelectionIndex ? (
                      <span className="guide-result-kind">Selected</span>
                    ) : null}
                  </div>
                  <p>{example.explanation}</p>
                  <ol className="guide-steps">
                    {example.steps.map((step) => (
                      <li key={step} className="guide-step">{step}</li>
                    ))}
                  </ol>
                  <p className="guide-expected">Expected: {example.expected}</p>
                  <div className="display-card-actions">
                    <button onClick={() => onLaunchGuideExample(example)}>Open in Tool</button>
                    <button onClick={() => onCopyGuideExample(example)}>Copy Expr</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">Common Mistakes</h3>
            <ul className="guide-bullets">
              {article.pitfalls.map((pitfall) => (
                <li key={pitfall}>{pitfall}</li>
              ))}
            </ul>
          </section>
          {article.exactVsNumeric?.length ? (
            <section className="editor-card guide-section">
              <h3 className="guide-section-title">Exact vs Numeric</h3>
              <ul className="guide-bullets">
                {article.exactVsNumeric.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {article.relatedArticleIds?.length ? (
            <section className="editor-card guide-section">
              <h3 className="guide-section-title">Related Topics</h3>
              <div className="guide-related-links">
                {article.relatedArticleIds.map((articleId) => {
                  const relatedArticle = getGuideArticle(articleId);
                  if (!relatedArticle) {
                    return null;
                  }

                  return (
                    <button
                      key={articleId}
                      className="guide-chip"
                      onClick={() => onOpenGuideRoute({ screen: 'article', articleId })}
                    >
                      {relatedArticle.title}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {route.screen === 'modeGuide' && modeRef ? (
        <div className="guide-article">
          <section className="editor-card guide-section guide-mode-card">
            <h3 className="guide-section-title">{modeRef.title}</h3>
            <p>{modeRef.summary}</p>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">When To Use It</h3>
            <ul className="guide-bullets">
              {modeRef.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <section className="editor-card guide-section">
            <h3 className="guide-section-title">When Not To Use It</h3>
            <ul className="guide-bullets">
              {modeRef.avoidFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          {modeRef.articleIds.length > 0 ? (
            <section className="editor-card guide-section">
              <strong>Related topics</strong>
              <div className="guide-related-links">
                {modeRef.articleIds.map((articleId) => {
                  const relatedArticle = getGuideArticle(articleId);
                  if (!relatedArticle) {
                    return null;
                  }

                  return (
                    <button
                      key={articleId}
                      className="guide-chip"
                      onClick={() => onOpenGuideRoute({ screen: 'article', articleId })}
                    >
                      {relatedArticle.title}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
