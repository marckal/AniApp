import { useState } from 'react';
import { useStore } from '@/lib/store';
import {
  Brush,
  PenTool,
  Eraser,
  PaintBucket,
  Hand,
  MousePointer2,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Trash2,
  Square,
  Circle,
  Minus,
  Ruler,
  Magnet,
  X,
  Columns,
  Check,
} from 'lucide-react';

export default function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const zoom = useStore((s) => s.zoom);
  const setZoom = useStore((s) => s.setZoom);
  const showGrid = useStore((s) => s.showGrid);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const showRulers = useStore((s) => s.showRulers);
  const toggleRulers = useStore((s) => s.toggleRulers);
  const showGuides = useStore((s) => s.showGuides);
  const toggleGuides = useStore((s) => s.toggleGuides);
  const snapToGuides = useStore((s) => s.snapToGuides);
  const toggleSnapToGuides = useStore((s) => s.toggleSnapToGuides);
  const project = useStore((s) => s.project);
  const updateProject = useStore((s) => s.updateProject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const clearLayer = useStore((s) => s.clearLayer);

  const [showGridModal, setShowGridModal] = useState(false);

  const currentFrame = project.frames[project.currentFrameIndex];
  const currentLayer = currentFrame?.layers[project.currentLayerIndex];

  const tools = [
    { id: 'brush' as const, icon: Brush, label: 'Pincel Suave com Anti-Aliasing (B)' },
    { id: 'hard-brush' as const, icon: PenTool, label: 'Pincel Nítido sem Anti-Aliasing (N)' },
    { id: 'eraser' as const, icon: Eraser, label: 'Borracha (E)' },
    { id: 'fill' as const, icon: PaintBucket, label: 'Preencher (F)' },
    { id: 'rectangle' as const, icon: Square, label: 'Retângulo (R)' },
    { id: 'circle' as const, icon: Circle, label: 'Círculo (C)' },
    { id: 'line' as const, icon: Minus, label: 'Linha (L)' },
    { id: 'select' as const, icon: MousePointer2, label: 'Transformar / Selecionar (V)' },
    { id: 'move' as const, icon: Hand, label: 'Mover Tela (H)' },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-surface/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl select-none z-30">
      {/* Ferramentas de Desenho estilo Figma */}
      <div className="flex items-center gap-0.5">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              tool === t.id
                ? 'bg-primary text-text-inverse shadow-sm scale-105'
                : 'text-text-muted hover:text-text hover:bg-surface-light'
            }`}
            title={t.label}
          >
            <t.icon size={16} />
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Histórico / Edição */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => undo(project.currentFrameIndex, project.currentLayerIndex)}
          disabled={!currentLayer?.undoStack.length}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors disabled:opacity-30"
          title="Desfazer (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => redo(project.currentFrameIndex, project.currentLayerIndex)}
          disabled={!currentLayer?.redoStack.length}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors disabled:opacity-30"
          title="Refazer (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
        <button
          onClick={() => clearLayer(project.currentFrameIndex, project.currentLayerIndex)}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-surface-light transition-colors"
          title="Limpar Camada"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Exibição: Grade, Réguas, Guias */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={toggleGrid}
          onDoubleClick={() => setShowGridModal(true)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            showGrid
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface-light'
          }`}
          title="Grade / Grid (Clique: Alternar | Duplo-clique: Configurar Tamanho)"
        >
          <Grid3x3 size={16} />
        </button>
        <button
          onClick={toggleRulers}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            showRulers
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface-light'
          }`}
          title="Réguas (Ctrl+R)"
        >
          <Ruler size={16} />
        </button>
        <button
          onClick={toggleGuides}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            showGuides
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface-light'
          }`}
          title="Guias (Ctrl+;)"
        >
          <Columns size={16} />
        </button>
        <button
          onClick={toggleSnapToGuides}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            snapToGuides
              ? 'bg-primary/20 text-primary border border-primary/30 font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface-light'
          }`}
          title="Atração às Guias / Snap"
        >
          <Magnet size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Zoom */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setZoom(Math.max(zoom / 1.2, 0.05))}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors"
          title="Diminuir Zoom"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="px-2 h-9 rounded-xl flex items-center justify-center text-xs font-mono text-text-muted hover:text-text hover:bg-surface-light transition-colors"
          title="Resetar Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => setZoom(Math.min(zoom * 1.2, 10))}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors"
          title="Aumentar Zoom"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      {/* Modal de Configuração do Tamanho da Grade */}
      {showGridModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl p-5 w-72 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <Grid3x3 size={16} className="text-primary" />
                Tamanho da Grade
              </h4>
              <button
                onClick={() => setShowGridModal(false)}
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-text-muted block font-medium">Tamanho em Pixels:</label>
              <input
                type="number"
                min={4}
                max={500}
                value={project.gridSize || 50}
                onChange={(e) => updateProject({ gridSize: Math.max(4, Number(e.target.value)) })}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-primary"
              />
              <div className="grid grid-cols-3 gap-1 pt-1">
                {[10, 16, 24, 32, 50, 64].map((g) => (
                  <button
                    key={g}
                    onClick={() => updateProject({ gridSize: g })}
                    className={`py-1 rounded text-xs font-mono border transition-colors ${
                      (project.gridSize || 50) === g
                        ? 'border-primary bg-primary text-text-inverse font-bold'
                        : 'border-border text-text-muted hover:text-text hover:bg-surface-light'
                    }`}
                  >
                    {g}px
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowGridModal(false)}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Check size={14} />
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
