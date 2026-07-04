import { ComputeEngine } from '@cortex-js/compute-engine';
import { boxLatex, wrapGroupedLatex } from '../patterns';

const ce = new ComputeEngine();

export function negateGeneratedLatex(latex: string) {
  const trimmed = latex.trim();
  if (trimmed.startsWith('-')) {
    return trimmed.slice(1);
  }

  const negativeFraction = /^\\frac\{-(.+)\}\{(.+)\}$/u.exec(trimmed);
  if (negativeFraction) {
    return `\\frac{${negativeFraction[1]}}{${negativeFraction[2]}}`;
  }

  if (trimmed.startsWith('\\frac')) {
    return `-${trimmed}`;
  }

  return `-${wrapGroupedLatex(trimmed)}`;
}

function normalizeGeneratedProductLatex(latex: string) {
  const unitFractionNegativeGroup = /^\\frac\{1\}\{([^{}]+)\}\(-(.+)\)$/u.exec(latex.trim());
  if (unitFractionNegativeGroup) {
    return `-\\frac{${unitFractionNegativeGroup[2]}}{${unitFractionNegativeGroup[1]}}`;
  }

  return latex;
}

export function multiplyGeneratedLatexByNode(coefficient: unknown, latex: string) {
  try {
    const parsed = ce.parse(latex);
    return normalizeGeneratedProductLatex(
      ce.box(['Multiply', coefficient, parsed.json] as Parameters<typeof ce.box>[0]).simplify().latex,
    );
  } catch {
    return `${boxLatex(coefficient)}${wrapGroupedLatex(latex)}`;
  }
}
