import type { Project } from '@/types';

const CUSTOM_PRINCIPLES_KEY = 'aniapp:custom_principles:v1';

export function getCustomPrinciplesMap(): Record<string, Project> {
  try {
    const raw = localStorage.getItem(CUSTOM_PRINCIPLES_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler exemplos customizados dos princípios:', err);
    return {};
  }
}

export function getCustomPrinciple(principleId: string): Project | null {
  const map = getCustomPrinciplesMap();
  return map[principleId] || null;
}

export function saveCustomPrinciple(principleId: string, project: Project): void {
  try {
    const map = getCustomPrinciplesMap();
    // Clona o projeto sem pilhas pesadas de undo/redo
    const cleanProject: Project = {
      ...project,
      updatedAt: Date.now(),
      frames: project.frames.map((f) => ({
        ...f,
        layers: f.layers.map((l) => ({ ...l, undoStack: [], redoStack: [] })),
      })),
    };
    map[principleId] = cleanProject;
    localStorage.setItem(CUSTOM_PRINCIPLES_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Erro ao salvar exemplo customizado:', err);
  }
}

export function deleteCustomPrinciple(principleId: string): void {
  try {
    const map = getCustomPrinciplesMap();
    if (map[principleId]) {
      delete map[principleId];
      localStorage.setItem(CUSTOM_PRINCIPLES_KEY, JSON.stringify(map));
    }
  } catch (err) {
    console.error('Erro ao remover exemplo customizado:', err);
  }
}
