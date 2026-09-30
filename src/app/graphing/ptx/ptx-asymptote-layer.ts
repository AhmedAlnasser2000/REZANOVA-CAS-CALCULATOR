import {
  normalizeGraphItemPresentation,
  ptxAsymptoteLabel,
  ptxNumber,
  resolveGraphPresentationColor,
  type GraphRendererPresentationFrame,
  type GraphViewportV1,
} from '../../../lib/graphing';
import type { PtxAsymptoteLine } from './usePtxPointsOfInterest';

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
        : { kind: 'oblique', slope: line.slope, intercept: line.value, sides: [-1, 1], level: line.level }, (value) => ptxNumber(value).replace('-', '−'));
    // Vertical labels sit near the top, others near the right edge above their line.
    const labelX = line.kind === 'vertical' ? x1 + 6 : size.width - 8;
    const labelY = line.kind === 'vertical' ? 58 : Math.max(14, Math.min(size.height - 8, y2 - 6));
    label.setAttribute('x', String(labelX)); label.setAttribute('y', String(labelY));
    label.setAttribute('text-anchor', line.kind === 'vertical' ? 'start' : 'end');
    label.setAttribute('fill', colour); label.dataset.testid = 'graph-ptx-asymptote-label';
    children.push(label);
  }
  layer.replaceChildren(...children);
}
