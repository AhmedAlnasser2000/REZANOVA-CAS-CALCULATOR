import {
  normalizeGraphItemPresentation,
  ptxAsymptoteLabel,
  ptxNumber,
  resolveGraphPresentationColor,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
} from '../../../lib/graphing';
import type { PtxAsymptoteLine } from './usePtxPointsOfInterest';

/** A label number: an exact multiple of π reads as one (tan x has poles at x = π/2 + kπ), anything else to six digits. */
export function asymptoteLabelNumber(value: number) {
  const turns = value / Math.PI;
  for (let denominator = 1; denominator <= 12 && value !== 0; denominator += 1) {
    const numerator = Math.round(turns * denominator);
    if (numerator === 0 || Math.abs(turns * denominator - numerator) > 1e-9 * Math.max(1, Math.abs(numerator))) continue;
    const divisor = gcd(Math.abs(numerator), denominator); const p = numerator / divisor; const q = denominator / divisor;
    const top = `${p < 0 ? '−' : ''}${Math.abs(p) === 1 ? '' : Math.abs(p)}π`;
    return q === 1 ? top : `${top}/${q}`;
  }
  return ptxNumber(value).replace('-', '−');
}

function gcd(a: number, b: number): number { return b === 0 ? a : gcd(b, a % b); }

const SVG = 'http://www.w3.org/2000/svg';

function colourOf(itemId: string, presentation: GraphRendererPresentationFrame) {
  const entry = presentation.items.find((candidate) => candidate.itemId === itemId);
  const mode = presentation.version === 2 ? presentation.colorVisionMode : 'standard';
  return entry ? resolveGraphPresentationColor(normalizeGraphItemPresentation(entry.presentation), mode) : '#9aa7a1';
}

/**
 * Draws asymptotes as thin dashed lines in their curve's colour across the
 * view, each labelled with its equation at the pane edge. Redrawn on every
 * frame from the live viewport, so they follow pan and zoom. Never traced.
 */
export function placeAsymptotes(layer: SVGSVGElement | null, lines: readonly PtxAsymptoteLine[], presentation: GraphRendererPresentationFrame,
  live: GraphViewportV1, size: { width: number; height: number }) {
  if (!layer) return;
  layer.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
  const toX = (x: number) => (x - live.xMin) / (live.xMax - live.xMin) * size.width;
  const toY = (y: number) => (live.yMax - y) / (live.yMax - live.yMin) * size.height;
  const children: SVGElement[] = [];
  for (const line of lines) {
    const colour = colourOf(line.itemId, presentation);
    let x1: number; let y1: number; let x2: number; let y2: number;
    if (line.kind === 'vertical') { x1 = x2 = toX(line.value); y1 = 0; y2 = size.height; }
    else if (line.kind === 'horizontal') { y1 = y2 = toY(line.value); x1 = 0; x2 = size.width; }
    else { x1 = 0; x2 = size.width; y1 = toY(line.slope * live.xMin + line.value); y2 = toY(line.slope * live.xMax + line.value); }
    const visible = line.kind === 'vertical' ? x1 >= 0 && x1 <= size.width
      : line.kind === 'horizontal' ? y1 >= 0 && y1 <= size.height : Math.min(y1, y2) <= size.height && Math.max(y1, y2) >= 0;
    if (!visible) continue;
    const element = document.createElementNS(SVG, 'line');
    element.setAttribute('x1', String(x1)); element.setAttribute('y1', String(y1));
    element.setAttribute('x2', String(x2)); element.setAttribute('y2', String(y2));
    element.setAttribute('stroke', colour); element.dataset.itemId = line.itemId; element.dataset.kind = line.kind;
    children.push(element);
    const label = document.createElementNS(SVG, 'text');
    label.textContent = ptxAsymptoteLabel(line.kind === 'vertical' ? { kind: 'vertical', x: line.value, sides: [-1, 1], level: line.level }
      : line.kind === 'horizontal' ? { kind: 'horizontal', y: line.value, sides: [-1, 1], level: line.level }
        : { kind: 'oblique', slope: line.slope, intercept: line.value, sides: [-1, 1], level: line.level }, asymptoteLabelNumber);
    // Vertical labels sit near the top, others near the right edge above their line.
    // A vertical label near the right edge goes on the line's left so it is never cut off (11px monospace ≈ 6.7px a character).
    const flip = line.kind === 'vertical' && x1 + 6 + 6.7 * (label.textContent?.length ?? 0) > size.width;
    const labelX = line.kind === 'vertical' ? (flip ? x1 - 6 : x1 + 6) : size.width - 8;
    const labelY = line.kind === 'vertical' ? 58 : Math.max(14, Math.min(size.height - 8, y2 - 6));
    label.setAttribute('x', String(labelX)); label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', line.kind === 'vertical' && !flip ? 'start' : 'end');
    // The line carries the curve's colour; its equation is neutral text so it reads on any curve colour.
    label.dataset.itemId = line.itemId; label.dataset.testid = 'graph-ptx-asymptote-label';
    children.push(label);
  }
  layer.replaceChildren(...children);
}
