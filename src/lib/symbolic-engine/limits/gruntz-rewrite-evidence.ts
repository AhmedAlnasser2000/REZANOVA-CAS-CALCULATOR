import type { DisplayDetailLinePart } from '../../../types/calculator';
import type {
  GruntzMrvAtom,
  GruntzMrvSet,
  GruntzWSubstitution,
} from './gruntz-foundation';
import { limitMathPart, limitTextPart } from './detail-readback';

export function buildGruntzRewriteEvidenceRows(input: {
  atom: GruntzMrvAtom;
  originalLatex: string;
  rewrittenLatex: string;
  substitutions: GruntzWSubstitution[];
  set: GruntzMrvSet;
}): DisplayDetailLinePart[][] {
  return [
    [
      limitTextPart('Chosen MRV atom: '),
      limitMathPart(input.atom.latex),
      limitTextPart('.'),
    ],
    ...input.substitutions.map((substitution) => [
      limitTextPart('Substitution: '),
      limitMathPart(`${substitution.fromLatex}=${substitution.toLatex}`),
      limitTextPart(` (${substitution.reason}).`),
    ]),
    [
      limitTextPart('Transformed expression: '),
      limitMathPart(input.originalLatex),
      limitTextPart(' becomes '),
      limitMathPart(input.rewrittenLatex),
      limitTextPart('.'),
    ],
    ...input.set.coefficientDrivers.map((driver) => [
      limitTextPart('Parameter driver: '),
      limitMathPart(driver.latex),
      limitTextPart('.'),
    ]),
  ];
}
