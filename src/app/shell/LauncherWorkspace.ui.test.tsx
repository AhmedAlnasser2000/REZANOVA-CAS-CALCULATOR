import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createLauncherCategories } from '../../lib/navigation/launcher';
import { DEFAULT_LAUNCHER_CATEGORIES, type LauncherCategory } from '../../types/calculator';
import { LauncherWorkspace } from './LauncherWorkspace';
import '../../styles/app/shell.css';

function renderLauncher(options: {
  activeCategory?: LauncherCategory;
  categories?: LauncherCategory[];
  level?: 'root' | 'category';
} = {}) {
  const categories = options.categories ?? DEFAULT_LAUNCHER_CATEGORIES;
  const activeCategory = options.activeCategory ?? categories[0];
  const onLaunchApp = vi.fn();
  const onOpenCategory = vi.fn();
  const onSetLauncherState = vi.fn();

  render(
    <LauncherWorkspace
      launcherState={{
        surface: 'launcher',
        level: options.level ?? 'category',
        rootSelectedIndex: categories.findIndex((category) => category.id === activeCategory.id),
        categoryId: activeCategory.id,
        categorySelectedIndex: 0,
      }}
      launcherCategories={categories}
      activeLauncherCategory={activeCategory}
      activeLauncherLeafId="calculate"
      onOpenCategory={onOpenCategory}
      onLaunchApp={onLaunchApp}
      onSetLauncherState={onSetLauncherState}
    />,
  );

  return {
    activeCategory,
    onLaunchApp,
    onOpenCategory,
    onSetLauncherState,
  };
}

function launcherRow(label: string) {
  const button = screen.getByRole('button', { name: new RegExp(label, 'i') });
  const row = button.closest('.launcher-entry-row');
  if (!row) {
    throw new Error(`Missing launcher row for ${label}`);
  }
  return row as HTMLElement;
}

describe('LauncherWorkspace', () => {
  it('opens a launcher leaf in the current tab from the primary row action', () => {
    const { activeCategory, onLaunchApp } = renderLauncher();
    const equationEntry = activeCategory.entries.find((entry) => entry.id === 'equation');

    fireEvent.click(screen.getByRole('button', { name: /Equation/i }));

    expect(onLaunchApp).toHaveBeenCalledWith(equationEntry, 'current-tab');
  });

  it('opens a launcher leaf in a new tab from the visible row action', () => {
    const { activeCategory, onLaunchApp } = renderLauncher();
    const equationEntry = activeCategory.entries.find((entry) => entry.id === 'equation');

    const newTabAction = within(launcherRow('Equation')).getByLabelText('Open in new tab');
    expect(newTabAction).toHaveAttribute('title', 'Open Equation in new tab');

    fireEvent.click(newTabAction);

    expect(onLaunchApp).toHaveBeenCalledWith(equationEntry, 'new-tab');
  });

  it('exposes open-here and new-tab actions from a leaf context menu', () => {
    const { activeCategory, onLaunchApp } = renderLauncher();
    const equationEntry = activeCategory.entries.find((entry) => entry.id === 'equation');

    fireEvent.contextMenu(launcherRow('Equation'));

    const menu = screen.getByTestId('launcher-entry-menu');
    expect(within(menu).getByRole('menuitem', { name: 'Open Here' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Open in New Tab' })).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Open in New Tab' }));
    expect(onLaunchApp).toHaveBeenCalledWith(equationEntry, 'new-tab');
  });

  it('keeps root category rows free of leaf tab actions', () => {
    renderLauncher({ level: 'root' });

    expect(screen.getAllByTestId('launcher-category-row')).toHaveLength(DEFAULT_LAUNCHER_CATEGORIES.length);
    expect(screen.queryByTestId('launcher-entry-new-tab')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getAllByTestId('launcher-category-row')[0]);
    expect(screen.queryByTestId('launcher-entry-menu')).not.toBeInTheDocument();
  });

  it('does not expose a new-tab action for Labs launcher entries', () => {
    const categories = createLauncherCategories({ labsEnabled: true });
    const labsCategory = categories.find((category) => category.id === 'labs');
    if (!labsCategory) {
      throw new Error('Expected Labs category');
    }
    renderLauncher({
      activeCategory: labsCategory,
      categories,
    });

    expect(within(launcherRow('Labs')).queryByLabelText('Open in new tab')).not.toBeInTheDocument();

    fireEvent.contextMenu(launcherRow('Labs'));
    const menu = screen.getByTestId('launcher-entry-menu');
    expect(within(menu).getByRole('menuitem', { name: 'Open Here' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: 'Open in New Tab' })).not.toBeInTheDocument();
  });
});
