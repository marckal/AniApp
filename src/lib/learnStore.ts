import { create } from 'zustand';
import type { Project } from '@/types';
import { useStore } from '@/lib/store';
import { ANIMATION_PRINCIPLES } from '@/data/animationPrinciples';
import { EXERCISES, LEARN_ORDER } from '@/data/learnPath';
import { getCustomPrinciple } from '@/lib/customPrinciples';

export type LearnStep = 'see' | 'do' | 'compare';

const LEARN_KEY = 'aniapp:learn:v1';

interface PersistedLearn {
  principleId: string;
  step: LearnStep;
  done: string[];
  /** Trabalho do aluno em cada exercício, para não perder ao trocar de etapa. */
  work: Record<string, Project>;
}

interface LearnState extends PersistedLearn {
  /** Abre um princípio numa etapa, carregando o projeto correspondente no editor. */
  open: (principleId: string, step: LearnStep) => void;
  /** Recomeça o exercício do princípio atual do zero. */
  resetExercise: () => void;
  markDone: (principleId: string) => void;
}

function load(): PersistedLearn {
  const fallback: PersistedLearn = { principleId: 'slow-in-slow-out', step: 'see', done: [], work: {} };
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<PersistedLearn>) };
  } catch {
    return fallback;
  }
}

function save(state: PersistedLearn) {
  try {
    const { principleId, step, done, work } = state;
    localStorage.setItem(LEARN_KEY, JSON.stringify({ principleId, step, done, work }));
  } catch {
    // best-effort
  }
}

function stripStacks(project: Project): Project {
  return {
    ...project,
    frames: project.frames.map((f) => ({
      ...f,
      layers: f.layers.map((l) => ({ ...l, undoStack: [], redoStack: [] })),
    })),
  };
}

export function exampleProject(principleId: string): Project | null {
  const principle = ANIMATION_PRINCIPLES.find((p) => p.id === principleId);
  if (!principle) return null;
  return getCustomPrinciple(principleId) || principle.generateProject();
}

export const useLearn = create<LearnState>((set, get) => ({
  ...load(),

  open: (principleId, step) => {
    const prev = get();
    const app = useStore.getState();
    const work = { ...prev.work };
    // Guarda o exercício em andamento antes de trocar o que está no editor
    if (prev.step !== 'see' && EXERCISES[prev.principleId]) {
      work[prev.principleId] = stripStacks(app.project);
    }

    const exercise = EXERCISES[principleId];
    let project: Project | null;
    if (step === 'see' || !exercise) {
      project = exampleProject(principleId);
    } else {
      project = work[principleId] ?? exercise.createProject();
    }
    if (project) {
      app.setProject(project);
      app.setCanvasSize({ width: project.width, height: project.height });
      app.setSelection(null);
      app.setPlayback({
        isPlaying: step !== 'do',
        currentTime: 0,
        loop: true,
        pingPong: step === 'compare',
        speed: step === 'compare' ? 0.5 : 1,
      });
      if (step === 'do') app.setTool('select');
      // Na etapa Ver os exemplos têm vários objetos numa só camada: a análise confundiria
      app.setShowMotionPath(step !== 'see');
      app.setShowInbetweenPanel(step === 'do' && !!exercise);
      app.requestFitView();
    }

    const next = { ...prev, principleId, step, work };
    set(next);
    save(next);
  },

  resetExercise: () => {
    const { principleId, step } = get();
    const exercise = EXERCISES[principleId];
    if (!exercise) return;
    const work = { ...get().work };
    delete work[principleId];
    const project = exercise.createProject();
    useStore.getState().setProject(project);
    useStore.getState().setPlayback({ isPlaying: false, currentTime: 0 });
    const next = { ...get(), work, step: step === 'see' ? 'do' : step };
    set(next);
    save(next);
  },

  markDone: (principleId) => {
    if (get().done.includes(principleId)) return;
    const next = { ...get(), done: [...get().done, principleId] };
    set(next);
    save(next);
  },
}));

// O trabalho do exercício também vai para o mapa a cada mudança (debounced),
// para sobreviver a um recarregamento da página no meio da etapa "Fazer".
if (typeof window !== 'undefined') {
  let timer: ReturnType<typeof setTimeout> | null = null;
  useStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    const learn = useLearn.getState();
    if (state.mode !== 'learn' || learn.step === 'see' || !EXERCISES[learn.principleId]) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const current = useLearn.getState();
      // A etapa ou o princípio podem ter mudado durante a espera
      if (useStore.getState().mode !== 'learn' || current.step === 'see' || !EXERCISES[current.principleId]) return;
      const work = { ...current.work, [current.principleId]: stripStacks(useStore.getState().project) };
      useLearn.setState({ work });
      save({ ...current, work });
    }, 1000);
  });
}

export function orderedPrinciples() {
  return LEARN_ORDER.map((id) => ANIMATION_PRINCIPLES.find((p) => p.id === id)).filter(
    (p): p is (typeof ANIMATION_PRINCIPLES)[number] => !!p
  );
}
