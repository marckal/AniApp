import { GifWriter } from 'omggif';
import quantize from 'quantize';
import type { Project } from '@/types';
import { renderFrameLayers } from '@/lib/canvas/renderer';

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: string;
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

    // Amostragem de pixels para quantização eficiente de cores
    const pixels: [number, number, number][] = [];
    const step = Math.max(1, Math.floor((width * height) / 10000));
    for (let p = 0; p < data.length; p += 4 * step) {
      // Ignora pixels totalmente transparentes se houver fundo transparente
      pixels.push([data[p], data[p + 1], data[p + 2]]);
    }

    const colorMap = quantize(pixels, 256);
    const paletteList: [number, number, number][] = colorMap
      ? colorMap.palette()
      : [
          [0, 0, 0],
          [255, 255, 255],
        ];

    // Converte paleta [r,g,b] para inteiro 0xRRGGBB
    const paletteHex = paletteList.map(([r, g, b]) => (r << 16) | (g << 8) | b);
    const paletteIndexMap = new Map<string, number>();
    paletteList.forEach(([r, g, b], idx) => {
      paletteIndexMap.set(`${r},${g},${b}`, idx);
    });

    // Mapeia pixels RGBA para a paleta
    const indexedPixels = new Uint8Array(width * height);
    for (let p = 0, idx = 0; p < data.length; p += 4, idx++) {
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      const mapped = colorMap ? colorMap.map([r, g, b]) : [r, g, b];
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
    videoBitsPerSecond: 8000000, // 8 Mbps para excelente qualidade de renderização
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
