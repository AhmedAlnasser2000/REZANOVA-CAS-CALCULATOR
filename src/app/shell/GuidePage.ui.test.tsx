import { createRef } from 'react';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createKeyboardContext } from '../../lib/virtual-keyboard/capabilities';
import { getActiveGuideHomeEntries } from '../../lib/guide/content';
import {
  getGuideListEntries,
  getGuideRouteMeta,
} from '../../lib/guide/navigation';
import type { GuideRoute } from '../../types/calculator';
import type { GuideWorkspaceProps } from '../workspaces/GuideWorkspace';
import { GuidePage } from './GuidePage';
import '../../styles/app/shell.css';
import '../../styles/app/guide.css';

const enabledCapabilities = createKeyboardContext('calculate').enabledCapabilities;

function guideProps(route: GuideRoute = { screen: 'home' }): GuideWorkspaceProps {
  return {
    article: null,
    currentSelectionIndex: 0,
    homeEntryCount: getActiveGuideHomeEntries(enabledCapabilities).length,
    listEntries: getGuideListEntries(route, enabledCapabilities),
    menuPanelRef: createRef<HTMLDivElement>(),
    modeRef: null,
    onCopyGuideExample: vi.fn(),
    onLaunchGuideExample: vi.fn(),
    onOpenGuideRoute: vi.fn(),
    onSetCurrentSelectionIndex: vi.fn(),
    onSetGuideQuery: vi.fn(),
    route,
    routeMeta: getGuideRouteMeta(route, enabledCapabilities),
    searchInputRef: createRef<HTMLInputElement>(),
    searchQuery: route.screen === 'search' || route.screen === 'symbolLookup'
      ? route.query
      : '',
  };
}

describe('GuidePage', () => {
  it('marks the active route and routes page navigation buttons', () => {
    const guide = guideProps({ screen: 'search', query: 'integral' });

    render(<GuidePage guide={guide} />);

    expect(screen.getByTestId('guide-page')).toBeInTheDocument();
    expect(screen.getByTestId('guide-route-search')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('guide-route-home')).not.toHaveAttribute('aria-current');
    expect(screen.getByText(/entries/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('guide-route-symbols'));
    expect(guide.onOpenGuideRoute).toHaveBeenCalledWith({
      screen: 'symbolLookup',
      query: '',
    });

    fireEvent.click(screen.getByTestId('guide-route-search'));
    expect(guide.onOpenGuideRoute).toHaveBeenCalledWith({
      screen: 'search',
      query: 'integral',
    });
  });

  it('treats articles as Guide home reference content and preserves entry focus updates', () => {
    const articleGuide = guideProps({ screen: 'article', articleId: 'calculus-derivatives' });
    const { unmount } = render(<GuidePage guide={articleGuide} />);

    expect(screen.getByTestId('guide-route-home')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Article')).toBeInTheDocument();

    unmount();

    const homeGuide = guideProps();
    render(<GuidePage guide={homeGuide} />);

    expect(screen.getByTestId('guide-route-home')).toHaveAttribute('aria-current', 'page');
    const firstEntry = screen.getAllByRole('button', { name: /Basics|Algebra|Calculus/ })[0];

    fireEvent.focus(firstEntry);
    expect(homeGuide.onSetCurrentSelectionIndex).toHaveBeenCalledWith(0);
  });
});
