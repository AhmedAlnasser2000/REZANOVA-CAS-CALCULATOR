import { writeMathClipboard } from '../../lib/clipboard';
import { resolveCanonicalResultForConsumer } from '../../lib/result-contract';
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
  const resolution = displayOutcome && displayOutcome.kind !== 'prompt'
    ? resolveCanonicalResultForConsumer(displayOutcome)
    : undefined;
  if (resolution && !resolution.ok) {
    setClipboardNotice('Result unavailable');
    return;
  }
  const primaryMath = resolution?.ok ? resolution.document.primaryMath : undefined;
  const canonicalLatex = primaryMath?.canonicalLatex ?? (displayOutcome ? '' : visibleText);
  if (!canonicalLatex.trim()) {
    setClipboardNotice('Nothing to copy');
    return;
  }

  const result = await write({
    canonicalLatex,
    visibleText: visibleText || canonicalLatex,
    mathJson: primaryMath?.mathJson,
    metadata: { surface: 'display', mode: currentMode },
  });
  setClipboardNotice(result.ok ? 'Result copied' : 'Clipboard blocked');
}
