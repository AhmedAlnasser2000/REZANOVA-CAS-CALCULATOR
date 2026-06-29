import { readExactScalarNode } from '../../../algebra/polynomial-core';
import {
  dependsOnVariable,
  flattenMultiply,
  isNodeArray,
} from '../../patterns';
import type { IntegralStrategy } from '../types';
import { profileRischNormanCandidate, type RischNormanProfile } from './index';

export type RischNormanTowerBasisFamily =
  | 'exponential'
  | 'sine-cosine'
  | 'exp-sine-cosine'
  | 'affine-log'
  | 'affine-log-rational'
  | 'symbolic-log-derivative'
  | 'symbolic-hermite-rational-correction'
  | 'symbolic-lrt-rational'
  | 'affine-rational-correction';

export type RischNormanTowerBasisSource =
  | 'extension-profile'
  | 'shape-detector'
  | 'rational-residual'
  | 'log-rational-residual';

export type RischNormanTowerBasisItem = {
  family: RischNormanTowerBasisFamily;
  publicStrategy: Extract<IntegralStrategy, 'integration-by-parts' | 'partial-fractions'>;
  source: RischNormanTowerBasisSource;
};

export type RischNormanTowerBasisOptions = {
  publicStrategies?: readonly IntegralStrategy[];
};

export type RischNormanTowerBasisProfile =
  | {
    kind: 'ready';
    variable: string;
    attempts: RischNormanTowerBasisItem[];
    basis: RischNormanTowerBasisItem[];
    extensionProfile: RischNormanProfile;
  }
  | {
    kind: 'stop';
    variable: string;
    reason: 'no-supported-family' | 'route-filtered';
    extensionProfile: RischNormanProfile;
  };

function allowsStrategy(
  options: RischNormanTowerBasisOptions | undefined,
  strategy: RischNormanTowerBasisItem['publicStrategy'],
) {
  return !options?.publicStrategies || options.publicStrategies.includes(strategy);
}

function hasNegativeIntegerPower(node: unknown) {
  if (!isNodeArray(node) || node[0] !== 'Power' || node.length !== 3) {
    return false;
  }

  const scalar = readExactScalarNode(node[2]);
  return Boolean(scalar && scalar.denominator === 1 && scalar.numerator < 0);
}

function containsRationalShape(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Divide' || hasNegativeIntegerPower(node)) {
    return true;
  }

  return node.slice(1).some(containsRationalShape);
}

function containsLog(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Ln' || node[0] === 'Log') {
    return true;
  }

  return node.slice(1).some(containsLog);
}

function containsSinCos(node: unknown): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Sin' || node[0] === 'Cos') {
    return true;
  }

  return node.slice(1).some(containsSinCos);
}

function containsExponential(node: unknown, variable: string): boolean {
  if (!isNodeArray(node)) {
    return false;
  }

  if (node[0] === 'Power' && node.length === 3 && dependsOnVariable(node[2], variable)) {
    return true;
  }

  return node.slice(1).some((child) => containsExponential(child, variable));
}

function topLevelFactors(node: unknown) {
  return isNodeArray(node) && node[0] === 'Multiply' ? flattenMultiply(node) : [node];
}

function hasTopLevelExpSinCosShape(node: unknown, variable: string) {
  const factors = topLevelFactors(node);
  return factors.some((factor) => containsExponential(factor, variable))
    && factors.some(containsSinCos);
}

function pushBasis(
  basis: RischNormanTowerBasisItem[],
  options: RischNormanTowerBasisOptions | undefined,
  item: RischNormanTowerBasisItem,
) {
  if (allowsStrategy(options, item.publicStrategy)) {
    basis.push(item);
  }
}

function dedupeBasis(basis: RischNormanTowerBasisItem[]) {
  return basis.filter((item, index) =>
    basis.findIndex((candidate) =>
      candidate.family === item.family && candidate.publicStrategy === item.publicStrategy) === index);
}

export function generateRischNormanTowerBasis(
  node: unknown,
  variable: string,
  options?: RischNormanTowerBasisOptions,
): RischNormanTowerBasisProfile {
  const extensionProfile = profileRischNormanCandidate(node, variable);
  const basis: RischNormanTowerBasisItem[] = [];
  const hasExp = containsExponential(node, variable);
  const hasTrigPair = containsSinCos(node);
  const hasExpTrig = hasTopLevelExpSinCosShape(node, variable);
  const hasLogHead = containsLog(node);
  const hasRational = containsRationalShape(node);

  if (hasExpTrig) {
    pushBasis(basis, options, {
      family: 'exp-sine-cosine',
      publicStrategy: 'integration-by-parts',
      source: 'shape-detector',
    });
  } else if (extensionProfile.kind === 'ready') {
    if (extensionProfile.family === 'affine-exp' || extensionProfile.family === 'positive-base-exp') {
      pushBasis(basis, options, {
        family: 'exponential',
        publicStrategy: 'integration-by-parts',
        source: 'extension-profile',
      });
    }
    if (extensionProfile.family === 'affine-sin-cos') {
      pushBasis(basis, options, {
        family: 'sine-cosine',
        publicStrategy: 'integration-by-parts',
        source: 'extension-profile',
      });
    }
    if (extensionProfile.family === 'affine-log') {
      pushBasis(basis, options, {
        family: 'affine-log',
        publicStrategy: 'integration-by-parts',
        source: 'extension-profile',
      });
    }
  } else {
    if (hasExp && !hasTrigPair) {
      pushBasis(basis, options, {
        family: 'exponential',
        publicStrategy: 'integration-by-parts',
        source: 'shape-detector',
      });
    }
    if (hasTrigPair && !hasExp) {
      pushBasis(basis, options, {
        family: 'sine-cosine',
        publicStrategy: 'integration-by-parts',
        source: 'shape-detector',
      });
    }
  }

  if (hasLogHead) {
    pushBasis(basis, options, {
      family: 'affine-log',
      publicStrategy: 'integration-by-parts',
      source: 'shape-detector',
    });
    if (hasRational) {
      pushBasis(basis, options, {
        family: 'affine-log-rational',
        publicStrategy: 'integration-by-parts',
        source: 'log-rational-residual',
      });
    }
  }

  if (hasRational) {
    pushBasis(basis, options, {
      family: 'symbolic-log-derivative',
      publicStrategy: 'partial-fractions',
      source: 'rational-residual',
    });
    pushBasis(basis, options, {
      family: 'symbolic-hermite-rational-correction',
      publicStrategy: 'partial-fractions',
      source: 'rational-residual',
    });
    pushBasis(basis, options, {
      family: 'symbolic-lrt-rational',
      publicStrategy: 'partial-fractions',
      source: 'rational-residual',
    });
    pushBasis(basis, options, {
      family: 'affine-rational-correction',
      publicStrategy: 'partial-fractions',
      source: 'rational-residual',
    });
  }

  const attempts = dedupeBasis(basis);
  if (attempts.length === 0) {
    return {
      kind: 'stop',
      variable,
      reason: options?.publicStrategies ? 'route-filtered' : 'no-supported-family',
      extensionProfile,
    };
  }

  return {
    kind: 'ready',
    variable,
    attempts,
    basis: attempts,
    extensionProfile,
  };
}
