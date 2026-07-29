import { create } from 'zustand';
import type { Project, Frame, Layer, BrushSettings, Tool, PlaybackState, Theme, Stroke } from '@/types';
import { cloneStroke, transformStroke, translation } from '@/lib/geometry';

const PASTE_OFFSET = 16;

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function createDefaultLayer(): Layer {
  return {
    id: generateId(),
    name: 'Camada 1',
    visible: true,
    opacity: 1,
    strokes: [],
    undoStack: [],
    redoStack: [],
  };
}

function createDefaultFrame(): Frame {
  return {
    id: generateId(),
    layers: [createDefaultLayer()],
    duration: 1,
    easing: 'linear',
    customCurve: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }],
  };
}

function createDefaultProject(): Project {
  return {
    id: generateId(),
    name: 'Sem Título',
    width: 1920,
    height: 1080,
    fps: 24,
    gridSize: 50,
    frames: [createDefaultFrame()],
    currentFrameIndex: 0,
    currentLayerIndex: 0,
    backgroundColor: '#ffffff',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export interface Guides {
  x: number[]; // guias verticais (posição x no canvas)
  y: number[]; // guias horizontais (posição y no canvas)
}

interface AppState {
  project: Project;
  tool: Tool;
  brush: BrushSettings;
  playback: PlaybackState;
  zoom: number;
  pan: { x: number; y: number };
  canvasSize: { width: number; height: number };
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGuides: boolean;
  guides: Guides;
  selection: number[] | null; // índices dos traços selecionados na camada ativa
  clipboard: Stroke[] | null;
  onionSkinOpacity: number;
  theme: Theme;

  setProject: (project: Project) => void;
  updateProject: (updates: Partial<Project>) => void;
  setTool: (tool: Tool) => void;
  setBrush: (brush: Partial<BrushSettings>) => void;
  setPlayback: (playback: Partial<PlaybackState>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleSnapToGuides: () => void;
  addGuide: (axis: 'x' | 'y', position: number) => number;
  moveGuide: (axis: 'x' | 'y', index: number, position: number) => void;
  removeGuide: (axis: 'x' | 'y', index: number) => void;
  clearGuides: () => void;

  setSelection: (selection: number[] | null) => void;
  pushUndo: (frameIndex: number, layerIndex: number) => void;
  replaceStrokes: (frameIndex: number, layerIndex: number, strokes: Stroke[], selection?: number[] | null) => void;
  setStrokesLive: (frameIndex: number, layerIndex: number, strokes: Stroke[]) => void;
  deleteSelection: () => void;
  copySelection: () => number;
  cutSelection: () => number;
  pasteClipboard: () => void;
  setOnionSkinOpacity: (opacity: number) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  addFrame: () => void;
  deleteFrame: (index: number) => void;
  duplicateFrame: (index: number) => void;
  moveFrame: (from: number, to: number) => void;
  setCurrentFrame: (index: number) => void;
  updateFrame: (index: number, updates: Partial<Frame>) => void;

  addLayer: () => void;
  deleteLayer: (index: number) => void;
  moveLayer: (from: number, to: number) => void;
  toggleLayerVisibility: (index: number) => void;
  setLayerOpacity: (index: number, opacity: number) => void;
  setCurrentLayer: (index: number) => void;
  renameLayer: (index: number, name: string) => void;

  addStroke: (frameIndex: number, layerIndex: number, stroke: import('@/types').Stroke) => void;
  undo: (frameIndex: number, layerIndex: number) => void;
  redo: (frameIndex: number, layerIndex: number) => void;
  clearLayer: (frameIndex: number, layerIndex: number) => void;

  newProject: (width: number, height: number, fps?: number, backgroundColor?: string) => void;
  saveProject: () => string;
  loadProject: (json: string) => void;
}

// ---- Persistência de sessão (localStorage, sobrevive ao fechamento) ----
const STORAGE_KEY = 'aniapp:autosave:v1';
const SAVE_DEBOUNCE_MS = 800;

interface PersistedState {
  project: Project;
  brush: BrushSettings;
  tool: Tool;
  guides: Guides;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGuides: boolean;
  zoom: number;
  pan: { x: number; y: number };
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

function loadPersisted(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedState;
    if (!data.project?.frames?.length) return null;
    // garante stacks vazios e estrutura válida
    return { ...data, project: stripStacks(data.project) };
  } catch {
    return null;
  }
}

export const useStore = create<AppState>((set, get) => {
  const persisted = typeof window !== 'undefined' ? loadPersisted() : null;

  return {
  project: persisted?.project ?? createDefaultProject(),
  tool: persisted?.tool ?? 'brush',
  brush: persisted?.brush ?? {
    size: 8,
    opacity: 1,
    color: '#000000',
    hardness: 0.8,
    filled: false,
    fillColor: '#ffffff',
    fillType: 'solid',
    gradientColors: ['#7c5cff', '#00c8ff'],
    ditherPattern: 'bayer4x4',
  },
  playback: {
    isPlaying: false,
    currentTime: 0,
    loop: true,
    onionSkin: true,
    onionSkinFrames: 2,
  },
  zoom: persisted?.zoom ?? 1,
  pan: persisted?.pan ?? { x: 0, y: 0 },
  canvasSize: { width: 1920, height: 1080 },
  showGrid: persisted?.showGrid ?? false,
  showRulers: persisted?.showRulers ?? true,
  showGuides: persisted?.showGuides ?? true,
  snapToGuides: persisted?.snapToGuides ?? true,
  guides: persisted?.guides ?? { x: [], y: [] },
  selection: null,
  clipboard: null,
  onionSkinOpacity: 0.3,
  theme: 'light',

  setProject: (project) => set({ project }),
  updateProject: (updates) =>
    set((state) => ({
      project: { ...state.project, ...updates, updatedAt: Date.now() },
    })),
  setTool: (tool) => set({ tool }),
  setBrush: (brush) => set((state) => ({ brush: { ...state.brush, ...brush } })),
  setPlayback: (playback) =>
    set((state) => ({ playback: { ...state.playback, ...playback } })),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.05), 10) }),
  setPan: (pan) => set({ pan }),
  setCanvasSize: (canvasSize) => set({ canvasSize }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleRulers: () => set((state) => ({ showRulers: !state.showRulers })),
  toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
  toggleSnapToGuides: () => set((state) => ({ snapToGuides: !state.snapToGuides })),

  addGuide: (axis, position) => {
    let index = -1;
    set((state) => {
      const list = [...state.guides[axis], Math.round(position)].sort((a, b) => a - b);
      index = list.indexOf(Math.round(position));
      return { guides: { ...state.guides, [axis]: list } };
    });
    return index;
  },

  moveGuide: (axis, index, position) =>
    set((state) => {
      const list = [...state.guides[axis]];
      if (index < 0 || index >= list.length) return state;
      list[index] = Math.round(position);
      return { guides: { ...state.guides, [axis]: list } };
    }),

  removeGuide: (axis, index) =>
    set((state) => {
      const list = state.guides[axis].filter((_, i) => i !== index);
      return { guides: { ...state.guides, [axis]: list } };
    }),

  clearGuides: () => set({ guides: { x: [], y: [] } }),

  setSelection: (selection) => set({ selection }),

  pushUndo: (frameIndex, layerIndex) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      const layer = { ...layers[layerIndex] };
      layer.undoStack = [...layer.undoStack, [...layer.strokes]];
      layer.redoStack = [];
      layers[layerIndex] = layer;
      frame.layers = layers;
      frames[frameIndex] = frame;
      return { project: { ...state.project, frames, updatedAt: Date.now() } };
    }),

  // Substitui os traços de uma camada como operação undoable
  replaceStrokes: (frameIndex, layerIndex, strokes, selection = null) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      const layer = { ...layers[layerIndex] };
      layer.undoStack = [...layer.undoStack, [...layer.strokes]];
      layer.redoStack = [];
      layer.strokes = strokes;
      layers[layerIndex] = layer;
      frame.layers = layers;
      frames[frameIndex] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
        selection,
      };
    }),

  // Atualização ao vivo (durante arrasto) — sem empurrar undo
  setStrokesLive: (frameIndex, layerIndex, strokes) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      layers[layerIndex] = { ...layers[layerIndex], strokes };
      frame.layers = layers;
      frames[frameIndex] = frame;
      return { project: { ...state.project, frames, updatedAt: Date.now() } };
    }),

  deleteSelection: () =>
    set((state) => {
      if (!state.selection || state.selection.length === 0) return state;
      const fi = state.project.currentFrameIndex;
      const li = state.project.currentLayerIndex;
      const layer = state.project.frames[fi]?.layers[li];
      if (!layer) return state;
      const toRemove = new Set(state.selection);
      const strokes = layer.strokes.filter((_, i) => !toRemove.has(i));
      const frames = [...state.project.frames];
      const frame = { ...frames[fi] };
      const layers = [...frame.layers];
      layers[li] = {
        ...layer,
        undoStack: [...layer.undoStack, [...layer.strokes]],
        redoStack: [],
        strokes,
      };
      frame.layers = layers;
      frames[fi] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
        selection: null,
      };
    }),

  // Copia a seleção; sem seleção, copia a camada inteira
  copySelection: () => {
    const state = get();
    const layer =
      state.project.frames[state.project.currentFrameIndex]?.layers[
        state.project.currentLayerIndex
      ];
    if (!layer) return 0;
    const indices =
      state.selection && state.selection.length > 0
        ? state.selection
        : layer.strokes.map((_, i) => i);
    const copied = indices
      .filter((i) => i >= 0 && i < layer.strokes.length)
      .map((i) => cloneStroke(layer.strokes[i]));
    if (copied.length === 0) return 0;
    set({ clipboard: copied });
    return copied.length;
  },

  cutSelection: () => {
    const state = get();
    const hadSelection = !!state.selection && state.selection.length > 0;
    const n = state.copySelection();
    // Recortar só remove quando havia seleção explícita;
    // sem seleção, Ctrl+X equivale a copiar a camada (não a esvazia)
    if (n > 0 && hadSelection) state.deleteSelection();
    return n;
  },

  pasteClipboard: () =>
    set((state) => {
      if (!state.clipboard || state.clipboard.length === 0) return state;
      const fi = state.project.currentFrameIndex;
      const li = state.project.currentLayerIndex;
      const layer = state.project.frames[fi]?.layers[li];
      if (!layer) return state;

      const m = translation(PASTE_OFFSET, PASTE_OFFSET);
      const pasted = state.clipboard.map((s) => transformStroke(cloneStroke(s), m));
      const base = layer.strokes.length;
      const strokes = [...layer.strokes, ...pasted];
      const newSelection = pasted.map((_, k) => base + k);

      const frames = [...state.project.frames];
      const frame = { ...frames[fi] };
      const layers = [...frame.layers];
      layers[li] = {
        ...layer,
        undoStack: [...layer.undoStack, [...layer.strokes]],
        redoStack: [],
        strokes,
      };
      frame.layers = layers;
      frames[fi] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
        selection: newSelection,
      };
    }),
  setOnionSkinOpacity: (onionSkinOpacity) => set({ onionSkinOpacity }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  addFrame: () =>
    set((state) => {
      const newFrame = createDefaultFrame();
      const frames = [...state.project.frames];
      const idx = state.project.currentFrameIndex + 1;
      frames.splice(idx, 0, newFrame);
      return {
        project: {
          ...state.project,
          frames,
          currentFrameIndex: idx,
          updatedAt: Date.now(),
        },
      };
    }),

  deleteFrame: (index) =>
    set((state) => {
      if (state.project.frames.length <= 1) return state;
      const frames = state.project.frames.filter((_, i) => i !== index);
      let currentFrameIndex = state.project.currentFrameIndex;
      if (index < currentFrameIndex) {
        currentFrameIndex--;
      } else if (index === currentFrameIndex) {
        currentFrameIndex = Math.min(currentFrameIndex, frames.length - 1);
      }
      return {
        project: {
          ...state.project,
          frames,
          currentFrameIndex,
          updatedAt: Date.now(),
        },
      };
    }),

  duplicateFrame: (index) =>
    set((state) => {
      const frame = state.project.frames[index];
      const newFrame: Frame = {
        ...frame,
        id: generateId(),
        layers: frame.layers.map((l) => ({
          ...l,
          id: generateId(),
          strokes: l.strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) })),
          undoStack: [],
          redoStack: [],
        })),
      };
      const frames = [...state.project.frames];
      frames.splice(index + 1, 0, newFrame);
      return {
        project: {
          ...state.project,
          frames,
          currentFrameIndex: index + 1,
          updatedAt: Date.now(),
        },
      };
    }),

  moveFrame: (from, to) =>
    set((state) => {
      const frames = [...state.project.frames];
      const [moved] = frames.splice(from, 1);
      frames.splice(to, 0, moved);
      return {
        project: {
          ...state.project,
          frames,
          currentFrameIndex: to,
          updatedAt: Date.now(),
        },
      };
    }),

  setCurrentFrame: (index) =>
    set((state) => ({
      project: { ...state.project, currentFrameIndex: index },
      selection: null,
    })),

  updateFrame: (index, updates) =>
    set((state) => {
      const frames = [...state.project.frames];
      frames[index] = { ...frames[index], ...updates };
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  addLayer: () =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      const count = frame.layers.length + 1;
      const newLayer = createDefaultLayer();
      newLayer.name = `Camada ${count}`;
      frame.layers = [...frame.layers, newLayer];
      return {
        project: {
          ...state.project,
          frames,
          currentLayerIndex: frame.layers.length - 1,
          updatedAt: Date.now(),
        },
      };
    }),

  deleteLayer: (index) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      if (frame.layers.length <= 1) return state;
      frame.layers = frame.layers.filter((_, i) => i !== index);
      let currentLayerIndex = state.project.currentLayerIndex;
      if (index < currentLayerIndex) {
        currentLayerIndex--;
      } else if (index === currentLayerIndex) {
        currentLayerIndex = Math.min(currentLayerIndex, frame.layers.length - 1);
      }
      return {
        project: {
          ...state.project,
          frames,
          currentLayerIndex,
          updatedAt: Date.now(),
        },
      };
    }),

  moveLayer: (from, to) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      const layers = [...frame.layers];
      const [moved] = layers.splice(from, 1);
      layers.splice(to, 0, moved);
      frame.layers = layers;
      return {
        project: {
          ...state.project,
          frames,
          currentLayerIndex: to,
          updatedAt: Date.now(),
        },
      };
    }),

  toggleLayerVisibility: (index) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      frame.layers[index].visible = !frame.layers[index].visible;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  setLayerOpacity: (index, opacity) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      frame.layers[index].opacity = opacity;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  setCurrentLayer: (index) =>
    set((state) => ({
      project: { ...state.project, currentLayerIndex: index },
      selection: null,
    })),

  renameLayer: (index, name) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = frames[state.project.currentFrameIndex];
      frame.layers[index].name = name;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  addStroke: (frameIndex, layerIndex, stroke) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      const layer = { ...layers[layerIndex] };
      layer.undoStack = [...layer.undoStack, [...layer.strokes]];
      layer.redoStack = [];
      layer.strokes = [...layer.strokes, stroke];
      layers[layerIndex] = layer;
      frame.layers = layers;
      frames[frameIndex] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  undo: (frameIndex, layerIndex) =>
    set((state) => {
      const frames = [...state.project.frames];
      const layer = frames[frameIndex].layers[layerIndex];
      if (layer.undoStack.length === 0) return state;
      const prev = layer.undoStack[layer.undoStack.length - 1];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      layers[layerIndex] = {
        ...layer,
        undoStack: layer.undoStack.slice(0, -1),
        redoStack: [...layer.redoStack, [...layer.strokes]],
        strokes: prev,
      };
      frame.layers = layers;
      frames[frameIndex] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  redo: (frameIndex, layerIndex) =>
    set((state) => {
      const frames = [...state.project.frames];
      const layer = frames[frameIndex].layers[layerIndex];
      if (layer.redoStack.length === 0) return state;
      const next = layer.redoStack[layer.redoStack.length - 1];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      layers[layerIndex] = {
        ...layer,
        redoStack: layer.redoStack.slice(0, -1),
        undoStack: [...layer.undoStack, [...layer.strokes]],
        strokes: next,
      };
      frame.layers = layers;
      frames[frameIndex] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  clearLayer: (frameIndex, layerIndex) =>
    set((state) => {
      const frames = [...state.project.frames];
      const frame = { ...frames[frameIndex] };
      const layers = [...frame.layers];
      const layer = { ...layers[layerIndex] };
      layer.undoStack = [...layer.undoStack, [...layer.strokes]];
      layer.redoStack = [];
      layer.strokes = [];
      layers[layerIndex] = layer;
      frame.layers = layers;
      frames[frameIndex] = frame;
      return {
        project: { ...state.project, frames, updatedAt: Date.now() },
      };
    }),

  newProject: (width, height, fps = 24, backgroundColor = '#ffffff') =>
    set(() => ({
      project: {
        ...createDefaultProject(),
        width,
        height,
        fps,
        backgroundColor,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      zoom: 1,
      pan: { x: 0, y: 0 },
      canvasSize: { width, height },
      selection: null,
      guides: { x: [], y: [] },
    })),

  saveProject: () => {
    const state = get();
    return JSON.stringify(state.project);
  },

  loadProject: (json) => {
    try {
      const project: Project = JSON.parse(json);
      set({
        project: stripStacks(project),
        canvasSize: { width: project.width, height: project.height },
        selection: null,
        clipboard: null,
      });
    } catch (e) {
      console.error('Falha ao carregar projeto:', e);
    }
  },
  };
});

// ---- Salvamento automático (debounced) ----
// Escolha: localStorage (e não sessionStorage) para o trabalho sobreviver ao
// fechamento acidental da aba/janela; o arquivo .ani continua sendo o
// salvamento explícito e portátil.
if (typeof window !== 'undefined') {
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  useStore.subscribe((state) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const data: PersistedState = {
          project: stripStacks(state.project),
          brush: state.brush,
          tool: state.tool,
          guides: state.guides,
          showGrid: state.showGrid,
          showRulers: state.showRulers,
          showGuides: state.showGuides,
          snapToGuides: state.snapToGuides,
          zoom: state.zoom,
          pan: state.pan,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // quota excedida ou JSON inválido — autosave é best-effort
      }
    }, SAVE_DEBOUNCE_MS);
  });
}
