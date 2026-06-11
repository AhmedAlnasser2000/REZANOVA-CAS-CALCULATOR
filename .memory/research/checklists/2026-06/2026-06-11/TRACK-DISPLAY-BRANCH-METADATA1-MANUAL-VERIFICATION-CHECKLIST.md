# TRACK-DISPLAY-BRANCH-METADATA1 Manual Verification Checklist

## Scope
- Optional display-only branch metadata for finite branch answers.
- Metadata precedence in `buildDisplayBlocks`: producer metadata, safe extractor fallback, original math block.
- Producer migration only where finite branch arrays already exist.

## Manual Checks
- Branch-heavy selected-target Equation output renders vertical rows for non-`x` targets such as `s`, `t`, and `z`.
- Branch rows preserve symbolic parameters inside each branch.
- Copy Result and To Editor still use full `exactLatex`, not only displayed rows.
- Periodic-family answers still use periodic-family readback, not finite branch metadata.
- Malformed or ambiguous tuple/system answers fall back safely.

## Verification Commands
- `npm run test:unit -- src/lib/display/*.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx src/components/MathStatic.ui.test.tsx`
- `npm run lint`
- `npm run build`
