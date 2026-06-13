import { classifyPolynomialDomainNode } from '../../algebra/polynomial-domain-core';
import { exactScalarToNumber, getExactPolynomialCoefficient } from '../../algebra/polynomial-core';
import { allRealInequalitySet, emptyInequalitySet, periodicInequalitySetToText } from '../../algebra/inequality-core';
import { formatAngleLatex, convertAngle } from '../../trigonometry/angles';
import {
  isNodeArray,
  latexForNode,
  numericValueForNode,
  rawLatexForNode,
  relationText,
  reverseRelation,
} from './relation';
import { finiteSuccess } from './finite';
import { dedupeStrings } from './relation';
import {
  absAffineTangentSingularityLatex,
  buildAbsAffinePeriodicReadback,
  buildTrigPreimageBoundFormatter,
  periodFactLatex,
} from './periodic-format';
import {
  absAffinePreimageNumericPeriodicSet,
  numericPeriodicSetForTrigConstraint,
  periodicSetFromNumeric,
  solveInnerTrigValueRanges,
  tangentSingularityLatex,
  trigThresholdDegrees,
} from './periodic-set';
import {
  INNER_TRIG_VARIABLE,
  TRIG_EPSILON,
  type AngleUnit,
  type FiniteInequalityResult,
  type InequalityRelation,
  type NumericPeriodicInterval,
  type OutputStyle,
  type PeriodicInequalityResult,
  type TrigCall,
  type TrigFunctionKind,
} from './type-imports';

function parseAffineArgument(node: unknown, target: string) {
  const classified = classifyPolynomialDomainNode(node, { variable: target, maxDegree: 1 });
  if (classified.kind !== 'success' || classified.metadata.degree > 1) {
    return null;
  }
  const a = classified.metadata.degree === 1
    ? exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 1))
    : 0;
  const b = exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 0));
  if (Math.abs(a) <= TRIG_EPSILON) {
    return null;
  }
  return { a, b };
}

function parseAbsAffineArgument(node: unknown, target: string) {
  if (!isNodeArray(node) || node[0] !== 'Abs' || node.length !== 2) {
    return null;
  }
  const affine = parseAffineArgument(node[1], target);
  if (!affine) {
    return null;
  }
  return {
    affine,
    latex: latexForNode(node) || `\\left|${latexForNode(node[1])}\\right|`,
  };
}

function readTrigCall(node: unknown): TrigCall | null {
  if (!isNodeArray(node) || node.length !== 2) {
    return null;
  }
  if (node[0] === 'Sin' || node[0] === 'Cos' || node[0] === 'Tan') {
    return { kind: node[0].toLowerCase() as TrigFunctionKind, argument: node[1] };
  }
  return null;
}

function replaceSingleTrigCall(node: unknown): { node: unknown; trig: TrigCall } | null {
  const trig = readTrigCall(node);
  if (trig) {
    return { node: INNER_TRIG_VARIABLE, trig };
  }
  if (!isNodeArray(node)) {
    return null;
  }

  let found: TrigCall | null = null;
  let foundCount = 0;
  const children = node.slice(1).map((child) => {
    const replaced = replaceSingleTrigCall(child);
    if (!replaced) {
      return child;
    }
    foundCount += 1;
    found = replaced.trig;
    return replaced.node;
  });

  return found && foundCount === 1 ? { node: [node[0], ...children], trig: found } : null;
}

function parseAffineOuterTrigArgument(node: unknown, target: string) {
  const replaced = replaceSingleTrigCall(node);
  if (!replaced) {
    return null;
  }

  const innerAffine = parseAffineArgument(replaced.trig.argument, target);
  if (!innerAffine) {
    return null;
  }

  const classified = classifyPolynomialDomainNode(replaced.node, {
    variable: INNER_TRIG_VARIABLE,
    maxDegree: 1,
  });
  if (classified.kind !== 'success' || classified.metadata.degree !== 1) {
    return null;
  }

  return {
    outerAffine: {
      a: exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 1)),
      b: exactScalarToNumber(getExactPolynomialCoefficient(classified.metadata.polynomial, 0)),
    },
    inner: {
      kind: replaced.trig.kind,
      affine: innerAffine,
    },
  };
}


function nestedTrigInequality(input: {
  matched: TrigCall & { bound: unknown; relation: InequalityRelation };
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): PeriodicInequalityResult | FiniteInequalityResult | null {
  const parsed = parseAffineOuterTrigArgument(input.matched.argument, input.target);
  if (!parsed) {
    return null;
  }
  const threshold = numericValueForNode(input.matched.bound);
  if (threshold === null) {
    return null;
  }

  const outer = trigThresholdDegrees(input.matched.kind, input.matched.relation, threshold);
  if (outer.kind === 'all') {
    return finiteSuccess({
      set: allRealInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality from the outer function range.'],
      validWhenLatex: parsed.inner.kind === 'tan'
        ? [
            tangentSingularityLatex(input.target, parsed.inner.affine, input.angleUnit),
            periodFactLatex(formatAngleLatex(convertAngle(180, 'deg', input.angleUnit) / Math.abs(parsed.inner.affine.a), input.angleUnit)),
          ]
        : undefined,
    });
  }
  if (outer.kind === 'empty') {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality from the outer function range.'],
    });
  }
  if (parsed.inner.kind === 'tan') {
    return null;
  }

  const outerPeriod = outer.period * Math.PI / 180;
  const zRange = [
    parsed.outerAffine.b - Math.abs(parsed.outerAffine.a),
    parsed.outerAffine.b + Math.abs(parsed.outerAffine.a),
  ];
  const allowedInnerRanges: NumericPeriodicInterval[] = [];
  const inclusive = input.matched.relation === 'GreaterEqual' || input.matched.relation === 'LessEqual';

  for (const [lowerDegrees, upperDegrees] of outer.intervals) {
    const lower = lowerDegrees * Math.PI / 180;
    const upper = upperDegrees * Math.PI / 180;
    const firstShift = Math.floor((zRange[0] - upper) / outerPeriod) - 1;
    const lastShift = Math.ceil((zRange[1] - lower) / outerPeriod) + 1;
    for (let shift = firstShift; shift <= lastShift; shift += 1) {
      const shiftedLower = lower + shift * outerPeriod;
      const shiftedUpper = upper + shift * outerPeriod;
      let innerLower = (shiftedLower - parsed.outerAffine.b) / parsed.outerAffine.a;
      let innerUpper = (shiftedUpper - parsed.outerAffine.b) / parsed.outerAffine.a;
      if (innerLower > innerUpper) {
        [innerLower, innerUpper] = [innerUpper, innerLower];
      }
      innerLower = Math.max(-1, innerLower);
      innerUpper = Math.min(1, innerUpper);
      if (innerLower > innerUpper + TRIG_EPSILON) {
        continue;
      }
      allowedInnerRanges.push({
        lower: innerLower,
        lowerInclusive: inclusive,
        upper: innerUpper,
        upperInclusive: inclusive,
      });
    }
  }

  if (allowedInnerRanges.length === 0) {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'nested-periodic-trig',
      lines: ['Solved a two-layer trigonometric inequality after the outer range produced no inner values.'],
    });
  }

  const numericSet = solveInnerTrigValueRanges({
    kind: parsed.inner.kind,
    affine: parsed.inner.affine,
    ranges: allowedInnerRanges,
    target: input.target,
    angleUnit: input.angleUnit,
  });
  if (!numericSet) {
    return null;
  }
  const periodicSet = periodicSetFromNumeric(input.target, numericSet, input.angleUnit);
  return {
    kind: 'periodic',
    set: periodicSet,
    route: 'nested-periodic-trig',
    lines: [
      `Solved a two-layer ${input.matched.kind}/${parsed.inner.kind} trigonometric inequality as periodic real interval families.`,
      `Reduced the outer ${input.matched.kind} inequality to supported bounds on the inner ${parsed.inner.kind} value.`,
    ],
    proofDetails: [],
    validWhenLatex: [
      periodFactLatex(periodicSet.periodLatex),
    ],
  };
}

function trigInequality(input: {
  left: unknown;
  right: unknown;
  relation: InequalityRelation;
  target: string;
  angleUnit: AngleUnit;
  outputStyle: OutputStyle;
}): PeriodicInequalityResult | FiniteInequalityResult | null {
  const normalize = () => {
    const leftTrig = readTrigCall(input.left);
    if (leftTrig && numericValueForNode(input.right) !== null) {
      return { ...leftTrig, bound: input.right, relation: input.relation };
    }
    const rightTrig = readTrigCall(input.right);
    if (rightTrig && numericValueForNode(input.left) !== null) {
      return { ...rightTrig, bound: input.left, relation: reverseRelation(input.relation) };
    }
    return null;
  };
  const matched = normalize();
  if (!matched) {
    return null;
  }
  const threshold = numericValueForNode(matched.bound);
  const thresholdLatex = rawLatexForNode(matched.bound);
  const affine = parseAffineArgument(matched.argument, input.target);
  if (threshold === null) {
    return null;
  }
  if (!affine) {
    const absAffine = parseAbsAffineArgument(matched.argument, input.target);
    if (absAffine) {
      const numeric = numericPeriodicSetForTrigConstraint({
        kind: matched.kind,
        relation: matched.relation,
        threshold,
        affine: { a: 1, b: 0 },
        angleUnit: input.angleUnit,
      });
      if (numeric.kind === 'all') {
        return finiteSuccess({
          set: allRealInequalitySet(input.target),
          route: 'abs-affine-periodic-trig',
          lines: ['Solved an abs-affine trigonometric inequality from the function range.'],
          validWhenLatex: [`${absAffine.latex}\\ge0`],
        });
      }
      if (numeric.kind === 'empty') {
        return finiteSuccess({
          set: emptyInequalitySet(input.target),
          route: 'abs-affine-periodic-trig',
          lines: ['Solved an abs-affine trigonometric inequality from the function range.'],
          validWhenLatex: [`${absAffine.latex}\\ge0`],
        });
      }

      const xNumericSet = absAffinePreimageNumericPeriodicSet(numeric.set, absAffine.affine);
      const readback = buildAbsAffinePeriodicReadback({
        set: numeric.set,
        kind: matched.kind,
        threshold,
        thresholdLatex,
        affine: absAffine.affine,
        target: input.target,
        angleUnit: input.angleUnit,
        outputStyle: input.outputStyle,
      });
      const decimalReadback = input.outputStyle === 'both'
        ? buildAbsAffinePeriodicReadback({
            set: numeric.set,
            kind: matched.kind,
            threshold,
            thresholdLatex,
            affine: absAffine.affine,
            target: input.target,
            angleUnit: input.angleUnit,
            outputStyle: 'decimal',
          })
        : null;
      const formatBoundLatex = buildTrigPreimageBoundFormatter({
        kind: matched.kind,
        threshold,
        thresholdLatex,
        affine: absAffine.affine,
        angleUnit: input.angleUnit,
        outputStyle: input.outputStyle,
        argumentPeriod: numeric.set.period,
      });
      const periodicSet = periodicSetFromNumeric(input.target, xNumericSet, input.angleUnit, {
        formatBoundLatex,
      });
      return {
        kind: 'periodic',
        set: periodicSet,
        route: 'abs-affine-periodic-trig',
        lines: [
          `Solved an abs-affine ${matched.kind} inequality as x-periodic real interval families.`,
          `Relation tested: ${matched.kind}(u) ${relationText(matched.relation)} ${latexForNode(matched.bound)} with u=${absAffine.latex}.`,
        ],
        proofDetails: [
          `Split ${absAffine.latex} into affine branches and flattened the periodic preimage back to ${input.target}.`,
        ],
        validWhenLatex: dedupeStrings([
          '\\text{Branch index } n\\in\\mathbb{Z}_{\\ge0}',
          `\\text{Branch step: } ${readback.periodLatex}`,
          ...(matched.kind === 'tan'
            ? absAffineTangentSingularityLatex({
                target: input.target,
                affine: absAffine.affine,
                unit: input.angleUnit,
              })
            : []),
        ]),
        exactLatexOverride: readback.exactLatex,
        readbackTextOverride: readback.text,
        ...(decimalReadback ? { approxText: decimalReadback.text } : {}),
      };
    }
    return nestedTrigInequality({
      matched,
      target: input.target,
      angleUnit: input.angleUnit,
      outputStyle: input.outputStyle,
    });
  }

  const numeric = numericPeriodicSetForTrigConstraint({
    kind: matched.kind,
    relation: matched.relation,
    threshold,
    affine,
    angleUnit: input.angleUnit,
  });
  if (numeric.kind === 'all') {
    return finiteSuccess({
      set: allRealInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }
  if (numeric.kind === 'empty') {
    return finiteSuccess({
      set: emptyInequalitySet(input.target),
      route: 'periodic-trig',
      lines: ['Solved a direct trigonometric inequality from the function range.'],
    });
  }

  const formatBoundLatex = buildTrigPreimageBoundFormatter({
    kind: matched.kind,
    threshold,
    thresholdLatex,
    affine,
    angleUnit: input.angleUnit,
    outputStyle: input.outputStyle,
    argumentPeriod: numeric.set.period * Math.abs(affine.a),
  });
  const periodicSet = periodicSetFromNumeric(input.target, numeric.set, input.angleUnit, {
    formatBoundLatex,
  });
  const decimalSet = input.outputStyle === 'both'
    ? periodicSetFromNumeric(input.target, numeric.set, input.angleUnit, {
        formatBoundLatex: buildTrigPreimageBoundFormatter({
          kind: matched.kind,
          threshold,
          thresholdLatex,
          affine,
          angleUnit: input.angleUnit,
          outputStyle: 'decimal',
          argumentPeriod: numeric.set.period * Math.abs(affine.a),
        }),
      })
    : null;

  return {
    kind: 'periodic',
    set: periodicSet,
    route: 'periodic-trig',
    lines: [
      `Solved a direct affine ${matched.kind} inequality as periodic real interval families.`,
      `Relation tested: ${matched.kind}(u) ${relationText(matched.relation)} ${latexForNode(matched.bound)}.`,
    ],
    proofDetails: [],
    validWhenLatex: dedupeStrings([
      periodFactLatex(periodicSet.periodLatex),
      ...(matched.kind === 'tan'
        ? [tangentSingularityLatex(input.target, affine, input.angleUnit)]
        : []),
    ]),
    ...(decimalSet ? { approxText: periodicInequalitySetToText(decimalSet) } : {}),
  };
}


export { trigInequality };
