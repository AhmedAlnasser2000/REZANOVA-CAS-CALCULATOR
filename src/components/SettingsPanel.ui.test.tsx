import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../types/calculator';
import { SettingsPanel } from './SettingsPanel';

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

    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('English is the only installed language for now.')).toBeInTheDocument();
    expect(screen.getByTestId('settings-language-code-en')).toHaveClass('is-active');

    fireEvent.click(screen.getByTestId('settings-language-code-en'));

    expect(onPatch).toHaveBeenCalledWith({ languageCode: 'en' });
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

    expect(screen.getByText('Complex')).toBeInTheDocument();
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
