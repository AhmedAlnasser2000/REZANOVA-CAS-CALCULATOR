import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider, useLanguage } from './language-context';

describe('language React context', () => {
  it('defaults to English without a provider', () => {
    const hook = renderHook(() => useLanguage());

    expect(hook.result.current.code).toBe('en');
    expect(hook.result.current.direction).toBe('ltr');
    expect(hook.result.current.strings.common.actions.run).toBe('Run');
  });

  it('provides explicit English through LanguageProvider', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LanguageProvider languageCode="en">
        {children}
      </LanguageProvider>
    );

    const hook = renderHook(() => useLanguage(), { wrapper });

    expect(hook.result.current.metadata.label).toBe('English');
    expect(hook.result.current.strings.shell.runtimeControls.stop).toBe('Stop');
  });

  it('falls back to English when a provider receives an unknown code', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <LanguageProvider languageCode="missing">
        {children}
      </LanguageProvider>
    );

    const hook = renderHook(() => useLanguage(), { wrapper });

    expect(hook.result.current.code).toBe('en');
    expect(hook.result.current.strings.shell.launcher.openInNewTab).toBe('Open in New Tab');
  });
});
