import type {
  GraphHitResult,
  GraphAppearanceThemeV1,
  GraphItemPresentation,
  GraphRendererCapabilities,
  GraphRendererPresentationFrame,
  GraphRendererSceneFrame,
  GraphSurfaceMeshRuntimeV1,
  GraphRendererViewFrameV1,
  GraphScenePathRuntimeV2,
  GraphSceneRegionRuntimeV2,
  GraphViewportV1,
  InteractiveGraphRenderer,
} from '../../contracts';
import {
  defaultGraphItemPresentation,
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
} from '../../presentation';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
type Size = { width: number; height: number };
export type GraphRendererScreenPoint = { x: number; y: number };

function svgElement<K extends keyof SVGElementTagNameMap>(name: K) {
  return document.createElementNS(SVG_NAMESPACE, name);
}

function setAttribute(node: Element, name: string, value: string) {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function project(x: number, y: number, viewport: GraphViewportV1, size: Size) {
  return {
    x: (x - viewport.xMin) / (viewport.xMax - viewport.xMin) * size.width,
    y: (viewport.yMax - y) / (viewport.yMax - viewport.yMin) * size.height,
  };
}

function pathData(path: GraphScenePathRuntimeV2, viewport: GraphViewportV1, size: Size) {
  const starts = new Set(path.segmentOffsets);
  const parts: string[] = [];
  for (let vertex = 0; vertex * 2 + 1 < path.coordinates.length; vertex += 1) {
    const point = project(path.coordinates[vertex * 2]!, path.coordinates[vertex * 2 + 1]!, viewport, size);
    parts.push(`${starts.has(vertex) ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  return parts.join('');
}

function regionData(region: GraphSceneRegionRuntimeV2, viewport: GraphViewportV1, size: Size) {
  const parts: string[] = [];
  for (let index = 0; index + 2 < region.triangleIndices.length; index += 3) {
    const points = [0, 1, 2].map((offset) => {
      const vertex = region.triangleIndices[index + offset]!;
      return project(region.vertices[vertex * 2]!, region.vertices[vertex * 2 + 1]!, viewport, size);
    });
    parts.push(`M${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`,
      `L${points[1]!.x.toFixed(2)} ${points[1]!.y.toFixed(2)}`,
      `L${points[2]!.x.toFixed(2)} ${points[2]!.y.toFixed(2)}Z`);
  }
  return parts.join('');
}

function surfaceBands(mesh: GraphSurfaceMeshRuntimeV1, viewport: GraphViewportV1, size: Size) {
  let minimum = Infinity; let maximum = -Infinity;
  for (let index = 2; index < mesh.positions.length; index += 3) {
    minimum = Math.min(minimum, mesh.positions[index]!); maximum = Math.max(maximum, mesh.positions[index]!);
  }
  const span = Math.max(Number.EPSILON, maximum - minimum);
  const bands = Array.from({ length: 12 }, () => [] as string[]);
  for (let index = 0; index + 2 < mesh.triangleIndices.length; index += 3) {
    const vertices = [0, 1, 2].map((offset) => mesh.triangleIndices[index + offset]!);
    const average = vertices.reduce((sum, vertex) => sum + mesh.positions[vertex * 3 + 2]!, 0) / 3;
    const band = Math.max(0, Math.min(11, Math.floor((average - minimum) / span * 12)));
    const points = vertices.map((vertex) => project(
      mesh.positions[vertex * 3]!, mesh.positions[vertex * 3 + 1]!, viewport, size,
    ));
    bands[band]!.push(`M${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}L${points[1]!.x.toFixed(2)} ${points[1]!.y.toFixed(2)}L${points[2]!.x.toFixed(2)} ${points[2]!.y.toFixed(2)}Z`);
  }
  return bands;
}

function surfaceContourData(mesh: GraphSurfaceMeshRuntimeV1, viewport: GraphViewportV1, size: Size) {
  const starts = new Set(mesh.contourOffsets);
  const parts: string[] = [];
  for (let vertex = 0; vertex * 3 + 2 < mesh.contourCoordinates.length; vertex += 1) {
    const point = project(mesh.contourCoordinates[vertex * 3]!, mesh.contourCoordinates[vertex * 3 + 1]!, viewport, size);
    parts.push(`${starts.has(vertex) ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  return parts.join('');
}

function syncKeyed<T extends SVGElement>(
  host: SVGGElement,
  values: readonly { id: string; update: (node: T) => void }[],
  tagName: keyof SVGElementTagNameMap,
) {
  const existing = new Map([...host.children].map((node) => [
    (node as SVGElement).dataset.graphKey ?? '', node as T,
  ]));
  const keep = new Set<string>();
  values.forEach(({ id, update }) => {
    let node = existing.get(id);
    if (!node) {
      node = svgElement(tagName) as T;
      node.dataset.graphKey = id;
      host.append(node);
    }
    update(node);
    keep.add(id);
  });
  existing.forEach((node, id) => { if (!keep.has(id)) node.remove(); });
}

export class GraphSvgReferenceRenderer implements InteractiveGraphRenderer {
  readonly capabilities: GraphRendererCapabilities = {
    rendererId: 'svg', interactive: true, hitTesting: false, regionFill: true,
    polarGrid: true, contextRecovery: false, maximumVertices: 250_000,
  };

  private size: Size = { width: 1, height: 1 };
  private svg: SVGSVGElement | null = null;
  private gridLines: SVGGElement | null = null;
  private gridCircles: SVGGElement | null = null;
  private labels: SVGGElement | null = null;
  private geometry: SVGGElement | null = null;
  private regions: SVGGElement | null = null;
  private paths: SVGGElement | null = null;
  private points: SVGGElement | null = null;
  private view: GraphRendererViewFrameV1 | null = null;
  private scene: GraphRendererSceneFrame | null = null;
  private surfaces: SVGGElement | null = null;
  private presentation = new Map<string, GraphItemPresentation>();
  private theme: GraphAppearanceThemeV1 = 'technical';
  private colorVisionMode: 'standard' | 'color-vision-friendly' = 'standard';
  private sceneProjectionSize: Size = { width: 1, height: 1 };

  mount(target: HTMLElement) {
    this.dispose();
    const svg = svgElement('svg');
    svg.classList.add('graph-svg-canvas', 'graph-svg-geometry-canvas');
    svg.setAttribute('aria-hidden', 'true');
    const grid = svgElement('g'); grid.classList.add('graph-svg-grid'); grid.dataset.testid = 'graph-scene-grid';
    const gridLines = svgElement('g'); const gridCircles = svgElement('g');
    grid.append(gridLines, gridCircles);
    const labels = svgElement('g'); labels.classList.add('graph-svg-ticks'); labels.dataset.testid = 'graph-scene-grid-labels';
    const geometry = svgElement('g'); geometry.classList.add('graph-svg-sampled-geometry');
    const surfaces = svgElement('g'); surfaces.classList.add('graph-svg-surfaces'); surfaces.dataset.testid = 'graph-scene-surfaces';
    const regions = svgElement('g'); regions.classList.add('graph-svg-regions'); regions.dataset.testid = 'graph-scene-regions';
    const paths = svgElement('g'); paths.classList.add('graph-svg-paths'); paths.dataset.testid = 'graph-scene-paths';
    const points = svgElement('g'); points.classList.add('graph-svg-points'); points.dataset.testid = 'graph-scene-points';
    geometry.append(surfaces, regions, paths, points); svg.append(grid, labels, geometry); target.replaceChildren(svg);
    Object.assign(this, { svg, gridLines, gridCircles, labels, geometry, surfaces, regions, paths, points });
    this.resize(this.size.width, this.size.height, 1);
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    void devicePixelRatio;
    this.size = { width: Math.max(1, cssWidth), height: Math.max(1, cssHeight) };
    this.svg?.setAttribute('viewBox', `0 0 ${this.size.width} ${this.size.height}`);
  }

  clientToScreen(clientX: number, clientY: number): GraphRendererScreenPoint | null {
    const bounds = this.svg?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: (clientX - bounds.left) * this.size.width / bounds.width,
      y: (clientY - bounds.top) * this.size.height / bounds.height,
    };
  }

  setView(frame: GraphRendererViewFrameV1) {
    this.view = frame;
    if (!this.gridLines || !this.gridCircles || !this.labels) return;
    const { grid, viewport } = frame;
    const lineRoles = ['minor', 'major', 'axis', 'spoke'] as const;
    syncKeyed<SVGPathElement>(this.gridLines, lineRoles.map((role) => ({
      id: `grid-lines:${role}`,
      update: (node) => {
        const data = grid.lines.filter((line) => line.role === role).map((line) => {
          const start = project(line.x1, line.y1, viewport, this.size);
          const end = project(line.x2, line.y2, viewport, this.size);
          return `M${start.x.toFixed(2)} ${start.y.toFixed(2)}L${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
        }).join('');
        setAttribute(node, 'd', data);
        node.dataset.gridLine = role;
      },
    })), 'path');
    syncKeyed<SVGEllipseElement>(this.gridCircles, grid.circles.map((circle) => ({
      id: circle.circleId,
      update: (node) => {
        const center = project(circle.center.x, circle.center.y, viewport, this.size);
        const edgeX = project(circle.center.x + circle.radius, circle.center.y, viewport, this.size);
        const edgeY = project(circle.center.x, circle.center.y + circle.radius, viewport, this.size);
        setAttribute(node, 'cx', String(center.x)); setAttribute(node, 'cy', String(center.y));
        setAttribute(node, 'rx', String(Math.abs(edgeX.x - center.x)));
        setAttribute(node, 'ry', String(Math.abs(edgeY.y - center.y)));
        setAttribute(node, 'fill', 'none');
        node.dataset.gridLine = circle.role;
      },
    })), 'ellipse');
    syncKeyed<SVGTextElement>(this.labels, grid.labels.filter((label) => label.plainText).map((label) => ({
      id: label.labelId,
      update: (node) => {
        const anchor = project(label.anchor.x, label.anchor.y, viewport, this.size);
        setAttribute(node, 'x', String(anchor.x)); setAttribute(node, 'y', String(anchor.y));
        const text = label.plainText ?? ''; if (node.textContent !== text) node.textContent = text;
        setAttribute(node, 'dy', label.labelId.startsWith('grid:x:') ? '18' : '4');
        if (label.labelId.startsWith('grid:y:')) { setAttribute(node, 'dx', '-8'); setAttribute(node, 'text-anchor', 'end'); }
      },
    })), 'text');
    this.updateGeometryTransform();
  }

  setScene(frame: GraphRendererSceneFrame | null) {
    this.scene = frame;
    if (!this.surfaces || !this.regions || !this.paths || !this.points) return;
    if (!frame) { this.surfaces.replaceChildren(); this.regions.replaceChildren(); this.paths.replaceChildren(); this.points.replaceChildren(); return; }
    this.sceneProjectionSize = { ...this.size };
    const { sourceViewport, policy } = frame;
    const scene = frame.version === 2 ? frame.scene.planarScene : frame.scene;
    const surfaceMeshes = frame.version === 2 ? frame.scene.surfaceMeshes : [];
    const surfacePaths = surfaceMeshes.flatMap((mesh) => {
      const bands = surfaceBands(mesh, sourceViewport, this.size);
      return [
        ...bands.map((parts, band) => ({
          id: `${mesh.meshId}:band:${band}`,
          update: (node: SVGPathElement) => {
            node.dataset.itemId = mesh.itemId; node.dataset.surfaceBand = String(band);
            node.setAttribute('d', parts.join('')); node.setAttribute('stroke', 'none');
            node.setAttribute('fill', `hsl(${220 - band * 16} 78% ${36 + band * 1.8}%)`);
            node.setAttribute('fill-opacity', '0.82');
          },
        })),
        { id: `${mesh.meshId}:contours`, update: (node: SVGPathElement) => {
          node.dataset.itemId = mesh.itemId; node.dataset.surfaceContours = 'true';
          node.setAttribute('d', surfaceContourData(mesh, sourceViewport, this.size));
          node.setAttribute('fill', 'none'); node.setAttribute('stroke', 'rgba(255,255,255,.55)');
          node.setAttribute('stroke-width', '1'); node.setAttribute('vector-effect', 'non-scaling-stroke');
        } },
      ];
    });
    syncKeyed<SVGPathElement>(this.surfaces, surfacePaths, 'path');
    syncKeyed<SVGPathElement>(this.regions, scene.regions.map((region) => ({ id: region.regionId, update: (node) => {
      node.dataset.regionId = region.regionId; node.setAttribute('d', regionData(region, sourceViewport, this.size));
      node.dataset.itemId = region.itemId;
    } })), 'path');
    syncKeyed<SVGPathElement>(this.paths, scene.paths.map((path) => ({ id: path.pathId, update: (node) => {
      node.dataset.pathId = path.pathId; node.setAttribute('d', pathData(path, sourceViewport, this.size));
      node.dataset.itemId = path.itemId;
      node.dataset.strokeRole = path.strokeRole ?? 'default';
      node.setAttribute('fill', 'none');
      node.setAttribute('vector-effect', 'non-scaling-stroke');
    } })), 'path');
    const pointValues = scene.pointBatches.flatMap((batch) => Array.from({ length: batch.coordinates.length / 2 }, (_, index) => ({
      id: `${batch.pointBatchId}:${index}`,
      update: (node: SVGCircleElement) => {
        const point = project(batch.coordinates[index * 2]!, batch.coordinates[index * 2 + 1]!, sourceViewport, this.size);
        node.dataset.pointBatchId = batch.pointBatchId; node.dataset.pointIndex = String(index);
        node.dataset.itemId = batch.itemId;
        node.setAttribute('cx', String(point.x)); node.setAttribute('cy', String(point.y)); node.setAttribute('r', '5');
        node.dataset.marker = batch.marker ?? 'filled';
      },
    })));
    syncKeyed<SVGCircleElement>(this.points, pointValues, 'circle');
    this.svg?.setAttribute('data-scene-quality', policy.quality);
    this.applyPresentation();
    this.updateGeometryTransform();
  }

  setPresentation(frame: GraphRendererPresentationFrame) {
    this.presentation = new Map(frame.items.map((item) => [item.itemId, item.presentation]));
    this.theme = frame.version === 2 ? frame.theme : 'technical';
    this.colorVisionMode = frame.version === 2 ? frame.colorVisionMode : 'standard';
    this.svg?.setAttribute('data-content-revision', String(frame.contentRevision));
    this.svg?.setAttribute('data-graph-theme', this.theme);
    this.applyPresentation();
  }

  private itemPresentation(itemId: string) {
    const fallback = defaultGraphItemPresentation(itemId === 'graph.overlay.unit-circle' ? 2 : 0);
    return normalizeGraphItemPresentation(this.presentation.get(itemId) ?? fallback);
  }

  private applyPresentation() {
    this.regions?.querySelectorAll<SVGPathElement>('[data-item-id]').forEach((node) => {
      const style = this.itemPresentation(node.dataset.itemId ?? '');
      setAttribute(node, 'fill', resolveGraphPresentationColor(style, this.colorVisionMode));
      setAttribute(node, 'fill-opacity', String(style.regionOpacity));
    });
    this.paths?.querySelectorAll<SVGPathElement>('[data-item-id]').forEach((node) => {
      const style = this.itemPresentation(node.dataset.itemId ?? '');
      const color = resolveGraphPresentationColor(style, this.colorVisionMode);
      setAttribute(node, 'stroke', color);
      node.style.color = color;
      setAttribute(node, 'stroke-opacity', String(style.strokeOpacity));
      setAttribute(node, 'stroke-width', style.strokeWidth === 'thin' ? '1.5' : style.strokeWidth === 'strong' ? '3' : '2.25');
      const dashed = style.stroke === 'dashed' || node.dataset.strokeRole === 'strict-boundary';
      const dotted = style.stroke === 'dotted';
      if (dashed) setAttribute(node, 'stroke-dasharray', '8 6');
      else if (dotted) setAttribute(node, 'stroke-dasharray', '2 5');
      else node.removeAttribute('stroke-dasharray');
      node.dataset.halo = this.theme === 'luminous' && style.halo === 'soft' ? 'soft' : 'none';
    });
    this.points?.querySelectorAll<SVGCircleElement>('[data-item-id]').forEach((node) => {
      const style = this.itemPresentation(node.dataset.itemId ?? '');
      const color = resolveGraphPresentationColor(style, this.colorVisionMode);
      setAttribute(node, 'fill', node.dataset.marker === 'open' ? '#071517' : color);
      setAttribute(node, 'stroke', color); setAttribute(node, 'stroke-width', '2');
      node.style.display = style.markers === 'none' ? 'none' : '';
    });
  }

  private updateGeometryTransform() {
    if (!this.geometry || !this.view || !this.scene) return;
    const source = this.scene.sourceViewport; const live = this.view.viewport;
    const sx = (source.xMax - source.xMin) / (live.xMax - live.xMin)
      * this.size.width / this.sceneProjectionSize.width;
    const sy = (source.yMax - source.yMin) / (live.yMax - live.yMin)
      * this.size.height / this.sceneProjectionSize.height;
    const tx = (source.xMin - live.xMin) / (live.xMax - live.xMin) * this.size.width;
    const ty = (live.yMax - source.yMax) / (live.yMax - live.yMin) * this.size.height;
    this.geometry.setAttribute('transform', `matrix(${sx} 0 0 ${sy} ${tx} ${ty})`);
  }

  hitTest(clientX: number, clientY: number): GraphHitResult | null { void clientX; void clientY; return null; }
  handleContextRestored() {}
  clear() { this.setScene(null); }
  dispose() {
    this.svg?.remove();
    this.svg = this.gridLines = this.gridCircles = this.labels = this.geometry = this.surfaces = this.regions = this.paths = this.points = null;
    this.view = null; this.scene = null;
    this.presentation.clear();
  }
}
