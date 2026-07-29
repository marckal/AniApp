import type { Point, Tool } from '@/types';

/**
 * Converte coordenadas de evento do ponteiro/mouse em coordenadas locais do canvas pixel-space.
 */
export function getCanvasCoordinates(
  e: { clientX: number; clientY: number; pressure?: number },
  canvas: HTMLCanvasElement,
  _zoom = 1,
  _pan = { x: 0, y: 0 }
): Point {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
    pressure: e.pressure !== undefined && e.pressure !== 0 ? e.pressure : 0.5,
  };
}

/**
 * Restringe o ponto final conforme a ferramenta quando Shift está pressionado:
 * - linha: ângulos de 45°
 * - retângulo/círculo: proporção 1:1 (quadrado/círculo)
 */
export function constrainPoint(tool: Tool, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (tool === 'line') {
    const angle = Math.atan2(dy, dx);
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    const dist = Math.hypot(dx, dy);
    return {
      x: start.x + dist * Math.cos(snapAngle),
      y: start.y + dist * Math.sin(snapAngle),
    };
  }

  if (tool === 'rectangle' || tool === 'circle') {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: start.x + Math.sign(dx || 1) * size,
      y: start.y + Math.sign(dy || 1) * size,
    };
  }

  return end;
}

/**
 * Converte hex (#rrggbb) para rgba(r,g,b,alpha).
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
