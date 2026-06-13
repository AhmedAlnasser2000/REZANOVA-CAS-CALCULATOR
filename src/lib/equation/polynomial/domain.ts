import { ComputeEngine, expand } from '@cortex-js/compute-engine';
import {
  classifyPolynomialDomainNode,
  type PolynomialDomainMetadata,
  type PolynomialDomainStopReason,
} from '../../algebra/polynomial-domain-core';

const ce = new ComputeEngine();

export type EquationPolynomialRelation =
  | 'Equal'
  | 'Less'
  | 'LessEqual'
  | 'Greater'
  | 'GreaterEqual';

type MathJson = string | number | boolean | null | MathJson[] | { [key: string]: MathJson | undefined };

export type EquationPolynomialDomainResult =
  | {
      kind: 'success';
      relation: EquationPolynomialRelation;
      target: string;
      zeroForm: MathJson;
      zeroFormLatex: string;
      metadata: PolynomialDomainMetadata;
    }
  | {
      kind: 'stop';
      reason: PolynomialDomainStopReason | 'unsupported-relation' | 'chained-relation';
    };

function isArrayNode(node: unknown): node is unknown[] {
  return Array.isArray(node);
}

export function isEquationPolynomialRelation(operator: unknown): operator is EquationPolynomialRelation {
  return operator === 'Equal'
    || operator === 'Less'
    || operator === 'LessEqual'
    || operator === 'Greater'
    || operator === 'GreaterEqual';
}

function simplifyNode(node: MathJson): MathJson {
  try {
    const simplified = ce.box(node as Parameters<typeof ce.box>[0]).simplify();
    const expanded = expand(simplified as never) as { json: unknown };
    return ce.box(expanded.json as Parameters<typeof ce.box>[0]).simplify().json as MathJson;
  } catch {
    return node;
  }
}

function latexForNode(node: MathJson) {
  try {
    return ce.box(node as Parameters<typeof ce.box>[0]).latex;
  } catch {
    return '';
  }
}

export function extractEquationPolynomialDomain(input: {
  equationLatex: string;
  target?: string | null;
  allowedRelations?: readonly EquationPolynomialRelation[];
  maxDegree?: number;
}): EquationPolynomialDomainResult {
  let json: unknown;
  try {
    json = ce.parse(input.equationLatex).json;
  } catch {
    return { kind: 'stop', reason: 'parse-failure' };
  }

  if (!isArrayNode(json) || !isEquationPolynomialRelation(json[0])) {
    return { kind: 'stop', reason: 'unsupported-relation' };
  }
  if (json.length !== 3) {
    return { kind: 'stop', reason: 'chained-relation' };
  }
  if (input.allowedRelations && !input.allowedRelations.includes(json[0])) {
    return { kind: 'stop', reason: 'unsupported-relation' };
  }

  const target = input.target ?? undefined;
  const zeroForm = simplifyNode(['Subtract', json[1] as MathJson, json[2] as MathJson]);
  const classified = classifyPolynomialDomainNode(zeroForm, {
    variable: target,
    maxDegree: input.maxDegree,
  });
  if (classified.kind === 'stop') {
    return classified;
  }

  return {
    kind: 'success',
    relation: json[0],
    target: classified.metadata.variable,
    zeroForm,
    zeroFormLatex: latexForNode(zeroForm),
    metadata: classified.metadata,
  };
}
