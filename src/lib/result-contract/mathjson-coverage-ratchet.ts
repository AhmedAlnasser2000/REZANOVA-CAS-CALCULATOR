import type {
  MathJsonCoverageReport,
  MathJsonCoverageRouteSummary,
} from './mathjson-coverage';
import type { MathJsonRouteId } from './mathjson-route-registry';

export type MathJsonCoverageBaseline = {
  version: 1;
  reason: string;
  routeIds: MathJsonRouteId[];
  exemptionIds: string[];
  totals: MathJsonCoverageReport['totals'];
  routes: Record<MathJsonRouteId, MathJsonCoverageRouteSummary>;
};

export function createMathJsonCoverageBaseline(
  report: MathJsonCoverageReport,
  reason: string,
): MathJsonCoverageBaseline {
  return {
    version: 1,
    reason,
    routeIds: Object.keys(report.routes).sort() as MathJsonRouteId[],
    exemptionIds: [...report.exemptionIds].sort(),
    totals: report.totals,
    routes: report.routes,
  };
}

function sameStrings(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateMathJsonCoverageBaseline(
  report: MathJsonCoverageReport,
  baseline: MathJsonCoverageBaseline,
) {
  const errors: string[] = [];
  const routeIds = Object.keys(report.routes).sort() as MathJsonRouteId[];
  if (!sameStrings(routeIds, baseline.routeIds)) {
    errors.push('MathJSON route registry changed without an accepted baseline update.');
  }
  if (!sameStrings([...report.exemptionIds].sort(), [...baseline.exemptionIds].sort())) {
    errors.push('MathJSON exemption registry changed without an accepted baseline update.');
  }
  for (const routeId of routeIds) {
    const current = report.routes[routeId];
    const accepted = baseline.routes[routeId];
    if (!accepted) continue;
    if (current.fixtures !== accepted.fixtures) {
      errors.push(`${routeId} executable fixture count changed (${accepted.fixtures} -> ${current.fixtures}).`);
    }
    if (current.leaves !== accepted.leaves) {
      errors.push(`${routeId} canonical leaf count changed (${accepted.leaves} -> ${current.leaves}).`);
    }
    if (current.proven < accepted.proven) {
      errors.push(`${routeId} proven MathJSON coverage regressed (${accepted.proven} -> ${current.proven}).`);
    }
    if (current.missing > accepted.missing) {
      errors.push(`${routeId} missing MathJSON debt grew (${accepted.missing} -> ${current.missing}).`);
    }
    if (current.maxBytes > accepted.maxBytes) {
      errors.push(`${routeId} maximum payload grew (${accepted.maxBytes} -> ${current.maxBytes} bytes).`);
    }
  }
  return { ok: errors.length === 0, errors };
}
