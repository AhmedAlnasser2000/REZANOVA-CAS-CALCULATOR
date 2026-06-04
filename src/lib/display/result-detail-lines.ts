import type {
  DisplayDetailLineKind,
  DisplayDetailLinePart,
  DisplayDetailSection,
} from '../../types/calculator';

export function detailLineKindAt(
  section: Pick<DisplayDetailSection, 'lineKind' | 'lineKinds'>,
  index: number,
): DisplayDetailLineKind {
  return section.lineKinds?.[index] ?? section.lineKind ?? 'text';
}

export function cloneDisplayDetailSection(section: DisplayDetailSection): DisplayDetailSection {
  return {
    ...section,
    lines: [...section.lines],
    lineKinds: section.lineKinds ? [...section.lineKinds] : undefined,
    lineParts: section.lineParts
      ? section.lineParts.map((parts) => parts.map((part) => ({ ...part })))
      : undefined,
  };
}

export function mathDetailSection(title: string, lines: readonly string[]): DisplayDetailSection {
  return {
    title,
    lines: [...lines],
    lineKind: 'math',
  };
}

export function textPart(text: string): DisplayDetailLinePart {
  return { kind: 'text', text };
}

export function mathPart(latex: string): DisplayDetailLinePart {
  return { kind: 'math', latex };
}

export function detailLineFromParts(parts: readonly DisplayDetailLinePart[]) {
  const line = parts
    .map((part) => part.kind === 'math' ? part.latex : part.text)
    .join('');

  return {
    line,
    parts: parts.map((part) => ({ ...part })),
  };
}

export function mixedDetailSection(
  title: string,
  rows: readonly (readonly DisplayDetailLinePart[])[],
): DisplayDetailSection {
  const built = rows.map((parts) => detailLineFromParts(parts));
  return {
    title,
    lines: built.map((entry) => entry.line),
    lineParts: built.map((entry) => entry.parts),
  };
}

export function detailLinePartsAt(
  section: Pick<DisplayDetailSection, 'lineParts'>,
  index: number,
) {
  return section.lineParts?.[index];
}

export function equationLabelLineParts(label: string, latex: string): DisplayDetailLinePart[] {
  return [
    textPart(`${label}: `),
    mathPart(latex),
  ];
}

export function inferDetailLinePartsFromText(line: string): DisplayDetailLinePart[] | undefined {
  if (!line.trim()) {
    return undefined;
  }

  const labelMatch = line.match(/^(Generated equation|Isolated form|Formula form|Reduced carrier|Factorization):\s*(.+)$/u);
  if (labelMatch) {
    return equationLabelLineParts(labelMatch[1], labelMatch[2]);
  }

  const relationMatch = line.match(/^(Relation tested):\s*(.+)$/u);
  if (relationMatch) {
    return equationLabelLineParts(relationMatch[1], relationMatch[2].replace(/\.$/u, ''));
  }

  const formulaBranchesMatch = line.match(/^(Formula branches):\s*(.+)$/u);
  if (formulaBranchesMatch) {
    return equationLabelLineParts(formulaBranchesMatch[1], formulaBranchesMatch[2]);
  }

  if (line.startsWith('Composition branch: ')) {
    return splitCompositionBranchLine(line);
  }

  if (line.startsWith('Principal range: ')) {
    return splitCompositionBranchLine(line);
  }

  if (line.startsWith('Range guard: ')) {
    return splitCompositionBranchLine(line);
  }

  if (line.startsWith('Sawtooth closure: ')) {
    return splitCompositionBranchLine(line);
  }

  if (line.startsWith('Inverted ') || line.startsWith('Lifted ')) {
    return splitInversionLine(line);
  }

  return undefined;
}

function splitCompositionBranchLine(line: string): DisplayDetailLinePart[] | undefined {
  const prefixMatch = line.match(/^([^:]+:\s*)(.+)$/u);
  if (!prefixMatch) {
    return undefined;
  }

  const parts: DisplayDetailLinePart[] = [textPart(prefixMatch[1])];
  let rest = prefixMatch[2];

  const pushMathUntil = (marker: string) => {
    const index = rest.indexOf(marker);
    if (index < 0) {
      return false;
    }
    const math = rest.slice(0, index).trim();
    if (math) {
      parts.push(mathPart(math));
    }
    parts.push(textPart(marker));
    rest = rest.slice(index + marker.length);
    return true;
  };

  if (!pushMathUntil(' stays in ')) {
    return undefined;
  }
  if (!pushMathUntil(', so ')) {
    const cannotIndex = rest.indexOf(' cannot equal ');
    if (cannotIndex >= 0) {
      const math = rest.slice(0, cannotIndex).trim();
      if (math) {
        parts.push(mathPart(math));
      }
      parts.push(textPart(' cannot equal '));
      const target = rest.slice(cannotIndex + ' cannot equal '.length).replace(/\.$/u, '').trim();
      if (target) {
        parts.push(mathPart(target));
      }
      parts.push(textPart('.'));
      return parts;
    }
    return undefined;
  }

  const reducesIndex = rest.indexOf(' reduces to ');
  if (reducesIndex >= 0) {
    const equation = rest.slice(0, reducesIndex).trim();
    if (equation) {
      parts.push(mathPart(equation));
    }
    parts.push(textPart(' reduces to '));
    const reduced = rest.slice(reducesIndex + ' reduces to '.length).replace(/\.$/u, '').trim();
    if (reduced) {
      parts.push(mathPart(reduced));
    }
    parts.push(textPart('.'));
    return parts;
  }

  const cannotIndex = rest.indexOf(' cannot equal ');
  if (cannotIndex >= 0) {
    const carrier = rest.slice(0, cannotIndex).trim();
    if (carrier) {
      parts.push(mathPart(carrier));
    }
    parts.push(textPart(' cannot equal '));
    const target = rest.slice(cannotIndex + ' cannot equal '.length).replace(/\.$/u, '').trim();
    if (target) {
      parts.push(mathPart(target));
    }
    parts.push(textPart('.'));
    return parts;
  }

  return undefined;
}

function splitInversionLine(line: string): DisplayDetailLinePart[] | undefined {
  const markers = [' into ', ' to '];
  const prefix = line.startsWith('Inverted ') ? 'Inverted ' : 'Lifted ';
  const marker = markers.find((candidate) => line.includes(candidate));
  if (!marker) {
    return undefined;
  }
  const body = line.slice(prefix.length);
  const index = body.indexOf(marker);
  if (index < 0) {
    return undefined;
  }
  const left = body.slice(0, index).trim();
  const right = body.slice(index + marker.length).replace(/\.$/u, '').trim();
  if (!left || !right) {
    return undefined;
  }
  return [
    textPart(prefix),
    mathPart(left),
    textPart(marker),
    mathPart(right),
    ...(line.endsWith('.') ? [textPart('.')] : []),
  ];
}
