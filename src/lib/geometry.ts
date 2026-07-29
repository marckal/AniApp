import type { Point, Stroke } from '@/types';

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Matriz afim 2D: x' = a*x + c*y + e ; y' = b*x + d*y + f
export interface Affine {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const identity = (): Affine => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });

// Aplica m1 DEPOIS de m2: result = m1 ∘ m2
export function multiply(m1: Affine, m2: Affine): Affine {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

export const translation = (tx: number, ty: number): Affine => ({
  a: 1, b: 0, c: 0, d: 1, e: tx, f: ty,
});

export function scaleAbout(cx: number, cy: number, sx: number, sy: number): Affine {
  return multiply(translation(cx, cy), multiply({ a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 }, translation(-cx, -cy)));
}

export function rotationAbout(cx: number, cy: number, angle: number): Affine {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return multiply(
    translation(cx, cy),
    multiply({ a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 }, translation(-cx, -cy))
  );
}

export function applyToPoint(m: Affine, p: Point): Point {
  return {
    x: m.a * p.x + m.c * p.y + m.e,
    y: m.b * p.x + m.d * p.y + m.f,
    pressure: p.pressure,
  };
}

export function shapeCornerPoints(start?: Point, end?: Point): Point[] {
  if (!start || !end) return [];
  return [
    { x: start.x, y: start.y },
    { x: end.x, y: start.y },
    { x: end.x, y: end.y },
    { x: start.x, y: end.y },
  ];
}

export function transformStroke(stroke: Stroke, m: Affine): Stroke {
  let pts = stroke.points;
  if ((!pts || pts.length === 0) && stroke.startPoint && stroke.endPoint) {
    if (stroke.tool === 'rectangle' || stroke.tool === 'circle' || stroke.tool === 'image') {
      pts = shapeCornerPoints(stroke.startPoint, stroke.endPoint);
    } else if (stroke.tool === 'line') {
      pts = [stroke.startPoint, stroke.endPoint];
    }
  }
  return {
    ...stroke,
    points: pts ? pts.map((p) => applyToPoint(m, p)) : [],
    startPoint: stroke.startPoint ? applyToPoint(m, stroke.startPoint) : undefined,
    endPoint: stroke.endPoint ? applyToPoint(m, stroke.endPoint) : undefined,
  };
}

export function cloneStroke(stroke: Stroke): Stroke {
  return {
    ...stroke,
    points: stroke.points.map((p) => ({ ...p })),
    startPoint: stroke.startPoint ? { ...stroke.startPoint } : undefined,
    endPoint: stroke.endPoint ? { ...stroke.endPoint } : undefined,
  };
}

export function strokeBBox(stroke: Stroke): BBox | null {
  const pts: Point[] = [];
  if (stroke.points.length > 0) pts.push(...stroke.points);
  if (stroke.startPoint) pts.push(stroke.startPoint);
  if (stroke.endPoint) pts.push(stroke.endPoint);
  if (pts.length === 0) return null;

  const pad = stroke.size / 2;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

export function unionBBox(boxes: (BBox | null)[]): BBox | null {
  let out: BBox | null = null;
  for (const b of boxes) {
    if (!b) continue;
    if (!out) {
      out = { ...b };
    } else {
      out.minX = Math.min(out.minX, b.minX);
      out.minY = Math.min(out.minY, b.minY);
      out.maxX = Math.max(out.maxX, b.maxX);
      out.maxY = Math.max(out.maxY, b.maxY);
    }
  }
  return out;
}

export function intersectsBBox(a: BBox, b: BBox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function pointInBBox(p: Point, b: BBox, tolerance = 0): boolean {
  return (
    p.x >= b.minX - tolerance &&
    p.x <= b.maxX + tolerance &&
    p.y >= b.minY - tolerance &&
    p.y <= b.maxY + tolerance
  );
}

export const bboxCenter = (b: BBox): Point => ({
  x: (b.minX + b.maxX) / 2,
  y: (b.minY + b.maxY) / 2,
});

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot';

export function getHandles(bbox: BBox, zoom: number): { id: HandleId; x: number; y: number }[] {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  return [
    { id: 'rot', x: cx, y: bbox.minY - 32 / zoom },
    { id: 'nw', x: bbox.minX, y: bbox.minY },
    { id: 'n', x: cx, y: bbox.minY },
    { id: 'ne', x: bbox.maxX, y: bbox.minY },
    { id: 'e', x: bbox.maxX, y: cy },
    { id: 'se', x: bbox.maxX, y: bbox.maxY },
    { id: 's', x: cx, y: bbox.maxY },
    { id: 'sw', x: bbox.minX, y: bbox.maxY },
    { id: 'w', x: bbox.minX, y: cy },
  ];
}

// Ponto fixo (oposto) de cada handle de escala
export function oppositeHandlePoint(id: HandleId, bbox: BBox): Point {
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  switch (id) {
    case 'nw': return { x: bbox.maxX, y: bbox.maxY };
    case 'n': return { x: cx, y: bbox.maxY };
    case 'ne': return { x: bbox.minX, y: bbox.maxY };
    case 'e': return { x: bbox.minX, y: cy };
    case 'se': return { x: bbox.minX, y: bbox.minY };
    case 's': return { x: cx, y: bbox.minY };
    case 'sw': return { x: bbox.maxX, y: bbox.minY };
    case 'w': return { x: bbox.maxX, y: cy };
    default: return { x: cx, y: cy };
  }
}
