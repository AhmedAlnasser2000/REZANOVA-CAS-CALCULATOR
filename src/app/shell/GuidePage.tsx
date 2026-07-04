import {
  BookOpen,
  Compass,
  Keyboard,
  Search,
} from 'lucide-react';
import { GuideWorkspace, type GuideWorkspaceProps } from '../workspaces/GuideWorkspace';

type GuidePageProps = {
  guide: GuideWorkspaceProps;
};

function routeLabel(guide: GuideWorkspaceProps) {
  const { article, modeRef, route, routeMeta, selectedGuideListEntry } = guide;

  if (route.screen === 'article') {
    return article?.title ?? routeMeta?.title ?? 'Article';
  }
  if (route.screen === 'modeGuide' && modeRef) {
    return modeRef.title;
  }
  return selectedGuideListEntry?.title ?? routeMeta?.title ?? 'Guide';
}

function routeDescription(guide: GuideWorkspaceProps) {
  const { article, modeRef, route, routeMeta, selectedGuideListEntry } = guide;

  if (route.screen === 'article') {
    return article?.summary ?? routeMeta?.description ?? 'Reference article';
  }
  if (route.screen === 'modeGuide' && modeRef) {
    return modeRef.summary;
  }
  return selectedGuideListEntry?.description ?? routeMeta?.description ?? 'Browse active topics';
}

export function GuidePage({ guide }: GuidePageProps) {
  const selectedRouteLabel = routeLabel(guide);
  const selectedRouteDescription = routeDescription(guide);

  return (
    <section className="app-page app-page--guide" data-testid="guide-page">
      <header className="app-page-shell-header">REZANOVA CLASSWIZ CALCULATOR</header>
      <div className="guide-page-workbench">
        <aside className="guide-page-nav" aria-label="Guide routes">
          <div className="guide-page-title">
            <span>REFERENCE PAGE</span>
            <h1>Guide</h1>
            <p>Browse active topics, symbols, mode guidance, and worked examples.</p>
          </div>
          <div className="guide-page-route-actions">
            <button type="button" onClick={() => guide.onOpenGuideRoute({ screen: 'home' })}>
              <BookOpen aria-hidden="true" size={18} />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() =>
                guide.onOpenGuideRoute({
                  screen: 'search',
                  query: guide.route.screen === 'search' ? guide.route.query : '',
                })}
            >
              <Search aria-hidden="true" size={18} />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => guide.onOpenGuideRoute({ screen: 'symbolLookup', query: '' })}
            >
              <Keyboard aria-hidden="true" size={18} />
              <span>Symbols</span>
            </button>
            <button type="button" onClick={() => guide.onOpenGuideRoute({ screen: 'modeGuide' })}>
              <Compass aria-hidden="true" size={18} />
              <span>Mode Guide</span>
            </button>
          </div>
          <div className="guide-page-context-card">
            <span>Current route</span>
            <strong>{selectedRouteLabel}</strong>
            <p>{selectedRouteDescription}</p>
          </div>
          <div className="guide-page-brand">
            <BookOpen aria-hidden="true" size={18} />
            <div>
              <strong>REZANOVA</strong>
              <span>CLASSWIZ CALCULATOR</span>
            </div>
          </div>
        </aside>
        <main className="guide-page-main" data-testid="guide-page-main">
          <GuideWorkspace {...guide} surface="page" />
        </main>
      </div>
      <footer className="app-page-shell-footer">
        <span>Ready</span>
        <span>Workspace: Guide</span>
        <span>Mode: N/A (Page Surface)</span>
      </footer>
    </section>
  );
}
