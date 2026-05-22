import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../types/calculator';
import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  it('offers detailed facts as an opt-in display setting', () => {
    const onPatch = vi.fn();
    render(
      <SettingsPanel
        presentation="overlay"
        settings={DEFAULT_SETTINGS}
        onClose={vi.fn()}
        onPatch={onPatch}
      />,
    );

    const toggle = screen.getByTestId('settings-detailed-facts') as HTMLInputElement;
    expect(toggle).not.toBeChecked();

    fireEvent.click(toggle);

    expect(onPatch).toHaveBeenCalledWith({ detailedFactsEnabled: true });
  });
});
