import { GifWriter } from 'omggif';
import type { Project } from '@/types';
import { renderFrameLayers } from '@/lib/canvas/renderer';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: string;
}

/**
 * Quantizador de cores baseado no algoritmo Median Cut (100% Strict Mode Safe)
 */
function quantizeColors(pixels: [number, number, number][], maxColors: number) {
  if (pixels.length === 0) {
    return {
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ] as [number, number, number][],
      mapColor: (p: [number, number, number]) => p,
    };
  }

  interface Box {
    r1: number;
    r2: number;
    g1: number;
    g2: number;
    b1: number;
    b2: number;
    pts: [number, number, number][];
  }

  function createBox(pts: [number, number, number][]): Box {
    let r1 = 255,
      r2 = 0,
      g1 = 255,
      g2 = 0,
      b1 = 255,
      b2 = 0;
    for (let i = 0; i < pts.length; i++) {
      const [r, g, b] = pts[i];
      if (r < r1) r1 = r;
      if (r > r2) r2 = r;
      if (g < g1) g1 = g;
      if (g > g2) g2 = g;
      if (b < b1) b1 = b;
      if (b > b2) b2 = b;
    }
    return { r1, r2, g1, g2, b1, b2, pts };
  }

  function splitBox(box: Box): [Box, Box] {
    const rw = box.r2 - box.r1;
    const gw = box.g2 - box.g1;
    const bw = box.b2 - box.b1;
    const maxDim = Math.max(rw, gw, bw);
    const channel = maxDim === rw ? 0 : maxDim === gw ? 1 : 2;

    box.pts.sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(box.pts.length / 2);

    return [createBox(box.pts.slice(0, mid)), createBox(box.pts.slice(mid))];
  }

  const boxes: Box[] = [createBox(pixels)];

  while (boxes.length < maxColors) {
    let maxIdx = -1;
    let maxVol = -1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.pts.length <= 1) continue;
      const vol = (b.r2 - b.r1 + 1) * (b.g2 - b.g1 + 1) * (b.b2 - b.b1 + 1);
      if (vol > maxVol) {
        maxVol = vol;
        maxIdx = i;
      }
    }

    if (maxIdx === -1 || maxVol <= 0) break;

    const target = boxes.splice(maxIdx, 1)[0];
    const [b1, b2] = splitBox(target);
    if (b1.pts.length > 0) boxes.push(b1);
    if (b2.pts.length > 0) boxes.push(b2);
  }

  const palette: [number, number, number][] = boxes.map((box) => {
    if (box.pts.length === 0) return [0, 0, 0];
    let rSum = 0,
      gSum = 0,
      bSum = 0;
    for (let i = 0; i < box.pts.length; i++) {
      rSum += box.pts[i][0];
      gSum += box.pts[i][1];
      bSum += box.pts[i][2];
    }
    const len = box.pts.length;
    return [Math.round(rSum / len), Math.round(gSum / len), Math.round(bSum / len)];
  });

  const mapColor = (p: [number, number, number]): [number, number, number] => {
    let minDist = Infinity;
    let best = palette[0];
    for (let i = 0; i < palette.length; i++) {
      const pal = palette[i];
      const dr = p[0] - pal[0];
      const dg = p[1] - pal[1];
      const db = p[2] - pal[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < minDist) {
        minDist = dist;
        best = pal;
      }
    }
    return best;
  };

  return { palette, mapColor };
}

/**
 * Exporta o projeto de animação como um arquivo GIF animado (.gif)
 */
export async function exportToGif(
  project: Project,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const width = project.width;
  const height = project.height;
  const totalFrames = project.frames.length;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do Canvas.');

  // Aloca buffer seguro para a gravação do GIF
  const maxBufSize = width * height * totalFrames * 5 + 2 * 1024 * 1024;
  const buf = new Uint8Array(maxBufSize);
  const writer = new GifWriter(buf, width, height, { loop: 0 });

  // Delay em centésimos de segundo (10ms cada unidade). Ex: 24 fps => ~4 centésimos
  const delayInCentiSeconds = Math.max(1, Math.round(100 / (project.fps || 24)));

  for (let i = 0; i < totalFrames; i++) {
    if (onProgress) {
      onProgress({
        currentFrame: i + 1,
        totalFrames,
        percentage: Math.round(((i + 0.3) / totalFrames) * 100),
        status: `Processando quadro ${i + 1} de ${totalFrames}...`,
      });
    }

    // Desenha cor de fundo e o frame correspondente
    ctx.fillStyle = project.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    renderFrameLayers(ctx, project.frames[i], 1);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Amostragem de pixels para quantização de cores
    const pixels: [number, number, number][] = [];
    const step = Math.max(1, Math.floor((width * height) / 10000));
    for (let p = 0; p < data.length; p += 4 * step) {
      pixels.push([data[p], data[p + 1], data[p + 2]]);
    }

    const { palette, mapColor } = quantizeColors(pixels, 256);

    // Converte paleta [r,g,b] para inteiro 0xRRGGBB
    const paletteHex = palette.map(([r, g, b]) => (r << 16) | (g << 8) | b);
    const paletteIndexMap = new Map<string, number>();
    palette.forEach(([r, g, b], idx) => {
      paletteIndexMap.set(`${r},${g},${b}`, idx);
    });

    // Mapeia pixels RGBA para a paleta
    const indexedPixels = new Uint8Array(width * height);
    for (let p = 0, idx = 0; p < data.length; p += 4, idx++) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const mapped = mapColor([r, g, b]);
      const key = `${mapped[0]},${mapped[1]},${mapped[2]}`;
      indexedPixels[idx] = paletteIndexMap.get(key) ?? 0;
    }

    writer.addFrame(0, 0, width, height, indexedPixels as unknown as number[], {
      palette: paletteHex,
      delay: delayInCentiSeconds,
    });

    if (onProgress) {
      onProgress({
        currentFrame: i + 1,
        totalFrames,
        percentage: Math.round(((i + 1) / totalFrames) * 100),
        status: `Codificando quadro ${i + 1} de ${totalFrames}...`,
      });
    }

    // Libera event loop para manter UI responsiva
    await new Promise((res) => setTimeout(res, 0));
  }

  const endPos = writer.end();
  return new Blob([buf.subarray(0, endPos)], { type: 'image/gif' });
}

/**
 * Exporta o projeto de animação como um vídeo MP4 (.mp4)
 */
export async function exportToMp4(
  project: Project,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob> {
  const width = project.width;
  const height = project.height;
  const totalFrames = project.frames.length;
  const fps = project.fps || 24;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível obter o contexto 2D do Canvas.');

  // Seleção inteligente do formato suportado no navegador
  let mimeType = 'video/mp4';
  if (typeof MediaRecorder !== 'undefined') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (!MediaRecorder.isTypeSupported('video/mp4')) {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
    }
  }

  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: 'video/mp4' });
      resolve(videoBlob);
    };

    recorder.onerror = (err) => reject(err);

    recorder.start();

    const frameDuration = 1000 / fps;
    let frameIdx = 0;

    const renderNext = () => {
      if (frameIdx >= totalFrames) {
        if (onProgress) {
          onProgress({
            currentFrame: totalFrames,
            totalFrames,
            percentage: 100,
            status: 'Finalizando gravação de vídeo MP4...',
          });
        }
        setTimeout(() => {
          recorder.stop();
        }, frameDuration * 2);
        return;
      }

      ctx.fillStyle = project.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      renderFrameLayers(ctx, project.frames[frameIdx], 1);

      if (onProgress) {
        onProgress({
          currentFrame: frameIdx + 1,
          totalFrames,
          percentage: Math.round(((frameIdx + 1) / totalFrames) * 100),
          status: `Gravando quadro ${frameIdx + 1} de ${totalFrames}...`,
        });
      }

      frameIdx++;
      setTimeout(renderNext, frameDuration);
    };

    renderNext();
  });
}
