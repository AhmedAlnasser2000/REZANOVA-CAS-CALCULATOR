import { printCompatibilityLatex } from './printer';

const RESULT_LATEX_PROPERTIES = [
  'answerLatex',
  'exactLatex',
  'resultLatex',
  'solutionLatex',
] as const;

function profileDomainResult<T>(result: T): T {
  if (!result || typeof result !== 'object') return result;

  let profiled = result;
  for (const property of RESULT_LATEX_PROPERTIES) {
    const value = (profiled as Record<string, unknown>)[property];
    if (typeof value !== 'string' || !value.trim()) continue;
    const printed = printCompatibilityLatex(
      value,
      { profile: 'pedagogical-v1', target: 'canonical-latex' },
      'domain-adapter',
    );
    if (printed.ok && printed.canonicalLatex !== value) {
      profiled = { ...profiled, [property]: printed.canonicalLatex };
    }
  }
  return profiled;
}

export function profileEquationResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileSymbolicLimitsResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileSymbolicIntegrationResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileSymbolicCoreResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileCalculusResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileTrigonometryResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileGeometryResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileStatisticsResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileTableResult<T>(result: T): T {
  return profileDomainResult(result);
}

export function profileLinearAlgebraResult<T>(result: T): T {
  return profileDomainResult(result);
}
