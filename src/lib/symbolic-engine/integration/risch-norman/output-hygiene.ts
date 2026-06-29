import { normalizeGeneratedIntegrationLatex } from '../readback-hygiene';

export function normalizeGeneratedRischNormanLatex(latex: string, variable = 'x') {
  return normalizeGeneratedIntegrationLatex(latex, variable);
}
