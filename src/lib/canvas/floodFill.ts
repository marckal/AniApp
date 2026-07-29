import type { FillType } from '@/types';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return [r, g, b];
}

/**
 * Flood fill (balde de tinta) com suporte a cores sólidas, gradiente linear e dither gradient retro.
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fillColor: string,
  alpha = 1,
  tolerance = 32,
  fillType: FillType = 'solid',
  gradientColors: [string, string] = ['#7c5cff', '#00c8ff']
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const sx = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(height - 1, Math.floor(y)));

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const targetIdx = (sy * width + sx) * 4;
  const tr = data[targetIdx];
  const tg = data[targetIdx + 1];
  const tb = data[targetIdx + 2];
  const ta = data[targetIdx + 3];

  const [fr, fg, fb] = hexToRgb(fillColor);
  const [c1r, c1g, c1b] = hexToRgb(gradientColors[0]);
  const [c2r, c2g, c2b] = hexToRgb(gradientColors[1]);
  const fa = Math.round(alpha * 255);

  if (
    fillType === 'solid' &&
    Math.abs(tr - fr) <= 2 &&
    Math.abs(tg - fg) <= 2 &&
    Math.abs(tb - fb) <= 2 &&
    Math.abs(ta - fa) <= 2
  ) {
    return;
  }

  const matches = (idx: number) =>
    Math.abs(data[idx] - tr) <= tolerance &&
    Math.abs(data[idx + 1] - tg) <= tolerance &&
    Math.abs(data[idx + 2] - tb) <= tolerance &&
    Math.abs(data[idx + 3] - ta) <= tolerance;

  const stack: [number, number][] = [[sx, sy]];
  const visited = new Uint8Array(width * height);
  const filledPixels: [number, number][] = [];

  let minX = width;
  let maxX = 0;

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
    const pixel = cy * width + cx;
    if (visited[pixel]) continue;
    visited[pixel] = 1;

    const idx = pixel * 4;
    if (!matches(idx)) continue;

    filledPixels.push([cx, cy]);
    if (cx < minX) minX = cx;
    if (cx > maxX) maxX = cx;

    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  const spanX = Math.max(1, maxX - minX);

  for (let i = 0; i < filledPixels.length; i++) {
    const [cx, cy] = filledPixels[i];
    const idx = (cy * width + cx) * 4;

    if (fillType === 'gradient-dither') {
      const t = (cx - minX) / spanX;
      const threshold = (BAYER_4X4[cy % 4][cx % 4] + 0.5) / 16;
      const useSecond = t > threshold;

      data[idx] = useSecond ? c2r : c1r;
      data[idx + 1] = useSecond ? c2g : c1g;
      data[idx + 2] = useSecond ? c2b : c1b;
      data[idx + 3] = fa;
    } else if (fillType === 'gradient-linear') {
      const t = (cx - minX) / spanX;
      data[idx] = Math.round(c1r + (c2r - c1r) * t);
      data[idx + 1] = Math.round(c1g + (c2g - c1g) * t);
      data[idx + 2] = Math.round(c1b + (c2b - c1b) * t);
      data[idx + 3] = fa;
    } else {
      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = fa;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
