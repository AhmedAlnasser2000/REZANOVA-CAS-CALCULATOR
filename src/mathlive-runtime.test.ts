import { describe, expect, it } from 'vitest';
import { warmMathLiveTypesetting } from './mathlive-runtime';

describe('MathLive warm-up', () => {
  it('loads the math fonts and typesets math once when idle', () => {
    const loaded: string[] = [];
    const typeset: string[] = [];
    const idle: Array<() => void> = [];
    warmMathLiveTypesetting({
      fonts: { load: (font: string) => { loaded.push(font); return Promise.resolve([]); } },
      typeset: (latex) => { typeset.push(latex); },
      whenIdle: (task) => { idle.push(task); },
    });
    expect(loaded).toEqual(['italic 400 1em KaTeX_Math', '400 1em KaTeX_Main']);
    expect(typeset).toEqual([]);
    idle.forEach((task) => task());
    expect(typeset).toHaveLength(1);
  });

  it('never throws when typesetting fails or fonts are unavailable', () => {
    const idle: Array<() => void> = [];
    warmMathLiveTypesetting({ fonts: undefined, typeset: () => { throw new Error('no layout'); }, whenIdle: (task) => { idle.push(task); } });
    expect(() => idle.forEach((task) => task())).not.toThrow();
  });
});
