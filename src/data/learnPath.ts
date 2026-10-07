import type { Frame, Layer, Project, Stroke } from '@/types';
import type { MotionAnalysis } from '@/lib/motion';
import { layerCenter } from '@/lib/motion';

/** Ordem pedagógica: do tempo e espaçamento até atuação e apelo. */
export const LEARN_ORDER = [
  'timing-spacing',
  'slow-in-slow-out',
  'arcs',
  'squash-stretch',
  'anticipation',
  'straight-ahead-pose-to-pose',
  'follow-through-overlapping',
  'secondary-action',
  'staging',
  'exaggeration',
  'solid-drawing',
  'appeal',
];

export const GLOSSARY: [string, string][] = [
  ['Keyframe (K)', 'pose principal que define a ação.'],
  ['Breakdown (B)', 'pose de passagem que define o caminho entre as chaves.'],
  ['Intermediário (I)', 'quadros de transição entre as poses.'],
  ['Espaçamento', 'distância que o objeto percorre de um quadro para o outro.'],
  ['Timing', 'quantos quadros (ou segundos) a ação dura.'],
];

export interface ExerciseCheck {
  id: string;
  label: string;
  done: boolean;
  /** Dica mostrada enquanto o item não foi cumprido. */
  hint: string;
}

export interface Exercise {
  intro: string;
  targetSeconds: [number, number];
  createProject: () => Project;
  evaluate: (project: Project, analysis: MotionAnalysis) => ExerciseCheck[];
}

function genId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function circle(cx: number, cy: number, r: number, fill: string): Stroke {
  const start = { x: cx - r, y: cy - r };
  const end = { x: cx + r, y: cy + r };
  return {
    tool: 'circle',
    color: '#000000',
    size: 5,
    opacity: 1,
    filled: true,
    fillColor: fill,
    startPoint: start,
    endPoint: end,
    points: [start, { x: end.x, y: start.y }, end, { x: start.x, y: end.y }],
  };
}

function line(x1: number, y1: number, x2: number, y2: number, color: string, size: number): Stroke {
  const start = { x: x1, y: y1 };
  const end = { x: x2, y: y2 };
  return { tool: 'line', color, size, opacity: 1, startPoint: start, endPoint: end, points: [start, end] };
}

function layer(name: string, strokes: Stroke[]): Layer {
  return { id: genId(), name, visible: true, opacity: 1, strokes, undoStack: [], redoStack: [] };
}

// ---- Exercício: Slow In & Slow Out ----

const GROUND_Y = 820;
const BALL_R = 55;
const A = { x: 360, y: GROUND_Y - BALL_R - 6 };
const B = { x: 1560, y: GROUND_Y - BALL_R - 6 };

function scenery(): Stroke[] {
  return [
    line(160, GROUND_Y, 1760, GROUND_Y, '#94a3b8', 6),
    // marcas no chão para as posições A e B
    line(A.x, GROUND_Y + 14, A.x, GROUND_Y + 40, '#0077b6', 6),
    line(B.x, GROUND_Y + 14, B.x, GROUND_Y + 40, '#0077b6', 6),
  ];
}

function poseFrame(kind: Frame['kind'], ball: Stroke[]): Frame {
  return {
    id: genId(),
    layers: [layer('Cenário', scenery()), layer('Bola', ball)],
    duration: 1,
    easing: 'linear',
    customCurve: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }],
    kind,
  };
}

const BALL_LAYER = 1;

const slowInSlowOut: Exercise = {
  intro:
    'A bola salta de A até B em cerca de 1 segundo. Faça ela sair devagar, acelerar e chegar devagar, descrevendo um arco.',
  targetSeconds: [0.75, 1.5],
  createProject: () => ({
    id: genId(),
    name: 'Exercício · Slow In & Slow Out',
    width: 1920,
    height: 1080,
    fps: 12,
    gridSize: 50,
    frames: [
      poseFrame('key', [circle(A.x, A.y, BALL_R, '#f5c518')]),
      // O breakdown começa no chão, no meio do caminho: o aluno o leva ao topo do arco
      poseFrame('breakdown', [circle((A.x + B.x) / 2, A.y, BALL_R, '#f5c518')]),
      poseFrame('key', [circle(B.x, B.y, BALL_R, '#f5c518')]),
    ],
    currentFrameIndex: 1,
    currentLayerIndex: BALL_LAYER,
    backgroundColor: '#f8fafc',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }),
  evaluate: (project, analysis) => {
    const frames = project.frames;
    const keys = frames.map((f, i) => (f.kind !== 'inbetween' ? i : -1)).filter((i) => i >= 0);
    const bdIndex = frames.findIndex((f) => f.kind === 'breakdown');
    const first = layerCenter(frames[0]?.layers[BALL_LAYER]);
    const last = layerCenter(frames[frames.length - 1]?.layers[BALL_LAYER]);
    const bd = bdIndex >= 0 ? layerCenter(frames[bdIndex].layers[BALL_LAYER]) : null;

    const raised = !!(bd && first && last && bd.y < Math.min(first.y, last.y) - 150);

    // Intermediários nos dois trechos (antes e depois do breakdown)
    const between = (from: number, to: number) =>
      frames.slice(from + 1, to).filter((f) => f.kind === 'inbetween').length;
    const inbetweens =
      bdIndex > 0 && keys.length >= 3 && between(0, bdIndex) >= 2 && between(bdIndex, frames.length - 1) >= 2;

    // Slow out em A e slow in em B: os primeiros e últimos passos são curtos
    const sp = analysis.speeds;
    const max = Math.max(0, ...sp);
    const slow = sp.length >= 4 && max > 0 && sp[0] < max * 0.6 && sp[sp.length - 1] < max * 0.6;

    const [minS, maxS] = slowInSlowOut.targetSeconds;
    const timing = analysis.seconds >= minS && analysis.seconds <= maxS;

    return [
      {
        id: 'raised',
        label: 'Levar o breakdown (B) ao topo do arco',
        done: raised,
        hint: 'Vá ao quadro marcado com B, use a ferramenta Selecionar (V) e arraste a bola bem para cima.',
      },
      {
        id: 'inbetweens',
        label: 'Gerar intermediários nos dois trechos',
        done: inbetweens,
        hint: 'Abra "Intermediários": gere do quadro A até o B e depois do B até a chave final.',
      },
      {
        id: 'slow',
        label: 'Sair devagar de A e chegar devagar em B',
        done: slow,
        hint: 'Use Ease In no primeiro trecho (saída lenta) e Ease Out no segundo (chegada lenta).',
      },
      {
        id: 'timing',
        label: `Duração entre ${String(minS).replace('.', ',')} s e ${String(maxS).replace('.', ',')} s`,
        done: timing,
        hint: `Hoje: ${analysis.seconds.toFixed(2).replace('.', ',')} s. Ajuste o número de intermediários ou o FPS.`,
      },
    ];
  },
};

export const EXERCISES: Record<string, Exercise> = {
  'slow-in-slow-out': slowInSlowOut,
};
