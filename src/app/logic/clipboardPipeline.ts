import {
  writeMathClipboard,
  type MathClipboardSurface,
} from '../../lib/clipboard';
import type { ModeId, SerializableMathJson } from '../../types/calculator';

type CopyCanonicalMathDeps = {
  canonicalLatex: string;
  successNotice: string;
  surface: MathClipboardSurface;
  setClipboardNotice: (notice: string) => void;
  mode?: ModeId;
  visibleText?: string;
  mathJson?: SerializableMathJson;
  write?: typeof writeMathClipboard;
};

export async function copyCanonicalMathWithDeps({
  canonicalLatex,
  successNotice,
  surface,
  setClipboardNotice,
  mode,
  visibleText,
  mathJson,
  write = writeMathClipboard,
}: CopyCanonicalMathDeps) {
  const trimmed = canonicalLatex.trim();
  if (!trimmed) {
    setClipboardNotice('Nothing to copy');
    return;
  }

  const result = await write({
    canonicalLatex: trimmed,
    visibleText: visibleText?.trim() || trimmed,
    mathJson,
    metadata: {
      surface,
      ...(mode === undefined ? {} : { mode }),
    },
  });
  setClipboardNotice(result.ok ? successNotice : 'Clipboard blocked');
}
