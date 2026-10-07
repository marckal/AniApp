import { useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useLearn, orderedPrinciples, type LearnStep } from '@/lib/learnStore';
import { EXERCISES, GLOSSARY } from '@/data/learnPath';
import { analyzeMotion } from '@/lib/motion';
import { BookOpen, Check, CheckCircle2, Circle, RotateCcw } from 'lucide-react';

const STEPS: { id: LearnStep; label: string }[] = [
  { id: 'see', label: 'Ver' },
  { id: 'do', label: 'Fazer' },
  { id: 'compare', label: 'Comparar' },
];

export default function LearnSidebar() {
  const principles = useMemo(orderedPrinciples, []);
  const principleId = useLearn((s) => s.principleId);
  const step = useLearn((s) => s.step);
  const done = useLearn((s) => s.done);
  const open = useLearn((s) => s.open);
  const resetExercise = useLearn((s) => s.resetExercise);
  const markDone = useLearn((s) => s.markDone);
  const project = useStore((s) => s.project);

  const principle = principles.find((p) => p.id === principleId) ?? principles[0];
  const exercise = EXERCISES[principle.id];

  const checks = useMemo(() => {
    if (!exercise || step === 'see') return null;
    return exercise.evaluate(project, analyzeMotion(project.frames, project.currentLayerIndex, project.fps));
  }, [exercise, step, project]);

  // Conclusão: exercício com todos os itens cumpridos, ou princípio sem exercício já visto
  const allDone = !!checks && checks.every((c) => c.done);
  useEffect(() => {
    if (allDone || (!exercise && step === 'see')) markDone(principle.id);
  }, [allDone, exercise, step, principle.id, markDone]);

  return (
    <aside className="w-72 flex-shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto select-none">
      <div className="p-3 border-b border-border">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
          Trilha de aprendizagem
        </h4>
        <div className="flex flex-col gap-0.5">
          {principles.map((p, i) => {
            const isCurrent = p.id === principle.id;
            const isDone = done.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => open(p.id, 'see')}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition-colors ${
                  isCurrent
                    ? 'bg-primary/15 border border-primary text-text font-semibold'
                    : 'border border-transparent text-text hover:bg-surface-light'
                }`}
              >
                <span
                  className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isDone
                      ? 'bg-accent-green text-white'
                      : isCurrent
                      ? 'bg-primary text-text-inverse'
                      : 'bg-surface-light text-text-muted'
                  }`}
                >
                  {isDone ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                <span className="truncate">{p.title.replace(/\s*\(.*\)\s*$/, '')}</span>
                {EXERCISES[p.id] && !isDone && (
                  <span className="ml-auto text-[9px] font-bold text-primary uppercase">exercício</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-bold text-text leading-tight">{principle.title}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">{principle.subtitle}</p>
        </div>

        <div className="flex gap-1">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const disabled = s.id !== 'see' && !exercise;
            return (
              <button
                key={s.id}
                disabled={disabled}
                onClick={() => open(principle.id, s.id)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active ? 'bg-primary text-text-inverse' : 'bg-surface-light text-text-muted hover:text-text'
                }`}
                title={disabled ? 'Exercício guiado deste princípio em breve' : undefined}
              >
                {i + 1} · {s.label}
              </button>
            );
          })}
        </div>

        {step === 'see' && (
          <div className="rounded-xl border border-border bg-surface-light/40 p-3 text-xs leading-relaxed text-text">
            <p>{principle.description.replace(/\*/g, '')}</p>
            <ul className="mt-2 space-y-1.5">
              {principle.keyLessons.map((lesson) => (
                <li key={lesson} className="flex gap-1.5">
                  <CheckCircle2 size={13} className="text-accent-green flex-shrink-0 mt-0.5" />
                  <span>{lesson}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-text-muted flex items-center gap-1">
              <BookOpen size={11} /> {principle.bookSource}
            </p>
            {exercise ? (
              <button
                onClick={() => open(principle.id, 'do')}
                className="w-full mt-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-text-inverse font-bold"
              >
                Praticar este princípio →
              </button>
            ) : (
              <p className="mt-3 text-[11px] text-text-muted">
                Exercício guiado em breve. Use o modo Estúdio para praticar livremente.
              </p>
            )}
          </div>
        )}

        {step !== 'see' && exercise && checks && (
          <div className="rounded-xl border border-border bg-surface-light/40 p-3 text-xs text-text">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
              {step === 'do' ? 'Exercício' : 'Compare o resultado'}
            </h4>
            <p className="leading-relaxed">
              {step === 'do'
                ? exercise.intro
                : 'Assista em câmera lenta e em ping-pong. Compare o seu espaçamento com o da referência no painel à direita.'}
            </p>
            <ul className="mt-2 space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2">
                  {c.done ? (
                    <CheckCircle2 size={14} className="text-accent-green flex-shrink-0 mt-px" />
                  ) : (
                    <Circle size={14} className="text-text-muted flex-shrink-0 mt-px" />
                  )}
                  <div>
                    <span className={c.done ? 'text-text-muted line-through' : 'font-medium'}>{c.label}</span>
                    {!c.done && step === 'do' && (
                      <p className="text-[11px] text-text-muted leading-snug mt-0.5">{c.hint}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-1.5 mt-3">
              <button
                onClick={resetExercise}
                className="px-2 py-1.5 rounded-lg border border-border text-text-muted hover:text-text hover:bg-surface flex items-center gap-1"
                title="Recomeçar o exercício do zero"
              >
                <RotateCcw size={12} /> Recomeçar
              </button>
              {step === 'do' && (
                <button
                  onClick={() => open(principle.id, 'compare')}
                  className="flex-1 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-text-inverse font-bold"
                >
                  Comparar →
                </button>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border p-3 text-[11px] leading-relaxed text-text">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Glossário</h4>
          {GLOSSARY.map(([term, def]) => (
            <p key={term}>
              <b>{term}</b> — {def}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
