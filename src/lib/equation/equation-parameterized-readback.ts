import type { DisplayDetailSection } from '../../types/calculator';

type BuildParameterizedBoundaryReadbackOptions = {
  reason: string;
  message: string;
  target: string;
  detectedVariables: string[];
  parameterNames?: string[];
  equationLatex?: string;
};

type BoundaryReadback = {
  error: string;
  detailSections: DisplayDetailSection[];
};

type BuildParameterizedDetailSectionsOptions = {
  target: string;
  parameterNames: string[];
  familyTitle: string;
  familyLines: string[];
  extraSections?: DisplayDetailSection[];
};

export function normalizeParameterizedSupplementLatex(entries?: string[]) {
  if (!entries || entries.length === 0) {
    return undefined;
  }

  const normalized = entries
    .map(normalizeRestrictionLatex)
    .filter((entry) => entry.trim().length > 0);

  return dedupe(normalized);
}

export function normalizeRestrictionLatex(latex: string) {
  const trimmed = latex.trim();
  const outerLeftRightInverse = trimmed.match(/^\\left\((.+)\\right\)\^\{-1\}(.+)$/);
  if (outerLeftRightInverse) {
    return `\\frac{1}{${outerLeftRightInverse[1]}}${outerLeftRightInverse[2]}`;
  }

  const outerPlainInverse = trimmed.match(/^\((.+)\)\^\{-1\}(.+)$/);
  if (outerPlainInverse) {
    return `\\frac{1}{${outerPlainInverse[1]}}${outerPlainInverse[2]}`;
  }

  return trimmed;
}

export function buildParameterizedSolveTargetSection(
  target: string,
  parameterNames: string[],
): DisplayDetailSection {
  return {
    title: 'Solve Target',
    lines: [
      `Selected target: ${target}`,
      parameterNames.length > 0
        ? `Symbolic parameters: ${parameterNames.join(', ')}`
        : 'No symbolic parameters were preserved.',
    ],
  };
}

export function buildParameterizedDetailSections({
  target,
  parameterNames,
  familyTitle,
  familyLines,
  extraSections = [],
}: BuildParameterizedDetailSectionsOptions): DisplayDetailSection[] {
  return normalizeParameterizedDetailSections([
    buildParameterizedSolveTargetSection(target, parameterNames),
    {
      title: familyTitle,
      lines: familyLines,
    },
    ...extraSections,
  ]);
}

export function buildParameterizedBoundaryReadback({
  reason,
  message,
  target,
  detectedVariables,
  parameterNames,
  equationLatex,
}: BuildParameterizedBoundaryReadbackOptions): BoundaryReadback {
  const resolvedParameterNames = parameterNames ?? detectedVariables.filter((name) => name !== target);
  const boundary = boundaryCopyForReason(reason, message, {
    target,
    detectedVariables,
    equationLatex,
  });
  const detailSections: DisplayDetailSection[] = [
    {
      title: 'Solve Target',
      lines: [
        detectedVariables.length > 0
          ? `Detected variables: ${detectedVariables.join(', ')}`
          : 'No supported variables were detected.',
        `Selected target: ${target}`,
        resolvedParameterNames.length > 0
          ? `Symbolic parameters: ${resolvedParameterNames.join(', ')}`
          : 'No symbolic parameters were preserved.',
      ],
    },
    {
      title: 'Why It Stopped',
      lines: [boundary.why],
    },
  ];

  if (boundary.suggestion) {
    detailSections.push({
      title: 'What To Try',
      lines: [boundary.suggestion],
    });
  }

  return {
    error: boundary.error,
    detailSections: normalizeParameterizedDetailSections(detailSections),
  };
}

export function normalizeParameterizedDetailSections(
  sections: DisplayDetailSection[],
): DisplayDetailSection[] {
  return sections.map((section) => ({
    ...section,
    lines: section.lines.map(normalizeRestrictionLine),
  }));
}

function normalizeRestrictionLine(line: string) {
  return sanitizeMilestoneWording(line).replace(/\\left\(([^]+?)\\right\)\^\{-1\}/g, (_match, denominator: string) =>
    `\\frac{1}{${denominator}}`,
  );
}

type BoundaryContext = {
  target: string;
  detectedVariables: string[];
  equationLatex?: string;
};

function boundaryCopyForReason(reason: string, message: string, context: BoundaryContext) {
  const normalizedReason = reason.toLowerCase();
  const sanitized = sanitizeMilestoneWording(message);
  const powerGuidance = selectedTargetPowerGuidance(context);
  if (powerGuidance) {
    return powerGuidance;
  }

  if (normalizedReason === 'domain-empty') {
    const trigRange = /trig|sine|cosine|range/i.test(message);
    return {
      error: 'No real solution remains for the selected target.',
      why: trigRange
        ? 'The requested value is outside the real range of the trigonometric carrier. Sine and cosine outputs must stay between -1 and 1.'
        : sanitized || 'The requested value violates a real-domain or range condition.',
      suggestion: trigRange
        ? 'Check whether the right side can fall inside the carrier range before solving.'
        : undefined,
    };
  }

  if (normalizedReason === 'ambiguous-adjacent-product') {
    return {
      error: 'The selected target is ambiguous in this equation.',
      why: 'Adjacent letters such as az or xz are ambiguous here; they are not treated as one named variable.',
      suggestion: 'Use explicit multiplication, such as a z, or use a single-letter solve target.',
    };
  }

  if (normalizedReason === 'mixed-carriers') {
    return {
      error: 'This equation mixes independent selected-target carriers.',
      why: 'The selected target appears in separate carrier expressions, so there is no single bounded isolation path.',
      suggestion: 'Try isolating one carrier first or rewrite the equation around one selected-target expression.',
    };
  }

  if (normalizedReason === 'nested-composition') {
    return {
      error: 'This equation needs a deeper composition pass.',
      why: 'The selected target is nested inside more composition layers than the current exact selected-target solver inverts.',
      suggestion: 'Try simplifying the nested carrier first, or use a numeric interval solve for a local answer.',
    };
  }

  if (normalizedReason === 'target-outside-carrier') {
    return {
      error: 'The selected target appears outside the isolated structure.',
      why: 'The selected target appears both inside and outside the carrier structure, so isolating one carrier would not isolate the target.',
      suggestion: 'Move all selected-target terms into one expression, or choose a simpler isolated target form.',
    };
  }

  if (normalizedReason === 'branch-limit') {
    return {
      error: 'This equation would create too many symbolic branches.',
      why: 'The exact branch expansion exceeds the current branch or periodic-family cap.',
      suggestion: 'Use a narrower equation form or a numeric interval solve for a specific branch.',
    };
  }

  if (
    normalizedReason === 'unsupported-branch'
    || normalizedReason === 'handoff-unsupported'
    || normalizedReason === 'branch-unsupported'
    || normalizedReason === 'cleared-equation-unsupported'
  ) {
    return {
      error: 'A generated branch is outside the current exact solvers.',
      why: 'The equation can be transformed into branch equations, but at least one branch is not supported by the current exact selected-target solvers.',
      suggestion: 'Try a simpler branch equation or use numeric solving for a local branch.',
    };
  }

  if (normalizedReason === 'cleared-degree-limit' || normalizedReason === 'degree-limit') {
    return {
      error: 'This equation exceeds the supported exact degree cap.',
      why: sanitized || 'The selected-target equation would require solving a higher-degree exact family.',
      suggestion: 'Try factoring the equation explicitly or reducing it to a lower-degree target equation.',
    };
  }

  if (normalizedReason === 'target-in-unsupported-operation' || normalizedReason === 'unsupported-shell') {
    return {
      error: 'This selected-target equation is outside the supported exact families.',
      why: sanitized || 'The selected target appears in an expression shape that is not supported by the current exact solver.',
      suggestion: undefined,
    };
  }

  return {
    error: 'This selected-target equation is outside the supported exact families.',
    why: sanitized || 'No supported exact selected-target solving path matched this equation.',
    suggestion: undefined,
  };
}

function selectedTargetPowerGuidance({
  target,
  detectedVariables,
  equationLatex,
}: BoundaryContext) {
  if (!equationLatex) {
    return null;
  }

  const targetPower = highestExplicitPower(equationLatex, target);
  if (targetPower < 3) {
    return null;
  }

  const easierTargets = detectedVariables
    .filter((name) => name !== target)
    .filter((name) => {
      const power = highestExplicitPower(equationLatex, name);
      return power > 1 && power <= 2;
    });
  const easierTarget = easierTargets[0];
  if (!easierTarget) {
    return null;
  }
  const powerName = targetPower === 3 ? 'cube-root' : `${targetPower}th-root`;

  return {
    error: `Solving for ${target} needs unsupported ${powerName} isolation.`,
    why: `The selected target appears as ${target}^${targetPower}. Isolating ${target} would require taking a symbolic ${powerName} after preserving the other symbols as parameters, and that exact isolation family is not enabled yet.`,
    suggestion: `If ${easierTarget} is the intended unknown, try solving for ${easierTarget}. Otherwise use numeric solve for ${target} on an interval.`,
  };
}

function highestExplicitPower(latex: string, symbol: string) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`${escaped}\\s*\\^\\s*(?:\\{\\s*(\\d+)\\s*\\}|(\\d+))`, 'g');
  let highest = latex.includes(symbol) ? 1 : 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(latex)) !== null) {
    highest = Math.max(highest, Number(match[1] ?? match[2] ?? 1));
  }
  return highest;
}

function sanitizeMilestoneWording(text: string) {
  return text
    .replace(/\bEQUATION-PARAM\d+\b/g, 'the current exact selected-target solver')
    .replace(/\bPARAM\d+\b/g, 'the current exact selected-target solver')
    .replace(/\bmilestone\b/gi, 'solver')
    .replace(/planned for a later solver/gi, 'not supported yet')
    .replace(/outside the current exact selected-target solver ([^.]+)/gi, 'outside the supported exact family')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupe(entries: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of entries) {
    if (seen.has(entry)) {
      continue;
    }

    seen.add(entry);
    result.push(entry);
  }

  return result;
}
