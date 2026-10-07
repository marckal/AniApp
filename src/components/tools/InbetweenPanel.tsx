import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { EASING_OPTIONS, getEasingFunction } from '@/lib/easing';
import { isKeyish, nextKeyish, prevKeyish } from '@/lib/motion';
import type { EaseType } from '@/types';
import { Wand2, X, Minus, Plus } from 'lucide-react';

const W = 236;
const H = 72;
const PAD = 8;

/** Prévia da curva de easing com os quadros gerados marcados nela. */
function CurvePreview({ easing, count }: { easing: string; count: number }) {
  const ease = getEasingFunction(easing);
  const x = (t: number) => PAD + t * (W - 2 * PAD);
  const y = (v: number) => H - PAD - v * (H - 2 * PAD);
  const path = Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return `${i === 0 ? 'M' : 'L'}${x(t).toFixed(1)} ${y(ease(t)).toFixed(1)}`;
  }).join(' ');
  const samples = Array.from({ length: count + 2 }, (_, k) => k / (count + 1));

  return (
    <svg width={W} height={H + 22} className="block">
      <rect x={0} y={0} width={W} height={H} rx={8} className="fill-surface-light stroke-border" />
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="stroke-border" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="#f5c518" strokeWidth={2.5} />
      {samples.map((t, k) => (
        <circle
          key={k}
          cx={x(t)}
          cy={y(ease(t))}
          r={k === 0 || k === samples.length - 1 ? 4 : 2.5}
          fill={k === 0 || k === samples.length - 1 ? '#0077b6' : '#1a1a20'}
        />
      ))}
      <text x={PAD + 2} y={PAD + 8} fontSize={9} className="fill-text-muted">posição</text>
      <text x={W - PAD - 2} y={H - PAD - 2} fontSize={9} textAnchor="end" className="fill-text-muted">tempo</text>
      {/* Gráfico de espaçamento: onde o objeto estará em cada quadro */}
      <line x1={x(0)} y1={H + 12} x2={x(1)} y2={H + 12} className="stroke-text-muted" strokeWidth={1.5} />
      {samples.map((t, k) => {
        const edge = k === 0 || k === samples.length - 1;
        return (
          <line
            key={k}
            x1={x(ease(t))}
            x2={x(ease(t))}
            y1={H + (edge ? 4 : 7)}
            y2={H + (edge ? 20 : 17)}
            stroke={edge ? '#0077b6' : 'currentColor'}
            strokeWidth={edge ? 2.5 : 1.5}
            className="text-text"
          />
        );
      })}
    </svg>
  );
}

export default function InbetweenPanel() {
  const project = useStore((s) => s.project);
  const generateInbetweens = useStore((s) => s.generateInbetweens);
  const updateFrame = useStore((s) => s.updateFrame);
  const setShowInbetweenPanel = useStore((s) => s.setShowInbetweenPanel);

  const frames = project.frames;
  const cur = project.currentFrameIndex;
  const from = isKeyish(frames[cur]) ? cur : prevKeyish(frames, cur);
  const to = from >= 0 ? nextKeyish(frames, from) : -1;
  const existing = to > from && from >= 0 ? to - from - 1 : 0;

  // Valores escolhidos pelo usuário; null = usar o padrão do segmento atual
  const [countChoice, setCountChoice] = useState<number | null>(null);
  const [easingChoice, setEasingChoice] = useState<EaseType | null>(null);
  const [followArc, setFollowArc] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const count = countChoice ?? (existing > 0 ? existing : 5);
  const easing: EaseType = easingChoice ?? frames[from]?.easing ?? 'ease-in-out';
  const canArc = from >= 0 && to >= 0 && (nextKeyish(frames, to) >= 0 || prevKeyish(frames, from) >= 0);

  const label = useMemo(() => {
    if (from < 0 || to < 0) return null;
    return `Quadro ${from + 1} → ${to + 1}`;
  }, [from, to]);

  const handleGenerate = () => {
    if (from < 0 || to < 0) return;
    const ok = generateInbetweens(from, to, {
      count,
      ease: getEasingFunction(easing),
      followArc: followArc && canArc,
    });
    if (ok) {
      updateFrame(from, { easing });
      setCountChoice(null);
      setMessage(`${count} intermediários gerados.`);
    } else {
      setMessage('Não foi possível gerar: há poses chave entre os quadros.');
    }
    setTimeout(() => setMessage(null), 2500);
  };

  return (
    <div className="absolute top-4 right-4 z-30 w-[268px] bg-surface border border-border rounded-2xl shadow-xl p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-bold text-text flex items-center gap-1.5">
            <Wand2 size={14} className="text-primary" />
            Gerar intermediários
          </span>
          {label && <span className="text-[10px] font-mono text-text-muted">{label}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowInbetweenPanel(false)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light"
            title="Fechar"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {label ? (
        <>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-text-muted">Quadros entre as poses</span>
            <div className="flex items-center gap-1 bg-surface-light border border-border rounded-md px-1">
              <button
                onClick={() => setCountChoice(Math.max(1, count - 1))}
                className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text"
              >
                <Minus size={11} />
              </button>
              <span className="font-mono font-bold text-text w-5 text-center">{count}</span>
              <button
                onClick={() => setCountChoice(Math.min(48, count + 1))}
                className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-text-muted">Curva</span>
            <select
              value={easing}
              onChange={(e) => setEasingChoice(e.target.value as EaseType)}
              className="bg-surface-light border border-border rounded-md px-1.5 py-0.5 text-xs text-text focus:outline-none cursor-pointer"
            >
              {EASING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <CurvePreview easing={easing} count={count} />

          <label
            className={`flex items-center gap-2 text-xs mt-2 ${canArc ? 'text-text cursor-pointer' : 'text-text-muted/60'}`}
            title={canArc ? '' : 'Precisa de uma terceira pose (chave ou breakdown) para formar o arco'}
          >
            <input
              type="checkbox"
              checked={followArc && canArc}
              disabled={!canArc}
              onChange={(e) => setFollowArc(e.target.checked)}
              className="accent-primary"
            />
            Seguir arco pela pose vizinha
          </label>

          <button
            onClick={handleGenerate}
            className="w-full mt-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-text-inverse text-xs font-bold transition-colors"
          >
            {existing > 0 ? `Refazer ${count} intermediários` : `Gerar ${count} intermediários`}
          </button>
          {message && <p className="text-[11px] text-text-muted mt-1.5 text-center">{message}</p>}
        </>
      ) : (
        <p className="text-xs text-text-muted leading-relaxed">
          Para gerar intermediários, o projeto precisa de duas poses: vá para uma pose chave e
          garanta que exista outra depois dela. Quadros marcados como <b>I</b> na timeline são
          tratados como intermediários.
        </p>
      )}
    </div>
  );
}
