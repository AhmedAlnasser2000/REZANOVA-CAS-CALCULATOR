import { convertLatexToMarkup, MathfieldElement } from 'mathlive';

export const MATHLIVE_SOUNDS_DIRECTORY = null;

type MathLiveRuntimeTarget = {
  soundsDirectory: string | null;
  keypressSound?: null | string | {
    spacebar?: null | string;
    return?: null | string;
    delete?: null | string;
    default?: null | string;
  };
  plonkSound?: string | null;
};

export function configureMathLiveRuntime(
  target: MathLiveRuntimeTarget = MathfieldElement,
) {
  target.soundsDirectory = MATHLIVE_SOUNDS_DIRECTORY;
  target.keypressSound = null;
  target.plonkSound = null;
}

/**
 * Warms what typed math needs before the first keystroke: the math fonts and
 * MathLive's math-mode typesetting (which builds the Compute Engine
 * dictionary it consults for function names). Placeholders are upright
 * `\text{}` words (MATHFIELD-PLACEHOLDER1), so nothing on screen does this
 * until the user types; without it, the first edit pays for all of it.
 */
export function warmMathLiveTypesetting({
  fonts = globalThis.document?.fonts,
  typeset = (latex: string) => { convertLatexToMarkup(latex); },
  whenIdle = (task: () => void) => (globalThis.requestIdleCallback ? globalThis.requestIdleCallback(task) : setTimeout(task, 0)),
}: {
  fonts?: Pick<FontFaceSet, 'load'>;
  typeset?: (latex: string) => void;
  whenIdle?: (task: () => void) => unknown;
} = {}) {
  for (const font of ['italic 400 1em KaTeX_Math', '400 1em KaTeX_Main']) {
    fonts?.load(font).catch(() => undefined);
  }
  whenIdle(() => {
    try { typeset(String.raw`a\sin(x)+\frac{1}{x}`); } catch { /* warming is best effort */ }
  });
}
