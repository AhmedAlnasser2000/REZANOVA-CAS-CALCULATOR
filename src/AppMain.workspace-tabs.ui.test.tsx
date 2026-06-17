import {
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  openLauncherApp,
  renderAppMain,
} from './test/renderAppMain';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}

describe('AppMain workspace tabs', () => {
  beforeEach(() => {
    setViewportWidth(1366);
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('retargets the active workspace tab for normal mode selection', async () => {
    const { user } = await renderAppMain();

    await user.click(screen.getByTestId('workspace-tab-add'));
    await waitFor(() => expect(screen.getAllByTestId('workspace-tab')).toHaveLength(2));

    await openLauncherApp(user, 'Calculus', 'Calculus');

    await waitFor(() => {
      const tabs = screen.getAllByTestId('workspace-tab');
      expect(tabs).toHaveLength(2);
      const activeTab = tabs.find((tab) => tab.classList.contains('is-active'));
      expect(activeTab).toHaveAttribute('data-workspace-kind', 'calculus');
      expect(within(activeTab as HTMLElement).getByRole('tab')).toHaveTextContent('Calculus');
    });
  });
});
