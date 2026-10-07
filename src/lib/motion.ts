import type { Frame, Layer, Point, Stroke } from '@/types';
import { strokeBBox, unionBBox, transformStroke, translation, cloneStroke } from '@/lib/geometry';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ---- Papéis dos quadros ----

/** Quadros sem papel definido contam como chave (projetos antigos / modo estúdio). */
export function isKeyish(frame: Frame | undefined): boolean {
  return !!frame && frame.kind !== 'inbetween';
}

/** Próximo quadro chave/breakdown após `index`, ou -1. */
export function nextKeyish(frames: Frame[], index: number): number {
  for (let i = index + 1; i < frames.length; i++) if (isKeyish(frames[i])) return i;
  return -1;
}

/** Quadro chave/breakdown anterior a `index`, ou -1. */
export function prevKeyish(frames: Frame[], index: number): number {
  for (let i = index - 1; i >= 0; i--) if (isKeyish(frames[i])) return i;
  return -1;
}

// ---- Centros (para trajetória e espaçamento) ----

export function layerCenter(layer: Layer | undefined): Point | null {
  if (!layer || layer.strokes.length === 0) return null;
  const box = unionBBox(layer.strokes.filter((s) => s.tool !== 'eraser').map(strokeBBox));
  if (!box) return null;
  return { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
}

/** Centro da camada `layerIndex` em cada quadro (null quando vazia). */
export function motionCenters(frames: Frame[], layerIndex: number): (Point | null)[] {
  return frames.map((f) => layerCenter(f.layers[layerIndex]));
}

// ---- Interpolação ----

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  ...(a.pressure !== undefined || b.pressure !== undefined
    ? { pressure: lerp(a.pressure ?? 0.5, b.pressure ?? 0.5, t) }
    : {}),
});

function lerpColor(a: string, b: string, t: number): string {
  const re = /^#([0-9a-f]{6})$/i;
  if (!re.test(a) || !re.test(b)) return t < 0.5 ? a : b;
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const ch = (shift: number) =>
    Math.round(lerp((ca >> shift) & 255, (cb >> shift) & 255, t));
  return '#' + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0');
}

/** Reamostra uma lista de pontos para `n` pontos, por índice. */
function resample(points: Point[], n: number): Point[] {
  if (points.length === n) return points;
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }));
  return Array.from({ length: n }, (_, i) => {
    const f = (i / (n - 1)) * (points.length - 1);
    const lo = Math.floor(f);
    const hi = Math.min(points.length - 1, lo + 1);
    return lerpPoint(points[lo], points[hi], f - lo);
  });
}

export function interpolateStroke(a: Stroke, b: Stroke, t: number): Stroke {
  // Traços de tipos diferentes não se transformam um no outro: troca no meio
  if (a.tool !== b.tool) return cloneStroke(t < 0.5 ? a : b);
  const n = Math.max(a.points.length, b.points.length);
  const pa = resample(a.points, n);
  const pb = resample(b.points, n);
  const base = cloneStroke(t < 0.5 ? a : b);
  return {
    ...base,
    points: pa.map((p, i) => lerpPoint(p, pb[i], t)),
    size: lerp(a.size, b.size, t),
    opacity: lerp(a.opacity, b.opacity, t),
    color: lerpColor(a.color, b.color, t),
    ...(a.fillColor && b.fillColor ? { fillColor: lerpColor(a.fillColor, b.fillColor, t) } : {}),
    ...(a.startPoint && b.startPoint ? { startPoint: lerpPoint(a.startPoint, b.startPoint, t) } : {}),
    ...(a.endPoint && b.endPoint ? { endPoint: lerpPoint(a.endPoint, b.endPoint, t) } : {}),
  };
}

function interpolateLayer(a: Layer, b: Layer | undefined, t: number): Layer {
  const strokesB = b?.strokes ?? [];
  const n = Math.max(a.strokes.length, strokesB.length);
  const strokes: Stroke[] = [];
  for (let i = 0; i < n; i++) {
    const sa = a.strokes[i];
    const sb = strokesB[i];
    if (sa && sb) strokes.push(interpolateStroke(sa, sb, t));
    // Traço que só existe numa das poses aparece/desaparece no meio do caminho
    else if (sa && t < 0.5) strokes.push(cloneStroke(sa));
    else if (sb && t >= 0.5) strokes.push(cloneStroke(sb));
  }
  return {
    ...a,
    id: generateId(),
    opacity: lerp(a.opacity, b?.opacity ?? a.opacity, t),
    strokes,
    undoStack: [],
    redoStack: [],
  };
}

/** Ponto de uma curva quadrática que passa por p0 (u=0), p1 (u=0.5) e p2 (u=1). */
function arcPoint(p0: Point, p1: Point, p2: Point, u: number): Point {
  const c = { x: 2 * p1.x - (p0.x + p2.x) / 2, y: 2 * p1.y - (p0.y + p2.y) / 2 };
  const mu = 1 - u;
  return {
    x: mu * mu * p0.x + 2 * u * mu * c.x + u * u * p2.x,
    y: mu * mu * p0.y + 2 * u * mu * c.y + u * u * p2.y,
  };
}

export interface InbetweenOptions {
  count: number;
  ease: (t: number) => number;
  /** Curva a trajetória usando a pose chave vizinha (arco natural). */
  followArc: boolean;
}

/**
 * Gera os quadros intermediários entre `frames[from]` e `frames[to]`.
 * Com `followArc`, cada camada que se desloca segue uma curva que passa
 * pela pose chave vizinha, em vez de uma reta entre as duas poses.
 */
export function buildInbetweens(
  frames: Frame[],
  from: number,
  to: number,
  { count, ease, followArc }: InbetweenOptions
): Frame[] {
  const a = frames[from];
  const b = frames[to];
  if (!a || !b || count < 1) return [];

  // Terceira pose para o arco: a próxima chave depois de `to` (somos a 1ª metade)
  // ou a chave antes de `from` (somos a 2ª metade).
  const after = nextKeyish(frames, to);
  const before = prevKeyish(frames, from);
  const arcRef = !followArc ? null : after >= 0 ? { idx: after, firstHalf: true } : before >= 0 ? { idx: before, firstHalf: false } : null;

  const result: Frame[] = [];
  for (let k = 1; k <= count; k++) {
    const s = ease(k / (count + 1));
    const layers = a.layers.map((la, li) => {
      const lb = b.layers[li];
      const layer = interpolateLayer(la, lb, s);
      if (!arcRef || !lb) return layer;
      const ca = layerCenter(la);
      const cb = layerCenter(lb);
      const cr = layerCenter(frames[arcRef.idx].layers[li]);
      if (!ca || !cb || !cr) return layer;
      // Camadas paradas (cenário) não entram no arco
      if (Math.hypot(cb.x - ca.x, cb.y - ca.y) < 1) return layer;
      const straight = lerpPoint(ca, cb, s);
      const curved = arcRef.firstHalf
        ? arcPoint(ca, cb, cr, s / 2)
        : arcPoint(cr, ca, cb, 0.5 + s / 2);
      const m = translation(curved.x - straight.x, curved.y - straight.y);
      return { ...layer, strokes: layer.strokes.map((st) => transformStroke(st, m)) };
    });
    result.push({
      id: generateId(),
      layers,
      duration: 1,
      easing: 'linear',
      customCurve: a.customCurve.map((p) => ({ ...p })),
      kind: 'inbetween',
    });
  }
  return result;
}

// ---- Análise de espaçamento / timing ----

export interface MotionAnalysis {
  centers: (Point | null)[];
  /** Distância percorrida por quadro (dividida pela exposição do quadro anterior). */
  speeds: number[];
  /** Posição acumulada normalizada 0..1 ao longo da trajetória, por quadro. */
  progress: number[];
  totalFrames: number;
  seconds: number;
}

export function analyzeMotion(frames: Frame[], layerIndex: number, fps: number): MotionAnalysis {
  const centers = motionCenters(frames, layerIndex);
  const speeds: number[] = [];
  const cumulative: number[] = [0];
  for (let i = 1; i < centers.length; i++) {
    const p = centers[i - 1];
    const c = centers[i];
    const d = p && c ? Math.hypot(c.x - p.x, c.y - p.y) : 0;
    speeds.push(d / Math.max(1, frames[i - 1].duration));
    cumulative.push(cumulative[i - 1] + d);
  }
  const total = cumulative[cumulative.length - 1] || 1;
  const totalFrames = frames.reduce((sum, f) => sum + f.duration, 0);
  return {
    centers,
    speeds,
    progress: cumulative.map((c) => c / total),
    totalFrames,
    seconds: totalFrames / fps,
  };
}
