import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import type {
  GraphAppearanceThemeV1,
  GraphHitResult,
  GraphItemPresentation,
  GraphRendererCameraFrameV1,
  GraphRendererCapabilities,
  GraphRendererFieldFrameV1,
  GraphRendererFieldStatusV1,
  GraphRendererLifecycleCallbacksV1,
  GraphRendererPresentationFrame,
  GraphRendererSceneFrame,
  GraphRendererViewFrameV1,
  GraphVector3V1,
  InteractiveGraph3dRenderer,
  InteractiveGraphFieldRenderer,
} from '../../contracts';
import { validateGraphRendererFieldFrame } from '../../contracts';
import {
  defaultGraphItemPresentation,
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
} from '../../presentation';
import { createGraphGpuSurface, graphGpuSurfaceKey, type GraphGpuSurface, type GraphGpuSurfaceRange } from './gpu-surface';

type Size = { width: number; height: number };

const SURFACE_DETAIL = [1, 2 / 3, 1 / 2, 1 / 3, 1 / 4];
const SLOW_FRAME_MS = (1000 / 60) * 1.25;
const FAST_FRAME_MS = (1000 / 60) * 1.1;

function surfaceResolution(maximum: number, level: number) {
  return Math.max(32, Math.round(maximum * SURFACE_DETAIL[level]!));
}
type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

function asVector3(value: GraphVector3V1) {
  return new THREE.Vector3(value.x, value.y, value.z);
}

function themeBackground(theme: GraphAppearanceThemeV1) {
  if (theme === 'paper') return 0xf4f0e6;
  if (theme === 'aurora') return 0x071a24;
  return 0x071517;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = (mesh as THREE.Mesh & { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
  root.removeFromParent();
}

export class GraphThreeRenderer implements InteractiveGraph3dRenderer, InteractiveGraphFieldRenderer {
  readonly capabilities: GraphRendererCapabilities = {
    rendererId: 'three-webgl', interactive: true, hitTesting: true, regionFill: true,
    polarGrid: false, contextRecovery: true, maximumVertices: 350_000,
  };

  private camera: Camera | null = null;
  private cameraFrame: GraphRendererCameraFrameV1 | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private contextLostListener: ((event: Event) => void) | null = null;
  private contextRestoredListener: (() => void) | null = null;
  private geometryRoot = new THREE.Group();
  private gpuSurfaceRoot = new THREE.Group();
  private gpuSurfaces = new Map<string, GraphGpuSurface>();
  private gpuSurfaceMarkers = new Map<string, string>();
  private gpuSurfaceSequence = 0;
  private fieldFrame: GraphRendererFieldFrameV1 | null = null;
  private fieldFailures = new Map<string, string>();
  private surfaceRanges = new Map<string, GraphGpuSurfaceRange>();
  // Adaptive surface detail: a fraction of the frame's grid resolution,
  // lowered when frames arrive late (software or weak GPUs).
  private surfaceDetailLevel = 0;
  private surfaceFrameProbe = 0;
  private slowSurfaceFrames = 0;
  private fastSurfaceFrames = 0;
  private gridRoot = new THREE.Group();
  private gridSignature = '';
  private itemObjects = new Map<string, THREE.Object3D[]>();
  private pivot = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xffc857, depthTest: false }),
  );
  private pivotTimer: ReturnType<typeof setTimeout> | null = null;
  private presentation = new Map<string, GraphItemPresentation>();
  private raycaster = new THREE.Raycaster();
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private sceneFrame: GraphRendererSceneFrame | null = null;
  private size: Size = { width: 1, height: 1 };
  private theme: GraphAppearanceThemeV1 = 'technical';
  private colorVisionMode: 'standard' | 'color-vision-friendly' = 'standard';
  private viewFrame: GraphRendererViewFrameV1 | null = null;
  private readonly callbacks: GraphRendererLifecycleCallbacksV1;

  constructor(callbacks: GraphRendererLifecycleCallbacksV1) {
    this.callbacks = callbacks;
    this.geometryRoot.name = 'graph-geometry';
    this.gridRoot.name = 'graph-grid';
    this.gpuSurfaceRoot.name = 'graph-gpu-surfaces';
    this.pivot.name = 'graph-camera-pivot';
    this.pivot.visible = false;
    this.scene.add(this.gridRoot, this.geometryRoot, this.gpuSurfaceRoot, this.pivot);
    const ambient = new THREE.HemisphereLight(0xddeeff, 0x182628, 1.2);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(5, -4, 8);
    this.scene.add(ambient, key);
  }

  mount(target: HTMLElement) {
    this.disposeRenderer();
    const canvas = target.ownerDocument.createElement('canvas');
    canvas.className = 'graph-three-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('webgl2', { antialias: true, powerPreference: 'high-performance' });
    if (!context) throw new Error('WebGL2 is unavailable.');
    const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setAnimationLoop(null);
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(themeBackground(this.theme), 1);
    // A GPU surface whose program fails on this device returns to its CPU mesh.
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      const marker = /\/\/ graph-surface:(\S+)/u.exec(gl.getShaderSource(vertexShader) ?? '')?.[1];
      const log = [gl.getShaderInfoLog(vertexShader), gl.getShaderInfoLog(fragmentShader), gl.getProgramInfoLog(program)]
        .map((entry) => entry?.trim()).find(Boolean)?.slice(0, 300) ?? 'shader-compile-failed';
      const itemId = marker ? this.gpuSurfaceMarkers.get(marker) : undefined;
      if (itemId) this.fieldFailures.set(itemId, log);
      else console.error('THREE.WebGLProgram: shader error', log);
    };
    const onLost = (event: Event) => { event.preventDefault(); this.callbacks.onContextLost(); };
    const onRestored = () => { this.handleContextRestored(); this.callbacks.onContextRestored(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    this.contextLostListener = onLost;
    this.contextRestoredListener = onRestored;
    canvas.dataset.graphContextListeners = 'active';
    target.replaceChildren(canvas);
    this.canvas = canvas;
    this.renderer = renderer;
    this.resize(this.size.width, this.size.height, window.devicePixelRatio || 1);
    this.render();
  }

  resize(cssWidth: number, cssHeight: number, devicePixelRatio: number) {
    this.size = { width: Math.max(1, cssWidth), height: Math.max(1, cssHeight) };
    this.renderer?.setPixelRatio(Math.min(2, Math.max(1, devicePixelRatio)));
    this.renderer?.setSize(this.size.width, this.size.height, false);
    this.scene.traverse((object) => {
      const material = (object as Line2).material;
      if (material instanceof LineMaterial) material.resolution.set(this.size.width, this.size.height);
    });
    if (this.cameraFrame) this.applyCamera(this.cameraFrame);
    this.render();
  }

  setView(frame: GraphRendererViewFrameV1) {
    this.viewFrame = frame;
    this.rebuildGrid();
    this.render();
  }

  setScene(frame: GraphRendererSceneFrame | null) {
    this.sceneFrame = frame;
    // Old objects are disposed only after the new scene has rendered: Three
    // deletes a shader program when its last material goes, so disposing
    // first would relink every program on every scene update.
    const retired = this.geometryRoot.children.slice();
    retired.forEach((object) => object.removeFromParent());
    this.itemObjects.clear();
    if (!frame) { this.render(); retired.forEach(disposeObject); return; }
    const planarScene = frame.version === 1 ? frame.scene : frame.scene.planarScene;
    const surfaceMeshes = frame.version === 1 ? [] : frame.scene.surfaceMeshes;
    for (const surface of surfaceMeshes) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(surface.positions), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(surface.normals), 3));
      const colors = new Float32Array(surface.positions.length);
      let minimum = Infinity; let maximum = -Infinity;
      for (let index = 2; index < surface.positions.length; index += 3) {
        minimum = Math.min(minimum, surface.positions[index]!); maximum = Math.max(maximum, surface.positions[index]!);
      }
      const span = Math.max(Number.EPSILON, maximum - minimum);
      const color = new THREE.Color();
      for (let vertex = 0; vertex < surface.positions.length / 3; vertex += 1) {
        const ratio = (surface.positions[vertex * 3 + 2]! - minimum) / span;
        color.setHSL(0.62 - ratio * 0.52, 0.76, 0.5);
        colors.set([color.r, color.g, color.b], vertex * 3);
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(surface.triangleIndices), 1));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide,
        wireframe: this.cameraFrame?.wireframe ?? false,
      }));
      this.registerItem(surface.itemId, mesh);
      const starts = [...surface.contourOffsets]; starts.push(surface.contourCoordinates.length / 3);
      for (let segment = 0; segment < starts.length - 1; segment += 1) {
        const coordinates = Array.from(surface.contourCoordinates.slice(starts[segment]! * 3, starts[segment + 1]! * 3));
        if (coordinates.length < 6) continue;
        const contourGeometry = new LineGeometry(); contourGeometry.setPositions(coordinates);
        const contourMaterial = new LineMaterial({ color: 0xffffff, linewidth: 1, transparent: true, opacity: 0.62 });
        contourMaterial.resolution.set(this.size.width, this.size.height);
        const contour = new Line2(contourGeometry, contourMaterial); contour.computeLineDistances();
        this.registerItem(surface.itemId, contour);
      }
    }
    for (const region of planarScene.regions) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(region.vertices.length / 2 * 3);
      for (let index = 0; index < region.vertices.length / 2; index += 1) {
        positions[index * 3] = region.vertices[index * 2]!;
        positions[index * 3 + 1] = region.vertices[index * 2 + 1]!;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(region.triangleIndices), 1));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
      }));
      this.registerItem(region.itemId, mesh);
    }
    for (const path of planarScene.paths) {
      const starts = [...path.segmentOffsets];
      starts.push(path.coordinates.length / 2);
      for (let segment = 0; segment < starts.length - 1; segment += 1) {
        const positions: number[] = [];
        for (let vertex = starts[segment]!; vertex < starts[segment + 1]!; vertex += 1) {
          positions.push(path.coordinates[vertex * 2]!, path.coordinates[vertex * 2 + 1]!, 0);
        }
        if (positions.length < 6) continue;
        const geometry = new LineGeometry(); geometry.setPositions(positions);
        const material = new LineMaterial({ color: 0xffffff, linewidth: 2.25, worldUnits: false });
        material.resolution.set(this.size.width, this.size.height);
        if (path.strokeRole === 'strict-boundary' || path.strokeRole === 'complex-imaginary') material.dashed = true;
        const line = new Line2(geometry, material);
        line.computeLineDistances();
        this.registerItem(path.itemId, line);
      }
    }
    for (const batch of planarScene.pointBatches) {
      const positions = new Float32Array(batch.coordinates.length / 2 * 3);
      for (let index = 0; index < batch.coordinates.length / 2; index += 1) {
        positions[index * 3] = batch.coordinates[index * 2]!;
        positions[index * 3 + 1] = batch.coordinates[index * 2 + 1]!;
      }
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 7, sizeAttenuation: false }));
      this.registerItem(batch.itemId, points);
    }
    this.surfaceRanges.clear();
    for (const surface of surfaceMeshes) {
      let minimum = Infinity; let maximum = -Infinity;
      for (let index = 2; index < surface.positions.length; index += 3) {
        minimum = Math.min(minimum, surface.positions[index]!); maximum = Math.max(maximum, surface.positions[index]!);
      }
      if (Number.isFinite(minimum) && Number.isFinite(maximum)) this.surfaceRanges.set(surface.itemId, { minimum, maximum });
    }
    this.syncGpuSurfaces();
    this.applyPresentation();
    this.applyVerticalExaggeration();
    this.renderFields();
    retired.forEach(disposeObject);
  }

  setFieldFrame(frame: GraphRendererFieldFrameV1 | null) {
    const validation = frame ? validateGraphRendererFieldFrame(frame) : null;
    if (frame && validation && !validation.ok) {
      frame.items.forEach((item) => this.fieldFailures.set(item.itemId, `invalid field frame (${validation.reason})`));
      this.fieldFrame = null;
    } else this.fieldFrame = frame;
    this.syncGpuSurfaces();
    this.applyPresentation();
    this.applyVerticalExaggeration();
    this.renderFields();
  }

  getFieldStatus(): GraphRendererFieldStatusV1 {
    return {
      drawnItemIds: [...this.gpuSurfaces.values()].filter((surface) => surface.mesh.visible).map((surface) => surface.itemId),
      failures: Object.fromEntries(this.fieldFailures),
    };
  }

  setPresentation(frame: GraphRendererPresentationFrame) {
    this.presentation = new Map(frame.items.map((entry) => [entry.itemId, entry.presentation]));
    this.theme = frame.version === 2 ? frame.theme : 'technical';
    this.colorVisionMode = frame.version === 2 ? frame.colorVisionMode : 'standard';
    this.renderer?.setClearColor(themeBackground(this.theme), 1);
    this.applyPresentation();
    this.rebuildGrid();
    this.render();
  }

  setCamera(frame: GraphRendererCameraFrameV1) {
    this.cameraFrame = frame;
    this.applyCamera(frame);
    this.applyPresentation();
    this.applyVerticalExaggeration();
    this.render();
  }

  getItemCenter(itemId: string): GraphVector3V1 | null {
    const objects = this.itemObjects.get(itemId);
    if (!objects?.length) return null;
    const bounds = new THREE.Box3();
    objects.forEach((object) => bounds.expandByObject(object));
    if (bounds.isEmpty()) return null;
    const center = bounds.getCenter(new THREE.Vector3());
    return { x: center.x, y: center.y, z: center.z };
  }

  screenToPlane(clientX: number, clientY: number, z = 0): GraphVector3V1 | null {
    if (!this.canvas || !this.camera) return null;
    const bounds = this.canvas.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return null;
    const pointer = new THREE.Vector2(
      (clientX - bounds.left) / bounds.width * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -z), target)
      ? { x: target.x, y: target.y, z: target.z }
      : null;
  }

  showPivot(pivot: GraphVector3V1) {
    this.pivot.position.copy(asVector3(pivot)); this.pivot.visible = true; this.render();
    if (this.pivotTimer) clearTimeout(this.pivotTimer);
    this.pivotTimer = setTimeout(() => { this.pivot.visible = false; this.render(); }, 700);
  }

  hitTest(clientX: number, clientY: number): GraphHitResult | null {
    if (!this.canvas || !this.camera || !this.sceneFrame) return null;
    const bounds = this.canvas.getBoundingClientRect();
    if (!(bounds.width > 0 && bounds.height > 0)) return null;
    this.raycaster.params.Line = { threshold: 0.12 };
    this.raycaster.params.Points = { threshold: 0.16 };
    this.raycaster.setFromCamera(new THREE.Vector2(
      (clientX - bounds.left) / bounds.width * 2 - 1,
      -((clientY - bounds.top) / bounds.height) * 2 + 1,
    ), this.camera);
    const hit = this.raycaster.intersectObjects([...this.itemObjects.values()].flat(), true)[0];
    const itemId = hit?.object.userData.graphItemId as string | undefined;
    if (!hit || !itemId) return null;
    return {
      itemId, sceneRevision: this.sceneFrame.version !== 1
        ? this.sceneFrame.scene.planarScene.sceneRevision : this.sceneFrame.scene.sceneRevision,
      world: { x: hit.point.x, y: hit.point.y, z: hit.point.z }, distancePixels: 0,
    };
  }

  handleContextRestored() {
    this.renderer?.resetState();
    this.resize(this.size.width, this.size.height, window.devicePixelRatio || 1);
    this.render();
  }

  clear() { this.setScene(null); }

  dispose() {
    if (this.pivotTimer) clearTimeout(this.pivotTimer);
    if (this.surfaceFrameProbe) cancelAnimationFrame(this.surfaceFrameProbe);
    this.surfaceFrameProbe = 0;
    this.gpuSurfaces.forEach((surface) => surface.dispose());
    this.gpuSurfaces.clear();
    this.geometryRoot.children.slice().forEach(disposeObject);
    this.gridRoot.children.slice().forEach(disposeObject);
    this.pivot.geometry.dispose();
    (this.pivot.material as THREE.Material).dispose();
    this.disposeRenderer();
    this.camera = null;
    this.sceneFrame = null;
    this.itemObjects.clear();
  }

  /**
   * Reconciles GPU surfaces with the field frame. A surface draws once its
   * CPU mesh has supplied the height range; its CPU mesh and contour lines
   * are then hidden but stay in place as the pick, trace, and bounds proxy.
   */
  private syncGpuSurfaces() {
    const items = new Map((this.fieldFrame?.items ?? [])
      .filter((item) => item.route === 'real-surface' && item.program.kind === 'real' && item.surface)
      .map((item) => [item.itemId, item]));
    for (const [itemId, surface] of this.gpuSurfaces) {
      const item = items.get(itemId);
      if (item?.program.kind === 'real' && item.surface && !this.fieldFailures.has(itemId)
        && surface.key === graphGpuSurfaceKey(item.program)) continue;
      surface.dispose();
      this.gpuSurfaces.delete(itemId);
    }
    for (const [itemId, item] of items) {
      if (item.program.kind !== 'real' || !item.surface || this.fieldFailures.has(itemId)) continue;
      let surface = this.gpuSurfaces.get(itemId);
      if (!surface) {
        this.gpuSurfaceSequence += 1;
        const marker = `s${this.gpuSurfaceSequence}`;
        this.gpuSurfaceMarkers.set(marker, itemId);
        surface = createGraphGpuSurface({ itemId, marker, program: item.program,
          resolution: surfaceResolution(item.surface.resolution, this.surfaceDetailLevel) });
        this.gpuSurfaceRoot.add(surface.mesh);
        this.gpuSurfaces.set(itemId, surface);
      }
      surface.setResolution(surfaceResolution(item.surface.resolution, this.surfaceDetailLevel));
      const parameters = this.fieldFrame?.parameters ?? {};
      const range = this.surfaceRanges.get(itemId) ?? null;
      surface.update({ domain: item.surface.domain, range,
        parameters: item.program.parameterNames.map((name) => parameters[name] ?? 0) });
      surface.mesh.visible = range !== null;
    }
    if (this.canvas) this.canvas.dataset.gpuSurfaceResolution = [...this.gpuSurfaces.values()].map((surface) => surface.resolution).join(',');
    for (const [itemId, objects] of this.itemObjects) {
      const gpuDrawn = this.gpuSurfaces.get(itemId)?.mesh.visible === true;
      for (const object of objects) object.visible = !gpuDrawn;
    }
  }

  /** Renders, then returns any surface whose program just failed to its CPU mesh. */
  private renderFields() {
    const failuresBefore = this.fieldFailures.size;
    this.render();
    if (this.fieldFailures.size === failuresBefore) return;
    this.syncGpuSurfaces();
    this.render();
  }

  private registerItem(itemId: string, object: THREE.Object3D) {
    object.userData.graphItemId = itemId;
    object.traverse((child) => { child.userData.graphItemId = itemId; });
    this.geometryRoot.add(object);
    this.itemObjects.set(itemId, [...(this.itemObjects.get(itemId) ?? []), object]);
  }

  private applyCamera(frame: GraphRendererCameraFrameV1) {
    const aspect = this.size.width / this.size.height;
    const state = frame.camera;
    const camera = state.projection === 'perspective'
      ? new THREE.PerspectiveCamera(state.perspectiveFovDegrees, aspect, 0.01, 100_000)
      : new THREE.OrthographicCamera(
          -state.orthographicScale * aspect / 2, state.orthographicScale * aspect / 2,
          state.orthographicScale / 2, -state.orthographicScale / 2, -100_000, 100_000,
        );
    camera.position.copy(asVector3(state.position));
    camera.up.copy(asVector3(state.up));
    camera.lookAt(asVector3(state.target));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    this.camera = camera;
  }

  private applyVerticalExaggeration() {
    this.geometryRoot.scale.z = this.cameraFrame?.verticalExaggeration ?? 1;
    this.gpuSurfaceRoot.scale.z = this.geometryRoot.scale.z;
  }

  private applyPresentation() {
    for (const [itemId, surface] of this.gpuSurfaces) {
      const style = normalizeGraphItemPresentation(this.presentation.get(itemId) ?? defaultGraphItemPresentation(0));
      const selected = this.cameraFrame?.selectedItemId === itemId;
      const color = new THREE.Color(resolveGraphPresentationColor(style, this.colorVisionMode));
      surface.mesh.material.wireframe = this.cameraFrame?.wireframe ?? false;
      surface.mesh.material.emissive.set(selected ? color : 0x000000);
      surface.mesh.material.emissiveIntensity = selected ? 0.16 : 0;
      // Same stroke as the CPU contour lines (LineMaterial widths are CSS pixels).
      surface.setContourStyle({ color, opacity: style.strokeOpacity,
        widthPixels: ((style.strokeWidth === 'thin' ? 1.5 : style.strokeWidth === 'strong' ? 3 : 2.25) + (selected ? 1.25 : 0))
          * (this.renderer?.getPixelRatio() ?? 1) });
    }
    for (const [itemId, objects] of this.itemObjects) {
      const style = normalizeGraphItemPresentation(
        this.presentation.get(itemId) ?? defaultGraphItemPresentation(0),
      );
      const color = new THREE.Color(resolveGraphPresentationColor(style, this.colorVisionMode));
      const selected = this.cameraFrame?.selectedItemId === itemId;
      for (const object of objects) {
        const material = (object as THREE.Mesh).material;
        if (material instanceof LineMaterial) {
          material.color.copy(color);
          material.linewidth = (style.strokeWidth === 'thin' ? 1.5 : style.strokeWidth === 'strong' ? 3 : 2.25)
            + (selected ? 1.25 : 0);
          material.opacity = style.strokeOpacity;
          material.transparent = style.strokeOpacity < 1;
          material.dashed = style.stroke !== 'solid';
          material.dashSize = style.stroke === 'dotted' ? 0.05 : 0.22;
          material.gapSize = style.stroke === 'dotted' ? 0.12 : 0.18;
          material.needsUpdate = true;
        } else if (material instanceof THREE.PointsMaterial) {
          material.color.copy(color); material.opacity = style.strokeOpacity;
          material.transparent = style.strokeOpacity < 1; material.visible = style.markers === 'semantic';
        } else if (material instanceof THREE.MeshBasicMaterial) {
          material.color.copy(color); material.opacity = style.regionOpacity;
          material.wireframe = this.cameraFrame?.wireframe ?? false;
        } else if (material instanceof THREE.MeshStandardMaterial) {
          material.wireframe = this.cameraFrame?.wireframe ?? false;
          material.emissive.set(selected ? color : 0x000000);
          material.emissiveIntensity = selected ? 0.16 : 0;
          material.needsUpdate = true;
        }
      }
    }
  }

  private rebuildGrid() {
    const viewport = this.viewFrame?.viewport;
    const visible = Boolean(viewport && this.viewFrame?.grid.kind !== 'none');
    const span = viewport ? Math.max(viewport.xMax - viewport.xMin, viewport.yMax - viewport.yMin) : 0;
    const size = Math.max(2, Math.ceil(span / 2) * 2);
    const divisions = Math.min(80, Math.max(4, Math.round(size * 2)));
    const paper = this.theme === 'paper';
    // Presentation and view frames arrive on every parameter change; keep the
    // grid (and its shader program) unless it actually changes.
    const signature = visible ? `${size}:${divisions}:${paper}` : 'none';
    if (signature === this.gridSignature && this.gridRoot.children.length === (visible ? 2 : 0)) return;
    this.gridSignature = signature;
    this.gridRoot.children.slice().forEach(disposeObject);
    if (!visible) return;
    const grid = new THREE.GridHelper(size, divisions, paper ? 0x66716c : 0x678078, paper ? 0xb7beb7 : 0x173033);
    grid.rotateX(Math.PI / 2);
    const materials = Array.isArray(grid.material) ? grid.material : [grid.material];
    materials.forEach((material) => { material.transparent = true; material.opacity = 0.45; });
    const axes = new THREE.AxesHelper(size / 2);
    (axes.material as THREE.LineBasicMaterial).transparent = true;
    (axes.material as THREE.LineBasicMaterial).opacity = 0.8;
    this.gridRoot.add(grid, axes);
  }

  private render() {
    if (!this.renderer || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
    this.probeSurfaceFrame();
  }

  /**
   * The browser holds animation frames back while the GPU is still busy, so
   * the interval between the first and second frames after a render measures
   * GPU surface cost without timer queries. (Render-to-next-frame alone would
   * read as on time whenever a render lands late in a frame.) Late frames
   * lower the grid; a long run of on-time frames raises it again.
   */
  private probeSurfaceFrame() {
    if (this.surfaceFrameProbe || typeof requestAnimationFrame !== 'function') return;
    if (![...this.gpuSurfaces.values()].some((surface) => surface.mesh.visible)) return;
    this.surfaceFrameProbe = requestAnimationFrame(() => {
      const presented = performance.now();
      this.surfaceFrameProbe = requestAnimationFrame(() => this.recordSurfaceFrame(performance.now() - presented));
    });
  }

  private recordSurfaceFrame(interval: number) {
    this.surfaceFrameProbe = 0;
    if (interval > SLOW_FRAME_MS) { this.slowSurfaceFrames += 1; this.fastSurfaceFrames = 0; }
    else if (interval < FAST_FRAME_MS) { this.fastSurfaceFrames += 1; this.slowSurfaceFrames = 0; }
    let level = this.surfaceDetailLevel;
    if (this.slowSurfaceFrames >= 2 && level < SURFACE_DETAIL.length - 1) level += 1;
    else if (this.fastSurfaceFrames >= 90 && level > 0) level -= 1;
    if (level === this.surfaceDetailLevel) return;
    this.surfaceDetailLevel = level;
    this.slowSurfaceFrames = 0; this.fastSurfaceFrames = 0;
    this.syncGpuSurfaces();
    this.render();
  }

  private disposeRenderer() {
    if (this.canvas) {
      if (this.contextLostListener) this.canvas.removeEventListener('webglcontextlost', this.contextLostListener);
      if (this.contextRestoredListener) this.canvas.removeEventListener('webglcontextrestored', this.contextRestoredListener);
      this.canvas.dataset.graphContextListeners = 'disposed';
    }
    this.contextLostListener = null;
    this.contextRestoredListener = null;
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.canvas?.remove();
    this.renderer = null;
    this.canvas = null;
  }
}
