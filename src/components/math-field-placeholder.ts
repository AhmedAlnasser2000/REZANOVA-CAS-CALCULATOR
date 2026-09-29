// MathLive parses a math-field placeholder as LaTeX, so plain words render as
// italic math with their spaces removed ("Enteranexpression"). Every math
// editor takes readable words through `placeholder` and math through
// `placeholderLatex`; this is the one place that turns them into LaTeX.
// `tools/validate-mathfield-placeholders.mjs` enforces the split.

const TEX_SPECIALS: Record<string, string> = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  $: String.raw`\$`,
  '&': String.raw`\&`,
  '#': String.raw`\#`,
  '^': String.raw`\textasciicircum{}`,
  _: String.raw`\_`,
  '%': String.raw`\%`,
  '~': String.raw`\textasciitilde{}`,
};

/** Plain words as a LaTeX text run that MathLive shows as ordinary text. */
export function mathFieldTextPlaceholder(text: string) {
  return text ? String.raw`\text{${text.replace(/[\\{}$&#^_%~]/gu, (character) => TEX_SPECIALS[character]!)}}` : '';
}

/**
 * The LaTeX a math field receives and the readable value tests and fallbacks
 * see. `latex` wins when both are given.
 */
export function mathFieldPlaceholder({ text, latex }: { text?: string; latex?: string }) {
  if (latex) return { latex, readable: latex };
  return { latex: mathFieldTextPlaceholder(text ?? ''), readable: text ?? '' };
}
