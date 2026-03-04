import type { CapabilityId, GuideDomain, GuideDomainId } from '../../types/calculator';

export const GUIDE_DOMAIN_CAPABILITY: Record<GuideDomainId, CapabilityId> = {
  basics: 'keyboard-foundation',
  algebra: 'algebra-core',
  discrete: 'discrete-core',
  calculus: 'calculus-core',
  linearAlgebra: 'linear-algebra-core',
  advancedCalculus: 'advanced-calculus-core',
  trigonometry: 'trigonometry-core',
  statistics: 'statistics-core',
  geometry: 'geometry-core',
};

export const GUIDE_DOMAINS: GuideDomain[] = [
  {
    id: 'basics',
    title: 'Basics',
    summary: 'Keyboard navigation, notation entry, copy/paste, and exact versus numeric output.',
    articleIds: ['basics-keyboard', 'basics-output'],
  },
  {
    id: 'algebra',
    title: 'Algebra',
    summary: 'Simplify, factor, expand, symbolic equations, and relation notation.',
    articleIds: ['algebra-manipulation', 'algebra-equations'],
  },
  {
    id: 'discrete',
    title: 'Discrete',
    summary: 'Finite sums, products, factorial, combinations, and permutations.',
    articleIds: ['discrete-operators', 'discrete-combinatorics'],
  },
  {
    id: 'calculus',
    title: 'Calculus',
    summary: 'Derivatives, integrals, limits, and common function entry.',
    articleIds: ['calculus-derivatives', 'calculus-integrals-limits'],
  },
  {
    id: 'linearAlgebra',
    title: 'Linear Algebra',
    summary: 'Matrix and vector notation, and when to use Matrix and Vector modes.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  {
    id: 'advancedCalculus',
    title: 'Advanced Calculus',
    summary: 'Harder integrals, stronger limits, series, partial derivatives, and ODE workflows.',
    articleIds: ['advanced-integrals', 'advanced-limits', 'advanced-series', 'advanced-partials', 'advanced-odes'],
  },
  {
    id: 'trigonometry',
    title: 'Trigonometry',
    summary: 'Functions, identities, equations, angle conversion, and triangle solving.',
    articleIds: ['trig-functions', 'trig-identities', 'trig-equations', 'trig-triangles', 'trig-special-angles'],
  },
  {
    id: 'statistics',
    title: 'Statistics',
    summary: 'Dataset entry, descriptive statistics, probability distributions, and regression basics.',
    articleIds: ['statistics-descriptive', 'statistics-probability', 'statistics-regression'],
  },
  {
    id: 'geometry',
    title: 'Geometry',
    summary: 'Formula-first shapes, circle work, triangle formulas, and coordinate geometry.',
    articleIds: ['geometry-shapes-2d', 'geometry-solids-3d', 'geometry-triangles', 'geometry-circles', 'geometry-coordinate'],
  },
];

export function getGuideDomain(domainId: GuideDomainId) {
  return GUIDE_DOMAINS.find((domain) => domain.id === domainId);
}

export function getActiveGuideDomains(enabledCapabilities: readonly CapabilityId[]) {
  return GUIDE_DOMAINS.filter((domain) => enabledCapabilities.includes(GUIDE_DOMAIN_CAPABILITY[domain.id]));
}
