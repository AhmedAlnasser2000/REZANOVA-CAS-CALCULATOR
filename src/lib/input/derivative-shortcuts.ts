import type { ModeId } from '../../types/calculator';

type DerivativeShortcutContext = {
  mode?: ModeId;
  modeId?: ModeId;
  screenHint?: string;
};

export const DERIVATIVE_SHORTCUT_SCREENS = new Set([
  'derivative',
  'derivativePoint',
  'partialDerivative',
]);

export function isDerivativeShortcutContext(context?: DerivativeShortcutContext | null) {
  const mode = context?.mode ?? context?.modeId;
  return mode === 'calculus' && DERIVATIVE_SHORTCUT_SCREENS.has(context?.screenHint ?? '');
}

export function derivativeInlineShortcuts() {
  return {
    pd: '\\partial',
    ddx: '\\frac{d}{dx}',
    ddy: '\\frac{d}{dy}',
    ddt: '\\frac{d}{dt}',
    ddz: '\\frac{d}{dz}',
    ddtheta: '\\frac{d}{d\\theta}',
    pdx: '\\frac{\\partial}{\\partial x}',
    pdy: '\\frac{\\partial}{\\partial y}',
    pdt: '\\frac{\\partial}{\\partial t}',
    pdz: '\\frac{\\partial}{\\partial z}',
    pdtheta: '\\frac{\\partial}{\\partial \\theta}',
  };
}
