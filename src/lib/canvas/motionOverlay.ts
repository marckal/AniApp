import type { Project } from '@/types';
import { motionCenters } from '@/lib/motion';

const KEY_COLOR = '#0077b6';
const BREAKDOWN_COLOR = '#bc5090';
const CURRENT_COLOR = '#f5c518';

/**
 * Desenha a trajetória da camada ativa ao longo dos quadros: rastro tracejado
 * (arco), um ponto por quadro (gráfico de espaçamento) e marcadores para
 * chaves, breakdowns e o quadro atual.
 */
export function drawMotionPath(ctx: CanvasRenderingContext2D, project: Project, layerIndex: number): void {
  const centers = motionCenters(project.frames, layerIndex);
  const pts = centers
    .map((c, i) => (c ? { ...c, i } : null))
    .filter((c): c is { x: number; y: number; i: number } => c !== null);
  if (pts.length < 2) return;

  // Espessuras proporcionais ao tamanho do projeto para ficarem legíveis em qualquer zoom
  const unit = Math.max(1, Math.min(project.width, project.height) / 540);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
  ctx.strokeStyle = 'rgba(80, 80, 96, 0.7)';
  ctx.lineWidth = 1.5 * unit;
  ctx.setLineDash([6 * unit, 5 * unit]);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const p of pts) {
    const kind = project.frames[p.i]?.kind;
    const isCurrent = p.i === project.currentFrameIndex;
    if (kind === 'key' || kind === 'breakdown') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7 * unit, 0, Math.PI * 2);
      ctx.strokeStyle = kind === 'key' ? KEY_COLOR : BREAKDOWN_COLOR;
      ctx.lineWidth = 2.5 * unit;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, (isCurrent ? 4.5 : 3) * unit, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? CURRENT_COLOR : '#1a1a20';
    ctx.fill();
    if (isCurrent) {
      ctx.strokeStyle = '#1a1a20';
      ctx.lineWidth = 1.5 * unit;
      ctx.stroke();
    }
    // número do quadro
    ctx.font = `${Math.round(9 * unit)}px ui-monospace, monospace`;
    ctx.fillStyle = 'rgba(60, 60, 72, 0.85)';
    ctx.textAlign = 'center';
    ctx.fillText(String(p.i + 1), p.x, p.y - 10 * unit);
  }
  ctx.restore();
}
