import { describe, expect, it } from 'vitest';
import { uiScaleShortcut } from './useNativeUiScale';

describe('native UI scale shortcuts (GRAPHING-UI1)', () => {
  it('reads Ctrl/Cmd with = + − 0 as zoom keys and nothing else', () => {
    const key = (key: string, extra: Partial<KeyboardEvent> = {}) => uiScaleShortcut({ key, ctrlKey: true, metaKey: false, altKey: false, ...extra });
    expect(['=', '+', '-', '_', '0'].map((value) => key(value))).toEqual([1, 1, -1, -1, 0]);
    expect(key('=', { ctrlKey: false, metaKey: true })).toBe(1);
    expect(key('=', { ctrlKey: false })).toBeNull();
    expect(key('=', { altKey: true })).toBeNull();
    expect(key('1')).toBeNull();
  });
});
