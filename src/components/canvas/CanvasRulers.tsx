import { useEffect } from 'react';

interface CanvasRulersProps {
  showRulers: boolean;
  zoom: number;
  pan: { x: number; y: number };
  projectWidth: number;
  projectHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  topRulerRef: React.RefObject<HTMLCanvasElement | null>;
  leftRulerRef: React.RefObject<HTMLCanvasElement | null>;
  onRulerPointerDown: (axis: 'x' | 'y') => (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onRulerPointerMove?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
  onRulerPointerUp?: (e: React.PointerEvent<HTMLCanvasElement>) => void;
}

export default function CanvasRulers({
  showRulers,
  zoom,
  pan,
  projectWidth,
  projectHeight,
  containerRef,
  topRulerRef,
  leftRulerRef,
  onRulerPointerDown,
  onRulerPointerMove,
  onRulerPointerUp,
}: CanvasRulersProps) {
  useEffect(() => {
    if (!showRulers) return;
    const container = containerRef.current;
    const topRuler = topRulerRef.current;
    const leftRuler = leftRulerRef.current;
    if (!container || !topRuler || !leftRuler) return;

    const RULER = 20;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    topRuler.width = (rect.width - RULER) * dpr;
    topRuler.height = RULER * dpr;
    leftRuler.width = RULER * dpr;
    leftRuler.height = (rect.height - RULER) * dpr;

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const bg = isDark ? '#1a1a1e' : '#f2f2f4';
    const fg = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.5)';

    const STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];
    const step = STEPS.find((s) => s * zoom >= 50) ?? 5000;

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const screenToCanvasX = (sx: number) => (sx - cx - pan.x) / zoom + projectWidth / 2;
    const screenToCanvasY = (sy: number) => (sy - cy - pan.y) / zoom + projectHeight / 2;
    const canvasToScreenX = (p: number) => cx + pan.x + (p - projectWidth / 2) * zoom;
    const canvasToScreenY = (p: number) => cy + pan.y + (p - projectHeight / 2) * zoom;

    // Régua superior
    {
      const ctx = topRuler.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, rect.width - RULER, RULER);
        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.font = '9px sans-serif';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 1;
        const x0 = screenToCanvasX(RULER);
        const x1 = screenToCanvasX(rect.width);
        const start = Math.floor(x0 / step) * step;
        for (let p = start; p <= x1; p += step) {
          const sx = canvasToScreenX(p) - RULER;
          if (sx < 0 || sx > rect.width - RULER) continue;
          ctx.beginPath();
          ctx.moveTo(sx, RULER - 8);
          ctx.lineTo(sx, RULER);
          ctx.stroke();
          ctx.fillText(String(p), sx + 2, 2);
        }
        const minor = step / 5;
        if (minor * zoom >= 8) {
          for (let p = Math.floor(x0 / minor) * minor; p <= x1; p += minor) {
            const sx = canvasToScreenX(p) - RULER;
            if (sx < 0 || sx > rect.width - RULER) continue;
            ctx.beginPath();
            ctx.moveTo(sx, RULER - 4);
            ctx.lineTo(sx, RULER);
            ctx.stroke();
          }
        }
      }
    }

    // Régua esquerda
    {
      const ctx = leftRuler.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, RULER, rect.height - RULER);
        ctx.strokeStyle = fg;
        ctx.fillStyle = fg;
        ctx.font = '9px sans-serif';
        ctx.lineWidth = 1;
        const y0 = screenToCanvasY(RULER);
        const y1 = screenToCanvasY(rect.height);
        const start = Math.floor(y0 / step) * step;
        for (let p = start; p <= y1; p += step) {
          const sy = canvasToScreenY(p) - RULER;
          if (sy < 0 || sy > rect.height - RULER) continue;
          ctx.beginPath();
          ctx.moveTo(RULER - 8, sy);
          ctx.lineTo(RULER, sy);
          ctx.stroke();
          ctx.save();
          ctx.translate(2, sy + 2);
          ctx.rotate(0);
          ctx.fillText(String(p), 0, 0);
          ctx.restore();
        }
        const minor = step / 5;
        if (minor * zoom >= 8) {
          for (let p = Math.floor(y0 / minor) * minor; p <= y1; p += minor) {
            const sy = canvasToScreenY(p) - RULER;
            if (sy < 0 || sy > rect.height - RULER) continue;
            ctx.beginPath();
            ctx.moveTo(RULER - 4, sy);
            ctx.lineTo(RULER, sy);
            ctx.stroke();
          }
        }
      }
    }
  }, [showRulers, zoom, pan, projectWidth, projectHeight, containerRef, topRulerRef, leftRulerRef]);

  if (!showRulers) return null;

  return (
    <>
      {/* Régua Superior (arrastar cria guia horizontal) */}
      <canvas
        ref={topRulerRef}
        onPointerDown={onRulerPointerDown('y')}
        onPointerMove={onRulerPointerMove}
        onPointerUp={onRulerPointerUp}
        className="absolute top-0 left-5 right-0 h-5 z-20 cursor-row-resize border-b border-border"
        style={{ width: 'calc(100% - 20px)' }}
        title="Clique e arraste para criar uma guia horizontal"
      />
      {/* Régua Esquerda (arrastar cria guia vertical) */}
      <canvas
        ref={leftRulerRef}
        onPointerDown={onRulerPointerDown('x')}
        onPointerMove={onRulerPointerMove}
        onPointerUp={onRulerPointerUp}
        className="absolute top-5 left-0 bottom-0 w-5 z-20 cursor-col-resize border-r border-border"
        style={{ height: 'calc(100% - 20px)' }}
        title="Clique e arraste para criar uma guia vertical"
      />
      {/* Canto superior esquerdo */}
      <div className="absolute top-0 left-0 w-5 h-5 bg-surface border-r border-b border-border z-20 flex items-center justify-center text-[8px] text-text-muted select-none">
        px
      </div>
    </>
  );
}
