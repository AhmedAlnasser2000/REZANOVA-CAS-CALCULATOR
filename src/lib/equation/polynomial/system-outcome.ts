import type { BivariateResultantStop } from '../../algebra/polynomial-bivariate-elimination';
import { formatApproxNumber } from '../../display/format';
import type { DisplayDetailSection, DisplayOutcome } from '../../../types/calculator';
import type { CandidatePair, SolveStopReason } from './system-types';

function stopMessage(reason: SolveStopReason, symbols?: readonly string[]) {
  switch (reason) {
    case 'missing-equation':
      return 'Enter both polynomial equations before solving the system.';
    case 'parse-error':
      return 'One equation could not be parsed. Check the syntax and try again.';
    case 'unsupported-relation':
      return 'Polynomial 2x2 accepts equalities only. Inequalities are not part of this solver yet.';
    case 'missing-system-variable':
      return `Polynomial 2x2 needs equations that relate both x and y. ${
        symbols && symbols.length > 0
          ? `Your input is missing ${symbols.join(' and ')}.`
          : 'One system variable is missing.'
      }`;
    case 'unsupported-symbolic-parameter':
      return `Only x and y may stay symbolic in this solver. ${
        symbols && symbols.length > 0
          ? `Store numeric values for ${symbols.join(', ')} or remove them.`
          : 'Store numeric values for extra symbols or remove them.'
      }`;
    case 'non-polynomial-input':
      return 'Both equations must be polynomial in x and y after stored numeric constants are applied.';
    case 'degree-limit':
      return 'Projection stopped because the polynomial degree exceeded the bounded resultant cap.';
    case 'term-limit':
      return 'Projection stopped because the expanded polynomial exceeded the term cap.';
    case 'scalar-growth-limit':
    case 'stored-constant-unsafe':
      return 'Projection stopped because coefficients grew beyond the safe exact-arithmetic cap.';
    case 'zero-polynomial':
    case 'constant-polynomial':
    case 'projection-ambiguity':
      return 'Projection did not produce a unique finite polynomial system to solve.';
    case 'constant-resultant-no-solution':
      return 'The equations are inconsistent after projection; no real solution pairs were found.';
    case 'sylvester-dimension-limit':
      return 'Projection stopped because the Sylvester matrix exceeded the bounded dimension cap.';
    case 'projection-roots-unavailable':
      return 'The projected polynomial could not be solved by the bounded real factor solver.';
    case 'candidate-limit':
      return 'The projected roots produced too many candidate pairs for this bounded solver.';
    case 'no-real-roots':
      return 'The projected system did not produce real roots for both variables.';
    case 'no-validated-pairs':
      return 'Projection produced candidates, but none validated in both original equations.';
    default:
      return 'The polynomial system solver stopped before producing a bounded result.';
  }
}

export function errorOutcome(
  reason: SolveStopReason,
  extra: {
    symbols?: readonly string[];
    detailSections?: DisplayDetailSection[];
    rejectedCandidateCount?: number;
  } = {},
): DisplayOutcome {
  return {
    kind: 'error',
    title: 'Polynomial 2x2',
    error: stopMessage(reason, extra.symbols),
    warnings: [],
    detailSections: extra.detailSections,
    rejectedCandidateCount: extra.rejectedCandidateCount,
  };
}

export function projectionStopOutcome(projection: BivariateResultantStop): DisplayOutcome {
  if (projection.reason === 'constant-polynomial' && projection.constantContext === 'resultant') {
    return errorOutcome('constant-resultant-no-solution', {
      detailSections: [{
        title: 'Resultant Projection',
        lines: [
          'Eliminating a system variable reduced the equations to a nonzero constant.',
          'That means the equations contradict each other, so no x/y pair can satisfy both.',
        ],
      }],
    });
  }

  return errorOutcome(projection.reason, { symbols: projection.symbols });
}

export function pairExactLatex(pair: CandidatePair) {
  return `\\left(${pair.x.latex},${pair.y.latex}\\right)`;
}

export function pairApproxText(pair: CandidatePair) {
  return `(x, y) ~= (${formatApproxNumber(pair.x.numeric)}, ${formatApproxNumber(pair.y.numeric)})`;
}
