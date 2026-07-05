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

type GuideNavRoute = 'home' | 'search' | 'symbols' | 'modeGuide';

type GuideNavItem = {
  id: GuideNavRoute;
  icon: typeof BookOpen;
  label: string;
  route: (guide: GuideWorkspaceProps) => Parameters<GuideWorkspaceProps['onOpenGuideRoute']>[0];
};

const GUIDE_NAV_ITEMS: GuideNavItem[] = [
  {
    id: 'home',
    icon: BookOpen,
    label: 'Home',
    route: () => ({ screen: 'home' }),
  },
  {
    id: 'search',
    icon: Search,
    label: 'Search',
    route: (guide) => ({
      screen: 'search',
      query: guide.route.screen === 'search' ? guide.route.query : '',
    }),
  },
  {
    id: 'symbols',
    icon: Keyboard,
    label: 'Symbols',
    route: () => ({ screen: 'symbolLookup', query: '' }),
  },
  {
    id: 'modeGuide',
    icon: Compass,
    label: 'Mode Guide',
    route: () => ({ screen: 'modeGuide' }),
  },
];

function activeGuideNavRoute(route: GuideWorkspaceProps['route']): GuideNavRoute {
  if (route.screen === 'search') {
    return 'search';
  }
  if (route.screen === 'symbolLookup') {
    return 'symbols';
  }
  if (route.screen === 'modeGuide') {
    return 'modeGuide';
  }
  return 'home';
}

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
  const activeRoute = activeGuideNavRoute(guide.route);

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
            {GUIDE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeRoute;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={isActive ? 'is-active' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  data-testid={`guide-route-${item.id}`}
                  onClick={() => guide.onOpenGuideRoute(item.route(guide))}
                >
                  <Icon aria-hidden="true" size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="guide-page-context-card">
            <span>Current route</span>
            <strong>{selectedRouteLabel}</strong>
            <p>{selectedRouteDescription}</p>
            <div className="guide-page-route-metadata" aria-label="Guide route details">
              <span>{guide.routeMeta?.breadcrumb.join(' / ') ?? 'Guide'}</span>
              <span>{guide.listEntries.length} entries</span>
            </div>
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
