import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import { getLanguageCatalog } from '../../lib/language';
import { SettingsPage } from './SettingsPage';
import '../../styles/app/shell.css';
import '../../styles/app/side-surfaces.css';

const settingsText = getLanguageCatalog('en').settings;

describe('SettingsPage', () => {
  it('renders a full app page with the existing settings controls', () => {
    const onPatch = vi.fn();

    render(
      <SettingsPage
        settings={DEFAULT_SETTINGS}
        onPatch={onPatch}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    expect(screen.getByTestId('settings-page')).toBeInTheDocument();
    expect(screen.getAllByText(settingsText.sections.display).length).toBeGreaterThan(1);
    expect(screen.getAllByText(settingsText.sections.numericOutput).length).toBeGreaterThan(1);
    expect(screen.getAllByText(settingsText.sections.symbolicDisplay).length).toBeGreaterThan(1);
    expect(screen.getByTestId('settings-panel')).toHaveAttribute(
      'data-settings-presentation',
      'page',
    );

    fireEvent.click(screen.getByTestId('settings-output-style-both'));
    expect(onPatch).toHaveBeenCalledWith({ outputStyle: 'both' });
  });
});
