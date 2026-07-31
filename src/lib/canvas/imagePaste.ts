import { useStore } from '@/lib/store';
import type { Stroke } from '@/types';

/**
 * Insere uma imagem no canvas como um novo traço de imagem centralizado e selecionado.
 */
export function insertImageIntoCanvas(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const st = useStore.getState();
      const proj = st.project;
      const fi = proj.currentFrameIndex;
      const li = proj.currentLayerIndex;

      const cx = proj.width / 2;
      const cy = proj.height / 2;

      // Limita o tamanho inicial da imagem a no máximo 60% da tela mantendo o aspect ratio
      const maxW = Math.min(img.width, proj.width * 0.6);
      const w = maxW;
      const h = (maxW / img.width) * img.height;

      const newStroke: Stroke = {
        tool: 'image',
        color: '#000000',
        size: 1,
        opacity: 1,
        imageUrl: imageUrl,
        points: [
          { x: cx - w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy - h / 2 },
          { x: cx + w / 2, y: cy + h / 2 },
          { x: cx - w / 2, y: cy + h / 2 },
        ],
        startPoint: { x: cx - w / 2, y: cy - h / 2 },
        endPoint: { x: cx + w / 2, y: cy + h / 2 },
      };

      st.addStroke(fi, li, newStroke);

      // Re-read state after addStroke to get the updated layer
      const updatedSt = useStore.getState();
      const updatedLayer = updatedSt.project.frames[fi]?.layers[li];
      const newIndex = updatedLayer ? updatedLayer.strokes.length - 1 : 0;
      updatedSt.setSelection([newIndex]);
      updatedSt.setTool('select');

      resolve(true);
    };

    img.onerror = () => {
      console.warn('Erro ao carregar imagem para colagem:', imageUrl);
      resolve(false);
    };

    img.src = imageUrl;
  });
}

/**
 * Extrai a URL de uma imagem a partir de texto HTML (ex: imagem copiada de outra aba)
 */
export function extractImageUrlFromHtml(html: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const img = doc.querySelector('img');
    if (img && img.src) {
      return img.src;
    }
  } catch (err) {
    console.error('Erro ao analisar HTML da área de transferência:', err);
  }
  return null;
}

/**
 * Processa o evento de colagem global (Paste Event) capturando binários, HTML e URLs
 */
export async function processClipboardPasteEvent(e: ClipboardEvent): Promise<boolean> {
  if (!e.clipboardData) return false;

  // 1. Verifica itens binários de imagem na área de transferência (ex: Photoshop, Figma, Screenshots, Finder)
  const items = Array.from(e.clipboardData.items);
  const imageItem = items.find((item) => item.type.startsWith('image/'));

  if (imageItem) {
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (!file) return false;

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const ok = await insertImageIntoCanvas(reader.result);
          resolve(ok);
        } else {
          resolve(false);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  // 2. Verifica se foi copiada uma imagem de outra aba do navegador (HTML <img src="...">)
  const htmlData = e.clipboardData.getData('text/html');
  if (htmlData) {
    const imgSrc = extractImageUrlFromHtml(htmlData);
    if (imgSrc) {
      e.preventDefault();
      return await insertImageIntoCanvas(imgSrc);
    }
  }

  // 3. Verifica se foi colada uma URL direta de imagem (ex: https://site.com/imagem.png ou data:image/...)
  const textData = e.clipboardData.getData('text/plain')?.trim();
  if (textData) {
    const isImageUrl =
      /^data:image\//i.test(textData) ||
      /^blob:/i.test(textData) ||
      /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(textData);

    if (isImageUrl) {
      e.preventDefault();
      return await insertImageIntoCanvas(textData);
    }
  }

  return false;
}

/**
 * Utiliza a Clipboard API moderna do navegador para colar a partir de um botão ou menu
 */
export async function pasteImageFromSystemClipboard(): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async () => {
              if (typeof reader.result === 'string') {
                const ok = await insertImageIntoCanvas(reader.result);
                resolve(ok);
              } else {
                resolve(false);
              }
            };
            reader.readAsDataURL(blob);
          });
        }
      }
    }

    // Leitura fallback de texto/URL na área de transferência
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (
        /^data:image\//i.test(trimmed) ||
        /^blob:/i.test(trimmed) ||
        /^https?:\/\/.*\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(trimmed)
      ) {
        return await insertImageIntoCanvas(trimmed);
      }
    }
  } catch (err) {
    console.warn('Clipboard API restrita ou não suportada:', err);
  }

  // Fallback: Abre um seletor de arquivo de imagem se a API do navegador for bloqueada
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(false);
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const ok = await insertImageIntoCanvas(reader.result);
          resolve(ok);
        } else {
          resolve(false);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}
