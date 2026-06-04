import { ComputeEngine } from '@cortex-js/compute-engine';
import type { Settings } from '../../types/calculator';
import {
  boxLatex,
  compactRepeatedProductFactors,
  isFiniteNumber,
  isNodeArray,
  wrapGroupedLatex,
} from '../symbolic-engine/patterns';

const ce = new ComputeEngine();

export type SymbolicDisplayPrefs = Pick<
  Settings,
  'symbolicDisplayMode' | 'flattenNestedRootsWhenSafe'
>;

type DisplayRenderResult = {
  latex: string;
  changed: boolean;
  targeted: boolean;
};

type RenderOptions = {
  preserveRadicals?: boolean;
};

type RationalValue = {
  numerator: number;
  denominator: number;
};

type RadicalDisplayInfo = {
  base: unknown;
  numerator: number;
  denominator: number;
  source: 'plain-root' | 'nested-root' | 'power';
};

const RELATION_LATEX: Record<string, string> = {
  Equal: '=',
  NotEqual: '\\ne',
  Less: '<',
  LessEqual: '\\le',
  Greater: '>',
  GreaterEqual: '\\ge',
};

function combineRelationLatex(left: string, operator: string, right: string) {
  const relation = RELATION_LATEX[operator];
  const separator = relation.startsWith('\\') ? ' ' : '';
  return `${left}${relation}${separator}${right}`;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function reduceRational(numerator: number, denominator: number): RationalValue {
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    numerator: (sign * numerator) / divisor,
    denominator: (sign * denominator) / divisor,
  };
}

function asPositiveInteger(node: unknown): number | undefined {
  return isFiniteNumber(node) && Number.isInteger(node) && node > 1 ? node : undefined;
}

function asRational(node: unknown): RationalValue | undefined {
  if (isFiniteNumber(node) && Number.isInteger(node)) {
    return { numerator: node, denominator: 1 };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return undefined;
  }

  const [head, left, right] = node;
  if (
    head === 'Rational'
    && isFiniteNumber(left)
    && Number.isInteger(left)
    && isFiniteNumber(right)
    && Number.isInteger(right)
    && right !== 0
  ) {
    return reduceRational(left, right);
  }

  if (
    head === 'Divide'
    && isFiniteNumber(left)
    && Number.isInteger(left)
    && isFiniteNumber(right)
    && Number.isInteger(right)
    && right !== 0
  ) {
    return reduceRational(left, right);
  }

  return undefined;
}

function isExponentialE(node: unknown) {
  return node === 'ExponentialE' || boxLatex(node) === '\\exponentialE';
}

function isPlainFamiliarRoot(info: RadicalDisplayInfo) {
  return info.source === 'plain-root' && info.numerator === 1 && (info.denominator === 2 || info.denominator === 3);
}

function extractRadicalDisplayInfo(node: unknown): RadicalDisplayInfo | null {
  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  const [head, left, right] = node;
  if (head === 'Sqrt') {
    const inner = extractRadicalDisplayInfo(left);
    if (inner) {
      const combined = reduceRational(inner.numerator, inner.denominator * 2);
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
        source: 'nested-root',
      };
    }

    return { base: left, numerator: 1, denominator: 2, source: 'plain-root' };
  }

  if (head === 'Root') {
    const index = asPositiveInteger(right);
    if (!index) {
      return null;
    }

    const inner = extractRadicalDisplayInfo(left);
    if (inner) {
      const combined = reduceRational(inner.numerator, inner.denominator * index);
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
        source: 'nested-root',
      };
    }

    return { base: left, numerator: 1, denominator: index, source: 'plain-root' };
  }

  if (head === 'Power') {
    const exponent = asRational(right);
    if (!exponent) {
      return null;
    }

    const inner = extractRadicalDisplayInfo(left);
    if (inner) {
      const combined = reduceRational(
        inner.numerator * exponent.numerator,
        inner.denominator * exponent.denominator,
      );
      return {
        base: inner.base,
        numerator: combined.numerator,
        denominator: combined.denominator,
        source: 'power',
      };
    }

    if (exponent.denominator > 1) {
      return {
        base: left,
        numerator: exponent.numerator,
        denominator: exponent.denominator,
        source: 'power',
      };
    }
  }

  return null;
}

function formatRationalExponentLatex(value: RationalValue) {
  if (value.denominator === 1) {
    return boxLatex(value.numerator);
  }

  return `\\frac{${boxLatex(value.numerator)}}{${boxLatex(value.denominator)}}`;
}

function buildNestedRootNode(node: unknown): unknown {
  if (!isNodeArray(node) || node.length === 0) {
    return node;
  }

  const [head, ...children] = node;
  const [left, right] = children;
  if (head === 'Sqrt') {
    return ['Sqrt', buildNestedRootNode(left)];
  }

  if (head === 'Root') {
    return ['Root', buildNestedRootNode(left), buildNestedRootNode(right)];
  }

  if (head === 'Power') {
    const exponent = asRational(right);
    if (exponent && exponent.denominator > 1) {
      const nestedBase = buildNestedRootNode(left);
      const poweredBase = exponent.numerator === 1
        ? nestedBase
        : ['Power', nestedBase, exponent.numerator];
      return exponent.denominator === 2
        ? ['Sqrt', poweredBase]
        : ['Root', poweredBase, exponent.denominator];
    }

    return ['Power', buildNestedRootNode(left), buildNestedRootNode(right)];
  }

  return [head, ...children.map((child) => buildNestedRootNode(child))];
}

function wrapPowerBaseLatex(latex: string, node: unknown) {
  if (typeof node === 'string' || typeof node === 'number') {
    return latex;
  }

  if (!isNodeArray(node) || node.length === 0) {
    return latex;
  }

  const head = node[0];
  return head === 'Sqrt' || head === 'Root' || head === 'Ln' || head === 'Log'
    ? latex
    : wrapGroupedLatex(latex);
}

function wrapAdditiveTerm(latex: string, node: unknown) {
  if (!isNodeArray(node) || node.length === 0) {
    return latex;
  }

  const head = node[0];
  return head === 'Add' || head === 'Equal' || head === 'NotEqual' || head === 'Less' || head === 'LessEqual' || head === 'Greater' || head === 'GreaterEqual'
    ? `\\left(${latex}\\right)`
    : latex;
}

function combineAdditiveLatex(children: Array<{ node: unknown; render: DisplayRenderResult }>) {
  const [first, ...rest] = children;
  let latex = first.render.latex;

  for (const child of rest) {
    const childNode = child.node;
    if (isNodeArray(childNode) && childNode[0] === 'Negate' && childNode.length === 2) {
      latex += `-${wrapAdditiveTerm(child.render.latex.slice(1), childNode[1])}`;
      continue;
    }

    if (typeof childNode === 'number' && childNode < 0) {
      latex += `-${boxLatex(Math.abs(childNode))}`;
      continue;
    }

    latex += `+${child.render.latex}`;
  }

  return latex;
}

function combineMultiplicativeLatex(children: Array<{ node: unknown; render: DisplayRenderResult }>) {
  return children
    .map((child) => wrapAdditiveTerm(child.render.latex, child.node))
    .join('\\,');
}

function numericNodeValue(node: unknown): number | null {
  return typeof node === 'number' && Number.isFinite(node) ? node : null;
}

function imaginaryUnitTermLatex(coefficient: number) {
  if (coefficient === 1) {
    return '\\imaginaryI';
  }
  if (coefficient === -1) {
    return '-\\imaginaryI';
  }
  return `${boxLatex(coefficient)}\\imaginaryI`;
}

function renderComplexDisplayNode(node: unknown): DisplayRenderResult | null {
  if (node === 'ImaginaryUnit') {
    return {
      latex: '\\imaginaryI',
      changed: true,
      targeted: true,
    };
  }

  if (!isNodeArray(node) || node[0] !== 'Complex' || node.length !== 3) {
    return null;
  }

  const real = numericNodeValue(node[1]);
  const imaginary = numericNodeValue(node[2]);
  if (real === null || imaginary === null) {
    return null;
  }

  if (imaginary === 0) {
    return {
      latex: boxLatex(real),
      changed: true,
      targeted: true,
    };
  }

  if (real === 0) {
    return {
      latex: imaginaryUnitTermLatex(imaginary),
      changed: true,
      targeted: true,
    };
  }

  const imaginaryMagnitude = imaginaryUnitTermLatex(Math.abs(imaginary));
  return {
    latex: `${boxLatex(real)}${imaginary < 0 ? '-' : '+'}${imaginaryMagnitude.replace(/^-/, '')}`,
    changed: true,
    targeted: true,
  };
}

function serializeRootStructure(node: unknown, prefs: SymbolicDisplayPrefs): DisplayRenderResult {
  return renderNode(node, prefs, { preserveRadicals: true });
}

function renderRadicalAsPower(
  info: RadicalDisplayInfo,
  prefs: SymbolicDisplayPrefs,
): DisplayRenderResult {
  const base = renderNode(info.base, prefs);
  const exponentLatex = formatRationalExponentLatex({
    numerator: info.numerator,
    denominator: info.denominator,
  });
  return {
    latex: `${wrapPowerBaseLatex(base.latex, info.base)}^{${exponentLatex}}`,
    changed: true,
    targeted: true,
  };
}

function renderRadicalAsRoot(
  info: RadicalDisplayInfo,
  prefs: SymbolicDisplayPrefs,
): DisplayRenderResult {
  const base = renderNode(info.base, prefs);
  const poweredBaseLatex = info.numerator === 1
    ? base.latex
    : `${wrapPowerBaseLatex(base.latex, info.base)}^{${boxLatex(info.numerator)}}`;

  if (info.denominator === 1) {
    return {
      latex: poweredBaseLatex,
      changed: true,
      targeted: true,
    };
  }

  if (info.denominator === 2) {
    return {
      latex: `\\sqrt{${poweredBaseLatex}}`,
      changed: true,
      targeted: true,
    };
  }

  return {
    latex: `\\sqrt[${boxLatex(info.denominator)}]{${poweredBaseLatex}}`,
    changed: true,
    targeted: true,
  };
}

function renderTargetedNode(node: unknown, prefs: SymbolicDisplayPrefs): DisplayRenderResult | null {
  const info = extractRadicalDisplayInfo(node);
  if (info && info.denominator > 0) {
    const mode = prefs.symbolicDisplayMode === 'roots' ? 'roots' : 'powers';
    const preserveOriginalRoots = mode === 'roots'
      ? info.numerator === 1
        && info.source !== 'plain-root'
        && !prefs.flattenNestedRootsWhenSafe
      : isPlainFamiliarRoot(info);

    if (preserveOriginalRoots) {
      const preserved = serializeRootStructure(buildNestedRootNode(node), prefs);
      return {
        ...preserved,
        changed: true,
        targeted: true,
      };
    }

    if (mode === 'powers') {
      return renderRadicalAsPower(info, prefs);
    }

    return renderRadicalAsRoot(info, prefs);
  }

  if (!isNodeArray(node) || node.length === 0) {
    return null;
  }

  const [head, argument, base] = node;
  if (head === 'Ln' && argument !== undefined) {
    const renderedArgument = renderNode(argument, prefs);
    return {
      latex: `\\ln\\left(${renderedArgument.latex}\\right)`,
      changed: true,
      targeted: true,
    };
  }

  if (head === 'Log' && argument !== undefined) {
    const renderedArgument = renderNode(argument, prefs);
    if (base === undefined || base === 10) {
      return {
        latex: `\\log\\left(${renderedArgument.latex}\\right)`,
        changed: true,
        targeted: true,
      };
    }

    if (isExponentialE(base)) {
      return {
        latex: `\\ln\\left(${renderedArgument.latex}\\right)`,
        changed: true,
        targeted: true,
      };
    }

    const renderedBase = renderNode(base, prefs);
    return {
      latex: `\\log_{${renderedBase.latex}}\\left(${renderedArgument.latex}\\right)`,
      changed: true,
      targeted: true,
    };
  }

  return null;
}

function renderNode(
  node: unknown,
  prefs: SymbolicDisplayPrefs,
  options: RenderOptions = {},
): DisplayRenderResult {
  const compactedProduct = compactRepeatedProductFactors(node);
  if (compactedProduct !== node) {
    const compacted = renderNode(compactedProduct, prefs, options);
    return {
      ...compacted,
      changed: true,
    };
  }

  if (!options.preserveRadicals) {
    const targeted = renderTargetedNode(node, prefs);
    if (targeted) {
      return targeted;
    }
  }

  const complexDisplay = renderComplexDisplayNode(node);
  if (complexDisplay) {
    return complexDisplay;
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return {
      latex: boxLatex(node),
      changed: false,
      targeted: false,
    };
  }

  if (!isNodeArray(node) || node.length === 0) {
    return {
      latex: boxLatex(node),
      changed: false,
      targeted: false,
    };
  }

  const [head, ...children] = node;
  const renderedChildren = children.map((child) => ({
    node: child,
    render: renderNode(child, prefs, options),
  }));
  const hasTargetedChild = renderedChildren.some((child) => child.render.targeted);

  switch (head) {
    case 'Equal':
    case 'NotEqual':
    case 'Less':
    case 'LessEqual':
    case 'Greater':
    case 'GreaterEqual':
      if (renderedChildren.length === 2) {
        return {
          latex: combineRelationLatex(
            renderedChildren[0].render.latex,
            head,
            renderedChildren[1].render.latex,
          ),
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Add':
      if (renderedChildren.length > 0) {
        return {
          latex: combineAdditiveLatex(renderedChildren),
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Multiply':
      if (renderedChildren.length > 0) {
        return {
          latex: combineMultiplicativeLatex(renderedChildren),
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Divide':
      if (renderedChildren.length === 2) {
        return {
          latex: `\\frac{${renderedChildren[0].render.latex}}{${renderedChildren[1].render.latex}}`,
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Negate':
      if (renderedChildren.length === 1) {
        return {
          latex: `-${wrapAdditiveTerm(renderedChildren[0].render.latex, renderedChildren[0].node)}`,
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Power':
      if (renderedChildren.length === 2) {
        return {
          latex: `${wrapPowerBaseLatex(renderedChildren[0].render.latex, renderedChildren[0].node)}^{${renderedChildren[1].render.latex}}`,
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Sqrt':
      if (renderedChildren.length === 1) {
        return {
          latex: `\\sqrt{${renderedChildren[0].render.latex}}`,
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Root':
      if (renderedChildren.length === 2) {
        return {
          latex: `\\sqrt[${renderedChildren[1].render.latex}]{${renderedChildren[0].render.latex}}`,
          changed: hasTargetedChild,
          targeted: hasTargetedChild,
        };
      }
      break;
    case 'Ln':
      if (renderedChildren.length === 1) {
        return {
          latex: `\\ln\\left(${renderedChildren[0].render.latex}\\right)`,
          changed: true,
          targeted: true,
        };
      }
      break;
    case 'Log':
      if (renderedChildren.length === 1) {
        return {
          latex: `\\log\\left(${renderedChildren[0].render.latex}\\right)`,
          changed: true,
          targeted: true,
        };
      }
      if (renderedChildren.length === 2) {
        const baseNode = children[1];
        if (baseNode === 10) {
          return {
            latex: `\\log\\left(${renderedChildren[0].render.latex}\\right)`,
            changed: true,
            targeted: true,
          };
        }
      }
      break;
    default:
      break;
  }

  return {
    latex: boxLatex(node),
    changed: false,
    targeted: hasTargetedChild,
  };
}

export function normalizeSymbolicDisplayLatex(
  latex: string | undefined,
  prefs: SymbolicDisplayPrefs | undefined,
) {
  if (!latex || !prefs || latex.includes('\\text{')) {
    return latex;
  }

  try {
    const parsed = ce.parse(latex);
    const rendered = renderNode(parsed.json, prefs);
    return rendered.changed ? rendered.latex : latex;
  } catch {
    return latex;
  }
}
