import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { getLanguageCatalog } from '../lib/language';
import { DEFAULT_SETTINGS } from '../types/calculator';
import { SettingsPanel } from './SettingsPanel';

const settingsText = getLanguageCatalog('en').settings;

describe('SettingsPanel', () => {
  it('shows the English language setting and patches languageCode from the chip', () => {
    const onPatch = vi.fn();
    render(
      <SettingsPanel
        presentation="overlay"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onPatch={onPatch}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    expect(screen.getByText(settingsText.fields.language)).toBeInTheDocument();
    expect(screen.getByText(settingsText.help.language)).toBeInTheDocument();
    expect(screen.getByTestId('settings-language-code-en')).toHaveClass('is-active');

    fireEvent.click(screen.getByTestId('settings-language-code-en'));

    expect(onPatch).toHaveBeenCalledWith({ languageCode: 'en' });
  });

  it('renders panel-owned settings copy from the language catalog', () => {
    render(
      <SettingsPanel
        presentation="overlay"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onPatch={vi.fn()}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    expect(screen.getByText(settingsText.title)).toBeInTheDocument();
    expect(screen.getByText(settingsText.description)).toBeInTheDocument();
    expect(screen.getByText(settingsText.sections.display)).toBeInTheDocument();
    expect(screen.getByText(settingsText.sections.numericOutput)).toBeInTheDocument();
    expect(screen.getByText(settingsText.sections.symbolicDisplay)).toBeInTheDocument();
    expect(screen.getByText(settingsText.fields.uiScale)).toBeInTheDocument();
    expect(screen.getByText(settingsText.fields.approximateDigits)).toBeInTheDocument();
    expect(screen.getByText(settingsText.fields.powerRootStyle)).toBeInTheDocument();
    expect(screen.getByTestId('settings-notation-mode-scientific')).toHaveTextContent(
      settingsText.options.numericNotation.scientific,
    );
    expect(screen.getByTestId('settings-symbolic-mode-roots')).toHaveTextContent(
      settingsText.options.symbolicDisplay.roots,
    );
    expect(screen.getByTestId('settings-symbolic-preview-note')).toHaveTextContent(
      settingsText.previews.symbolicSummary.auto,
    );
    expect(screen.getByTestId('settings-equation-answer-mode-exact')).toBeInTheDocument();
    expect(screen.getByTestId('settings-equation-answer-mode-isolate')).toBeInTheDocument();
    expect(screen.queryByTestId('settings-equation-answer-mode-approximate')).not.toBeInTheDocument();
    expect(screen.getByTestId('settings-reset-history')).toHaveTextContent(
      settingsText.actions.resetHistory,
    );
    expect(screen.getByTestId('settings-reset-calculator-memory')).toHaveTextContent(
      settingsText.actions.resetCalculatorMemory,
    );
  });

  it('offers detailed facts as an opt-in display setting', () => {
    const onPatch = vi.fn();
    render(
      <SettingsPanel
        presentation="overlay"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onPatch={onPatch}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId('settings-detailed-facts') as HTMLInputElement;
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(onPatch).toHaveBeenCalledWith({ detailedFactsEnabled: true });
  });

  it('offers complex exact branch display forms', () => {
    const onPatch = vi.fn();
    render(
      <SettingsPanel
        presentation="overlay"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onPatch={onPatch}
        onClearHistory={vi.fn()}
        onResetCalculatorMemory={vi.fn()}
      />,
    );

    expect(screen.getByText(settingsText.sections.complex)).toBeInTheDocument();
    expect(screen.getByTestId('settings-complex-exact-form-rectangular')).toHaveClass('is-active');

    fireEvent.click(screen.getByTestId('settings-complex-exact-form-cis'));

    expect(onPatch).toHaveBeenCalledWith({ complexExactForm: 'cis' });
  });

  it('configures calculator memory and exposes reset actions', () => {
    const onPatch = vi.fn();
    const onClearHistory = vi.fn();
    const onResetCalculatorMemory = vi.fn();
    render(
      <SettingsPanel
        presentation="overlay"
        settings={{
          ...DEFAULT_SETTINGS,
          calculatorMemoryAutosaveMode: 'interval',
        }}
        onClose={vi.fn()}
        onPatch={onPatch}
        onClearHistory={onClearHistory}
        onResetCalculatorMemory={onResetCalculatorMemory}
      />,
    );

    fireEvent.click(screen.getByTestId('settings-calculator-memory-enabled'));
    expect(onPatch).toHaveBeenCalledWith({ calculatorMemoryEnabled: false });

    fireEvent.change(screen.getByTestId('settings-calculator-memory-interval-input'), {
      target: { value: '5' },
    });
    expect(onPatch).toHaveBeenCalledWith({ calculatorMemoryAutosaveIntervalSeconds: 20 });

    fireEvent.click(screen.getByTestId('settings-reset-history'));
    fireEvent.click(screen.getByTestId('settings-reset-calculator-memory'));
    expect(onClearHistory).toHaveBeenCalled();
    expect(onResetCalculatorMemory).toHaveBeenCalled();
  });
});
