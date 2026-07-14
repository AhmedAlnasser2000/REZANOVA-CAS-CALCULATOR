import { writeMathClipboard } from '../../lib/clipboard';
import { resolveCanonicalResultForConsumer } from '../../lib/result-contract';
import type { CanonicalRuntimeOutcome, ModeId } from '../../types/calculator';

type DisplayClipboardDeps = {
  displayOutcome: CanonicalRuntimeOutcome | null;
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
  const authority = resolution?.ok ? resolution : undefined;
  const primary = authority?.semantics.primary;
  const primaryMath = primary?.kind === 'math' ? primary.value : undefined;
  const approximationOnlyText = authority
    && authority.presentation.outcomeKind === 'success'
    && !authority.presentation.primaryLatex
    && authority.presentation.approximations?.primary
      ? visibleText || authority.presentation.approximations.primary
      : undefined;
  const canonicalLatex = authority?.presentation.primaryLatex
    ?? approximationOnlyText
    ?? (displayOutcome ? '' : visibleText);
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
