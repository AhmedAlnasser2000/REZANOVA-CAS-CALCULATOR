import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type Settings } from '../../types/calculator';
import { getLanguageCatalog } from '../../lib/language';
import { SettingsPage } from './SettingsPage';
import '../../styles/app/shell.css';
import '../../styles/app/side-surfaces.css';

const settingsText = getLanguageCatalog('en').settings;

describe('SettingsPage', () => {
  it('renders the mock taxonomy and patches existing settings state', () => {
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
    expect(screen.getByTestId('settings-category-general')).toBeInTheDocument();
    expect(screen.getByTestId('settings-category-display')).toBeInTheDocument();
    expect(screen.getByTestId('settings-category-math')).toBeInTheDocument();
    expect(screen.getByTestId('settings-category-runtime')).toBeInTheDocument();
    expect(screen.getByTestId('settings-category-privacy')).toBeInTheDocument();
    expect(screen.getByTestId('settings-category-language')).toBeInTheDocument();
    expect(screen.getByTestId('settings-active-category')).toHaveTextContent('General');

    fireEvent.click(screen.getByRole('button', {
      name: settingsText.options.outputStyle.both,
    }));
    expect(onPatch).toHaveBeenCalledWith({ outputStyle: 'both' });

    fireEvent.click(screen.getByTestId('settings-category-display'));
    expect(screen.getByTestId('settings-active-category')).toHaveTextContent('Display');
    fireEvent.change(screen.getByLabelText(settingsText.fields.mathSize), {
      target: { value: '130' },
    });
    expect(onPatch).toHaveBeenCalledWith({ mathScale: 130 });

    fireEvent.click(screen.getByTestId('settings-category-math'));
    expect(screen.getByTestId('settings-active-category')).toHaveTextContent('Math');
    const symbolicPreview = screen.getByTestId('settings-symbolic-preview-result');
    expect(symbolicPreview).toHaveTextContent(settingsText.previews.previewInput);
    expect(symbolicPreview).toHaveTextContent(settingsText.previews.previewOutput);
    expect(symbolicPreview).toHaveTextContent(settingsText.previews.symbolicSummary.flattenedRoots);
    fireEvent.click(screen.getByRole('button', {
      name: settingsText.options.angleUnit.deg,
    }));
    expect(onPatch).toHaveBeenCalledWith({ angleUnit: 'deg' });
  });

  it('derives live preview and impact values from the supplied settings', () => {
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      angleUnit: 'deg',
      approxDigits: 8,
      historyEnabled: false,
      outputStyle: 'both',
    };

    render(
      <SettingsPage
        settings={settings}
        onPatch={vi.fn()}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    expect(screen.getByTestId('settings-live-preview')).toBeInTheDocument();
    expect(screen.getByTestId('settings-impact-angle')).toHaveTextContent('DEG');
    expect(screen.getByTestId('settings-impact-output')).toHaveTextContent('BOTH');
    expect(screen.getByTestId('settings-impact-digits')).toHaveTextContent('8');
    expect(screen.getByText(/History:/)).toHaveTextContent('Off');
  });

  it('exposes full-page History notation controls with rendered-math confirmation', () => {
    const onPatch = vi.fn();

    render(
      <SettingsPage
        settings={DEFAULT_SETTINGS}
        onPatch={onPatch}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('settings-category-privacy'));

    expect(screen.getByText(settingsText.fields.historyInspectorNotation)).toBeInTheDocument();
    expect(screen.getByText(settingsText.fields.historyPageNotation)).toBeInTheDocument();
    expect(screen.getByTestId('history-inspector-notation-warning')).toHaveTextContent(
      settingsText.help.renderedHistoryMathWarning,
    );
    expect(screen.queryByTestId('history-page-notation-warning')).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('history-page-notation-control')).getByRole('button', {
        name: 'Rendered Math',
      }),
    );

    expect(screen.getByRole('alertdialog', {
      name: settingsText.confirmations.renderedHistoryMathTitle,
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onPatch).not.toHaveBeenCalledWith({ historyPageNotationMode: 'rendered' });

    fireEvent.click(
      within(screen.getByTestId('history-page-notation-control')).getByRole('button', {
        name: 'Rendered Math',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: settingsText.actions.useRenderedMath }));

    expect(onPatch).toHaveBeenCalledWith({ historyPageNotationMode: 'rendered' });
  });
});
