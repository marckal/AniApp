import type { Frame, Point, Tool } from '@/types';
import { floodFill } from './floodFill';
import { hexToRgba } from './coordinateSystem';

/**
 * Pool reutilizável de elementos Canvas Offscreen para evitar alocação excessiva e Garbage Collection.
 */
class CanvasPool {
  private pool: HTMLCanvasElement[] = [];

  getCanvas(width: number, height: number): HTMLCanvasElement {
    let canvas = this.pool.pop();
    if (!canvas) {
      canvas = document.createElement('canvas');
    }
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, width, height);
    }
    return canvas;
  }

  releaseCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.pool.length < 10) {
      this.pool.push(canvas);
    }
  }
}

export const canvasPool = new CanvasPool();
const imageCache = new Map<string, HTMLImageElement>();

/**
 * Desenha o caminho suavizado de um traço livre usando curvas de Bézier quadráticas.
 */
export function traceStrokePath(ctx: CanvasRenderingContext2D, points: Point[]): void {
  if (!points || points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    const prev = points[i - 1];
    const midX = (prev.x + p.x) / 2;
    const midY = (prev.y + p.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
}

/**
 * Desenha formas geométricas (retângulo, círculo, linha) no contexto 2D.
 */
export function drawShapeOnContext(
  ctx: CanvasRenderingContext2D,
  tool: Tool,
  start: Point,
  end: Point,
  style: { color: string; size: number; opacity: number; filled?: boolean; fillColor?: string }
): void {
  ctx.strokeStyle = hexToRgba(style.color, style.opacity);
  ctx.lineWidth = style.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'rectangle') {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    ctx.beginPath();
    if (style.filled) {
      ctx.fillStyle = hexToRgba(style.fillColor || '#ffffff', style.opacity);
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeRect(x, y, w, h);
  } else if (tool === 'circle') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (style.filled) {
      ctx.fillStyle = hexToRgba(style.fillColor || '#ffffff', style.opacity);
      ctx.fill();
    }
    ctx.stroke();
  } else if (tool === 'line') {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

/**
 * Renderiza um conjunto de camadas de um frame num contexto 2D.
 */
export function renderFrameLayers(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  opacity = 1,
  overrideColor?: string
): void {
  if (!frame) return;

  for (let li = 0; li < frame.layers.length; li++) {
    const layer = frame.layers[li];
    if (!layer.visible) continue;

    const layerCanvas = canvasPool.getCanvas(ctx.canvas.width, ctx.canvas.height);
    const lctx = layerCanvas.getContext('2d');
    if (!lctx) {
      canvasPool.releaseCanvas(layerCanvas);
      continue;
    }

    for (const stroke of layer.strokes) {
      // Preenchimento (balde)
      if (stroke.tool === 'fill' && stroke.points.length > 0) {
        const seed = stroke.points[0];
        floodFill(
          lctx,
          seed.x,
          seed.y,
          overrideColor || stroke.color,
          stroke.opacity,
          32,
          stroke.fillType || 'solid',
          stroke.gradientColors || ['#7c5cff', '#00c8ff']
        );
        continue;
      }

      const isEraser = stroke.tool === 'eraser';
      lctx.save();
      if (isEraser && !overrideColor) {
        lctx.globalCompositeOperation = 'destination-out';
      }

      // Pincel Nítido sem Anti-Aliasing (hard-brush)
      if (stroke.tool === 'hard-brush' && stroke.points.length > 0) {
        lctx.save();
        lctx.imageSmoothingEnabled = false;
        lctx.strokeStyle = overrideColor || stroke.color;
        lctx.fillStyle = overrideColor || stroke.color;
        lctx.lineWidth = Math.max(1, Math.round(stroke.size));
        lctx.lineCap = 'square';
        lctx.lineJoin = 'miter';
        lctx.globalAlpha = isEraser ? 1 : stroke.opacity;

        if (stroke.points.length === 1) {
          const p = stroke.points[0];
          const r = Math.max(1, Math.round(stroke.size / 2));
          lctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
        } else {
          lctx.beginPath();
          lctx.moveTo(Math.round(stroke.points[0].x), Math.round(stroke.points[0].y));
          for (let i = 1; i < stroke.points.length; i++) {
            lctx.lineTo(Math.round(stroke.points[i].x), Math.round(stroke.points[i].y));
          }
          lctx.stroke();
        }
        lctx.restore();
        continue;
      }

      // Imagem Bitmap do Clipboard
      if (stroke.tool === 'image' && stroke.imageUrl) {
        let img = imageCache.get(stroke.imageUrl);
        if (!img) {
          img = new Image();
          img.src = stroke.imageUrl;
          imageCache.set(stroke.imageUrl, img);
        }
        if (img.complete && img.naturalWidth > 0) {
          const pts =
            stroke.points && stroke.points.length >= 4
              ? stroke.points
              : stroke.startPoint && stroke.endPoint
              ? [
                  stroke.startPoint,
                  { x: stroke.endPoint.x, y: stroke.startPoint.y },
                  stroke.endPoint,
                  { x: stroke.startPoint.x, y: stroke.endPoint.y },
                ]
              : null;
          if (pts) {
            const cx = (pts[0].x + pts[2].x) / 2;
            const cy = (pts[0].y + pts[2].y) / 2;
            const w = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const h = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y);
            const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);

            lctx.save();
            lctx.globalAlpha = isEraser ? 1 : stroke.opacity;
            lctx.translate(cx, cy);
            lctx.rotate(angle);
            lctx.drawImage(img, -w / 2, -h / 2, w, h);
            lctx.restore();
          }
        }
        lctx.restore();
        continue;
      }

      // Formas geométricas
      if (stroke.tool === 'rectangle' || stroke.tool === 'circle' || stroke.tool === 'line') {
        const pts =
          stroke.points && stroke.points.length >= 2
            ? stroke.points
            : stroke.startPoint && stroke.endPoint
            ? [
                stroke.startPoint,
                { x: stroke.endPoint.x, y: stroke.startPoint.y },
                stroke.endPoint,
                { x: stroke.startPoint.x, y: stroke.endPoint.y },
              ]
            : null;

        if (pts) {
          lctx.strokeStyle = overrideColor || stroke.color;
          lctx.lineWidth = stroke.size;
          lctx.lineCap = 'round';
          lctx.lineJoin = 'round';

          if (stroke.tool === 'rectangle' && pts.length >= 4) {
            lctx.beginPath();
            lctx.moveTo(pts[0].x, pts[0].y);
            lctx.lineTo(pts[1].x, pts[1].y);
            lctx.lineTo(pts[2].x, pts[2].y);
            lctx.lineTo(pts[3].x, pts[3].y);
            lctx.closePath();
            if (stroke.filled) {
              lctx.fillStyle = hexToRgba(stroke.fillColor || '#ffffff', isEraser ? 1 : stroke.opacity);
              lctx.fill();
            }
            lctx.stroke();
          } else if (stroke.tool === 'circle' && pts.length >= 4) {
            const cx = (pts[0].x + pts[2].x) / 2;
            const cy = (pts[0].y + pts[2].y) / 2;
            const rx = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) / 2;
            const ry = Math.hypot(pts[3].x - pts[0].x, pts[3].y - pts[0].y) / 2;
            const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);

            lctx.beginPath();
            lctx.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), angle, 0, Math.PI * 2);
            if (stroke.filled) {
              lctx.fillStyle = hexToRgba(stroke.fillColor || '#ffffff', isEraser ? 1 : stroke.opacity);
              lctx.fill();
            }
            lctx.stroke();
          } else if (stroke.tool === 'line' && pts.length >= 2) {
            lctx.beginPath();
            lctx.moveTo(pts[0].x, pts[0].y);
            lctx.lineTo(pts[1].x, pts[1].y);
            lctx.stroke();
          }
        }
        lctx.restore();
        continue;
      }

      // Pincel / Borracha livre
      if (stroke.points.length > 0) {
        lctx.strokeStyle = overrideColor || stroke.color;
        lctx.lineWidth = stroke.size;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';
        lctx.globalAlpha = isEraser ? 1 : stroke.opacity;

        if (stroke.points.length === 1) {
          lctx.fillStyle = overrideColor || stroke.color;
          lctx.beginPath();
          lctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.size / 2, 0, Math.PI * 2);
          lctx.fill();
        } else {
          traceStrokePath(lctx, stroke.points);
          lctx.stroke();
        }
      }
      lctx.restore();
    }

    // Compõe a camada no canvas principal com opacidade da camada
    ctx.save();
    ctx.globalAlpha = layer.opacity * opacity;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();

    canvasPool.releaseCanvas(layerCanvas);
  }
}
