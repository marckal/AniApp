import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useLearn } from '@/lib/learnStore';
import { EXERCISES } from '@/data/learnPath';
import { analyzeMotion } from '@/lib/motion';
import { easeInOutSine } from '@/lib/easing';
import type { FrameKind } from '@/types';
import { CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

const RW = 272;
const KIND_COLOR: Partial<Record<FrameKind, string>> = { key: '#0077b6', breakdown: '#bc5090' };

/** Régua de espaçamento: um traço por quadro na posição percorrida (0..1). */
function SpacingRuler({
  progress,
  kinds,
  current,
}: {
  progress: number[];
  kinds: (FrameKind | undefined)[];
  current: number;
}) {
  const x = (v: number) => 8 + v * (RW - 16);
  return (
    <svg width={RW} height={40} className="block text-text">
      <line x1={x(0)} y1={20} x2={x(1)} y2={20} stroke="currentColor" strokeWidth={2} />
      {progress.map((p, i) => {
        const color = i === current ? '#f5c518' : KIND_COLOR[kinds[i] ?? 'inbetween'];
        const tall = !!KIND_COLOR[kinds[i] ?? 'inbetween'];
        return (
          <line
            key={i}
            x1={x(p)}
            x2={x(p)}
            y1={tall ? 6 : 11}
            y2={tall ? 34 : 29}
            stroke={color ?? 'currentColor'}
            strokeWidth={i === current ? 4 : tall ? 3 : 1.75}
          />
        );
      })}
    </svg>
  );
}

export default function MotionPanel() {
  const project = useStore((s) => s.project);
  const setCurrentFrame = useStore((s) => s.setCurrentFrame);
  const principleId = useLearn((s) => s.principleId);
  const step = useLearn((s) => s.step);
  const exercise = EXERCISES[principleId];

  const analysis = useMemo(
    () => analyzeMotion(project.frames, project.currentLayerIndex, project.fps),
    [project.frames, project.currentLayerIndex, project.fps]
  );
  const kinds = project.frames.map((f) => f.kind);
  const hasMotion = analysis.speeds.some((v) => v > 0);
  const maxSpeed = Math.max(1, ...analysis.speeds);

  // Referência ideal: mesmo número de quadros com slow in / slow out
  const reference = useMemo(() => {
    const n = project.frames.length;
    return Array.from({ length: n }, (_, i) => (n > 1 ? easeInOutSine(i / (n - 1)) : 0));
  }, [project.frames.length]);

  const checks = useMemo(
    () => (exercise && step !== 'see' ? exercise.evaluate(project, analysis) : null),
    [exercise, step, project, analysis]
  );

  const layerName = project.frames[project.currentFrameIndex]?.layers[project.currentLayerIndex]?.name;
  const [minS, maxS] = exercise?.targetSeconds ?? [0, 0];
  const secondsLabel = analysis.seconds.toFixed(2).replace('.', ',');

  if (step === 'see') {
    return (
      <aside className="w-80 flex-shrink-0 bg-surface border-l border-border p-3 flex flex-col gap-3 overflow-y-auto select-none">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Como observar o exemplo</h4>
        <ul className="text-xs text-text leading-relaxed space-y-2">
          {[
            'Use a velocidade 0,25× ou 0,5× na timeline para ver o movimento em câmera lenta.',
            'Pause e avance quadro a quadro com as setas ‹ › para comparar as poses.',
            'Ligue o ping-pong para a animação ir e voltar sem saltos.',
            'A pele de cebola mostra em vermelho os quadros anteriores e em azul os seguintes.',
          ].map((tip) => (
            <li key={tip} className="flex gap-2">
              <Eye size={13} className="text-primary-hover flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-text-muted rounded-xl border border-dashed border-border p-3 leading-relaxed">
          {exercise
            ? 'Na etapa Fazer, este painel mostra o gráfico de espaçamento, a velocidade por quadro e o retorno do seu exercício.'
            : 'O exercício guiado deste princípio ainda não está disponível.'}
        </p>
        <div className="flex justify-between text-xs">
          <span className="text-text">Duração do exemplo</span>
          <b className="font-mono text-text">
            {analysis.totalFrames} q · {secondsLabel} s
          </b>
        </div>
      </aside>
    );
  }

  const barW = Math.max(4, Math.min(22, (RW - 8) / Math.max(1, analysis.speeds.length) - 3));

  return (
    <aside className="w-80 flex-shrink-0 bg-surface border-l border-border p-3 flex flex-col gap-3 overflow-y-auto select-none">
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Gráfico de espaçamento</h4>
        <p className="text-[10px] text-text-muted">Camada analisada: {layerName ?? '—'}</p>
      </div>

      {hasMotion ? (
        <>
          <div className="rounded-xl border border-border p-2">
            <div className="text-[10px] font-semibold text-text-muted mb-0.5">{step === 'compare' ? 'Seu movimento' : 'Movimento'}</div>
            <SpacingRuler progress={analysis.progress} kinds={kinds} current={project.currentFrameIndex} />
            {step === 'compare' && (
              <>
                <div className="text-[10px] font-semibold text-text-muted mt-1 mb-0.5">Referência (slow in / slow out)</div>
                <SpacingRuler progress={reference} kinds={kinds.map((_, i) => (i === 0 || i === kinds.length - 1 ? 'key' : 'inbetween'))} current={-1} />
              </>
            )}
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>início</span>
              <span>traços juntos = lento · afastados = rápido</span>
              <span>fim</span>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Velocidade por quadro</h4>
            <div className="rounded-xl border border-border p-2">
              <svg width={RW} height={84} className="block">
                {analysis.speeds.map((v, i) => {
                  const h = Math.max(2, (v / maxSpeed) * 70);
                  const isCur = i + 1 === project.currentFrameIndex;
                  return (
                    <rect
                      key={i}
                      x={4 + i * (barW + 3)}
                      y={76 - h}
                      width={barW}
                      height={h}
                      rx={2}
                      className={isCur ? 'fill-text' : 'fill-accent-green'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setCurrentFrame(i + 1)}
                    >
                      <title>{`Quadro ${i + 1} → ${i + 2}: ${Math.round(v)} px`}</title>
                    </rect>
                  );
                })}
                <line x1={0} y1={77} x2={RW} y2={77} className="stroke-border" />
              </svg>
              <p className="text-[10px] text-text-muted">Cada barra é a distância percorrida entre dois quadros.</p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-muted rounded-xl border border-dashed border-border p-3 leading-relaxed">
          Nada se move na camada ativa ainda. Desenhe o objeto em posições diferentes ao longo dos quadros
          para ver o espaçamento.
        </p>
      )}

      {checks && (
        <div className="flex flex-col gap-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Retorno do exercício</h4>
          {checks.map((c) =>
            c.done ? (
              <div key={c.id} className="flex gap-2 rounded-lg bg-accent-green/10 text-text p-2 text-xs">
                <CheckCircle2 size={14} className="text-accent-green flex-shrink-0 mt-px" />
                <span>{c.label}</span>
              </div>
            ) : (
              <div key={c.id} className="flex gap-2 rounded-lg bg-primary/15 text-text p-2 text-xs">
                <AlertTriangle size={14} className="text-primary-hover flex-shrink-0 mt-px" />
                <div>
                  <b className="block">{c.label}</b>
                  <span className="text-text-muted">{c.hint}</span>
                </div>
              </div>
            )
          )}
          {checks.every((c) => c.done) && (
            <p className="text-xs font-semibold text-accent-green text-center">Exercício concluído! 🎉</p>
          )}
        </div>
      )}

      <div>
        <div className="flex justify-between text-xs">
          <span className="text-text">
            Duração {exercise && <span className="text-text-muted">· alvo {String(minS).replace('.', ',')}–{String(maxS).replace('.', ',')} s</span>}
          </span>
          <b className="font-mono text-text">
            {analysis.totalFrames} q · {secondsLabel} s
          </b>
        </div>
        {exercise && (
          <div className="relative h-2 rounded bg-surface-light mt-1.5">
            {/* faixa alvo */}
            <div
              className="absolute top-0 bottom-0 bg-accent-green/30 rounded"
              style={{ left: `${(minS / (maxS * 1.5)) * 100}%`, width: `${((maxS - minS) / (maxS * 1.5)) * 100}%` }}
            />
            <div
              className="absolute -top-1 -bottom-1 w-1 rounded bg-text"
              style={{ left: `${Math.min(100, (analysis.seconds / (maxS * 1.5)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
