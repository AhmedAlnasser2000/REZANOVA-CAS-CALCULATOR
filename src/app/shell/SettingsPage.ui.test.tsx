import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../../types/calculator';
import { getLanguageCatalog } from '../../lib/language';
import { SettingsPage } from './SettingsPage';
import '../../styles/app/shell.css';
import '../../styles/app/side-surfaces.css';

const settingsText = getLanguageCatalog('en').settings;

describe('SettingsPage', () => {
  it('segments full-page settings into active categories with existing controls', () => {
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
    expect(screen.getByTestId('settings-active-category')).toHaveTextContent(
      settingsText.sections.display,
    );
    expect(screen.getByTestId('settings-panel')).toHaveAttribute(
      'data-settings-presentation',
      'page',
    );
    expect(screen.getByTestId('settings-section-display')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-section-numeric-output')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('settings-category-math-output'));
    expect(screen.getByTestId('settings-active-category')).toHaveTextContent(
      settingsText.sections.numericOutput,
    );
    expect(screen.queryByTestId('settings-section-display')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-section-numeric-output')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('settings-category-equation-complex'));
    expect(screen.getByTestId('settings-section-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-section-complex')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('settings-output-style-both'));
    expect(onPatch).toHaveBeenCalledWith({ outputStyle: 'both' });
  });
});
