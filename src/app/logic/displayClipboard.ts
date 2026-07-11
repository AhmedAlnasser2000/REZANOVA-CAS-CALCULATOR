import { writeMathClipboard } from '../../lib/clipboard';
import type { DisplayOutcome, ModeId } from '../../types/calculator';

type DisplayClipboardDeps = {
  displayOutcome: DisplayOutcome | null;
  visibleText: string;
  currentMode: ModeId;
  setClipboardNotice: (notice: string) => void;
  write?: typeof writeMathClipboard;
};

export async function copyDisplayResultWithDeps({
  displayOutcome,
  visibleText,
  currentMode,
  setClipboardNotice,
  write = writeMathClipboard,
}: DisplayClipboardDeps) {
  const canonicalPayload = displayOutcome?.kind === 'success'
    && displayOutcome.canonicalMath?.canonicalLatex === displayOutcome.exactLatex
    ? displayOutcome.canonicalMath
    : undefined;
  const canonicalLatex = canonicalPayload?.canonicalLatex
    ?? (displayOutcome?.kind === 'success' || displayOutcome?.kind === 'error'
      ? displayOutcome.exactLatex
      : undefined)
    ?? visibleText;
  if (!canonicalLatex.trim()) {
    setClipboardNotice('Nothing to copy');
    return;
  }

  const result = await write({
    canonicalLatex,
    visibleText: visibleText || canonicalLatex,
    mathJson: canonicalPayload?.mathJson,
    metadata: { surface: 'display', mode: currentMode },
  });
  setClipboardNotice(result.ok ? 'Result copied' : 'Clipboard blocked');
}
