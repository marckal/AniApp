import { useStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  GripVertical,
  Sliders,
  X,
  Check,
} from 'lucide-react';
import type { Stroke } from '@/types';

function LayerThumbnail({
  strokes,
  width,
  height,
}: {
  strokes: Stroke[];
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / width;
    const scaleY = canvas.height / height;
    ctx.save();
    ctx.scale(scaleX, scaleY);
    for (const s of strokes) {
      if (s.points.length > 0) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.max(1, s.size);
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }, [strokes, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={44}
      height={26}
      className="rounded border border-border bg-background/60 flex-shrink-0"
    />
  );
}

export default function LayerPanel() {
  const project = useStore((s) => s.project);
  const addLayer = useStore((s) => s.addLayer);
  const deleteLayer = useStore((s) => s.deleteLayer);
  const moveLayer = useStore((s) => s.moveLayer);
  const toggleLayerVisibility = useStore((s) => s.toggleLayerVisibility);
  const setLayerOpacity = useStore((s) => s.setLayerOpacity);
  const setCurrentLayer = useStore((s) => s.setCurrentLayer);
  const renameLayer = useStore((s) => s.renameLayer);

  const currentFrame = project.frames[project.currentFrameIndex];
  const [editingName, setEditingName] = useState<string | null>(null);
  const [activeSettingsIndex, setActiveSettingsIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      moveLayer(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-60 select-none z-10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-primary" />
          <h3 className="text-xs font-bold text-text uppercase tracking-wider">
            Camadas
          </h3>
        </div>
        <button
          onClick={addLayer}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary text-text-inverse hover:bg-primary-hover transition-colors font-bold shadow-sm"
          title="Nova Camada"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {[...currentFrame.layers].reverse().map((layer, reversedIndex) => {
          const index = currentFrame.layers.length - 1 - reversedIndex;
          const isActive = index === project.currentLayerIndex;

          return (
            <div
              key={layer.id}
              draggable
              onDragStart={handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(index)}
              onClick={() => setCurrentLayer(index)}
              onDoubleClick={() => setActiveSettingsIndex(index)}
              className={`group rounded-xl border p-2 transition-all cursor-pointer ${
                isActive
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                  : 'border-border hover:border-text-muted bg-surface-light'
              } ${draggedIndex === index ? 'opacity-40 border-dashed border-primary' : ''}`}
            >
              <div className="flex items-center gap-1.5">
                <GripVertical size={12} className="text-text-muted/40 group-hover:text-text-muted transition-colors cursor-grab" />

                {/* Thumbnail da Camada */}
                <LayerThumbnail
                  strokes={layer.strokes}
                  width={project.width}
                  height={project.height}
                />

                {/* Visibilidade */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayerVisibility(index);
                  }}
                  className="text-text-muted hover:text-text transition-colors p-0.5"
                  title={layer.visible ? 'Ocultar camada' : 'Exibir camada'}
                >
                  {layer.visible ? <Eye size={13} /> : <EyeOff size={13} className="text-accent-red" />}
                </button>

                {/* Nome da Camada */}
                {editingName === layer.id ? (
                  <input
                    autoFocus
                    className="flex-1 bg-surface text-xs text-text border border-primary rounded px-1 outline-none font-medium"
                    defaultValue={layer.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renameLayer(index, e.target.value || layer.name);
                      setEditingName(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameLayer(index, e.currentTarget.value || layer.name);
                        setEditingName(null);
                      }
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingName(layer.id);
                    }}
                    className="flex-1 text-xs text-text font-medium truncate"
                  >
                    {layer.name}
                  </span>
                )}

                {/* Ações Rápidas */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSettingsIndex(index);
                    }}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-primary transition-colors"
                    title="Configurações e Opacidade da Camada (Duplo Clique)"
                  >
                    <Sliders size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(index, index + 1);
                    }}
                    disabled={index >= currentFrame.layers.length - 1}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowUp size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      moveLayer(index, index - 1);
                    }}
                    disabled={index <= 0}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowDown size={10} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLayer(index);
                    }}
                    disabled={currentFrame.layers.length <= 1}
                    className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-surface disabled:opacity-30"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              {/* Slider de Opacidade na própria camada */}
              <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-border/40">
                <span className="text-[9px] font-mono text-text-muted">Opac:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={layer.opacity * 100}
                  onChange={(e) => setLayerOpacity(index, Number(e.target.value) / 100)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 accent-primary h-1 bg-surface rounded appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono text-primary font-bold w-7 text-right">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Diálogo de Propriedades e Opacidade da Camada (Duplo Clique) */}
      {activeSettingsIndex !== null && currentFrame.layers[activeSettingsIndex] && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl p-5 w-80 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <Sliders size={16} className="text-primary" />
                Opções da Camada
              </h4>
              <button
                onClick={() => setActiveSettingsIndex(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light"
              >
                <X size={14} />
              </button>
            </div>

            {/* Nome da camada */}
            <div className="space-y-1">
              <label className="text-xs text-text-muted block font-medium">Nome da Camada:</label>
              <input
                type="text"
                value={currentFrame.layers[activeSettingsIndex].name}
                onChange={(e) => renameLayer(activeSettingsIndex, e.target.value)}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-1.5 text-xs text-text font-medium focus:outline-none focus:border-primary"
              />
            </div>

            {/* Controle Avançado de Opacidade */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-text-muted font-medium">Opacidade da Camada:</label>
                <span className="text-xs font-mono text-primary font-bold">
                  {Math.round(currentFrame.layers[activeSettingsIndex].opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={currentFrame.layers[activeSettingsIndex].opacity * 100}
                onChange={(e) => setLayerOpacity(activeSettingsIndex, Number(e.target.value) / 100)}
                className="w-full accent-primary h-2 bg-surface-light rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-muted font-mono">
                <span>0% (Transparente)</span>
                <span>50%</span>
                <span>100% (Opaco)</span>
              </div>
            </div>

            <button
              onClick={() => setActiveSettingsIndex(null)}
              className="w-full py-2 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
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
