import { useStore } from '@/lib/store';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Trash2,
  Clock,
  GripVertical,
  Settings2,
  Play,
  Pause,
  Square,
  Repeat,
  Gauge,
  X,
  Check,
} from 'lucide-react';
import { EASING_OPTIONS } from '@/lib/easing';
import type { EaseType } from '@/types';

export default function Timeline() {
  const project = useStore((s) => s.project);
  const updateProject = useStore((s) => s.updateProject);
  const playback = useStore((s) => s.playback);
  const setPlayback = useStore((s) => s.setPlayback);
  const setCurrentFrame = useStore((s) => s.setCurrentFrame);
  const addFrame = useStore((s) => s.addFrame);
  const deleteFrame = useStore((s) => s.deleteFrame);
  const duplicateFrame = useStore((s) => s.duplicateFrame);
  const moveFrame = useStore((s) => s.moveFrame);
  const updateFrame = useStore((s) => s.updateFrame);
  const onionSkinOpacity = useStore((s) => s.onionSkinOpacity);
  const setOnionSkinOpacity = useStore((s) => s.setOnionSkinOpacity);

  // Seleção múltipla de frames
  const [selectedIndices, setSelectedIndices] = useState<number[]>([project.currentFrameIndex]);
  const [showEasing, setShowEasing] = useState(false);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  
  // Modal de opções do frame
  const [activeSettingsFrame, setActiveSettingsFrame] = useState<number | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const currentFrame = project.frames[project.currentFrameIndex];
  const totalDuration = project.frames.reduce((sum, f) => sum + f.duration, 0);

  // Sincroniza seleção simples quando o frame atual muda por playback
  useEffect(() => {
    if (!selectedIndices.includes(project.currentFrameIndex)) {
      setSelectedIndices([project.currentFrameIndex]);
    }
  }, [project.currentFrameIndex]);

  // Playback loop
  useEffect(() => {
    if (!playback.isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const state = useStore.getState();
      const newTime = state.playback.currentTime + delta * state.project.fps;
      let accumulated = 0;
      let frameIdx = 0;

      for (let i = 0; i < state.project.frames.length; i++) {
        if (accumulated + state.project.frames[i].duration > newTime) {
          frameIdx = i;
          break;
        }
        accumulated += state.project.frames[i].duration;
      }

      const total = state.project.frames.reduce((sum, f) => sum + f.duration, 0);

      if (newTime >= total) {
        if (state.playback.loop) {
          setPlayback({ currentTime: 0 });
          setCurrentFrame(0);
          lastTimeRef.current = timestamp;
          animationFrameRef.current = requestAnimationFrame(loop);
        } else {
          setPlayback({ isPlaying: false, currentTime: total });
          return;
        }
      } else {
        setPlayback({ currentTime: newTime });
        if (frameIdx !== state.project.currentFrameIndex) {
          setCurrentFrame(frameIdx);
        }
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    lastTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playback.isPlaying]);

  const handlePlay = () => {
    setPlayback({ isPlaying: !playback.isPlaying });
  };

  const handleStop = () => {
    setPlayback({ isPlaying: false, currentTime: 0 });
    setCurrentFrame(0);
  };

  const handleToggleLoop = () => {
    setPlayback({ loop: !playback.loop });
  };

  // Seleção de frames com Shift e Ctrl/Cmd
  const handleFrameClick = (index: number, e: React.MouseEvent) => {
    setCurrentFrame(index);
    if (e.shiftKey && selectedIndices.length > 0) {
      const start = Math.min(selectedIndices[0], index);
      const end = Math.max(selectedIndices[0], index);
      const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedIndices(range);
    } else if (e.metaKey || e.ctrlKey) {
      if (selectedIndices.includes(index)) {
        if (selectedIndices.length > 1) {
          setSelectedIndices(selectedIndices.filter((i) => i !== index));
        }
      } else {
        setSelectedIndices([...selectedIndices, index].sort((a, b) => a - b));
      }
    } else {
      setSelectedIndices([index]);
    }
  };

  // Ações em Lote (Múltiplos Frames)
  const handleBatchDurationChange = (newDuration: number) => {
    selectedIndices.forEach((idx) => {
      updateFrame(idx, { duration: newDuration });
    });
  };

  const handleBatchDelete = () => {
    if (project.frames.length <= selectedIndices.length) return; // Mantém ao menos 1 frame
    // Deleta do maior pro menor índice para não desorganizar o array
    const sorted = [...selectedIndices].sort((a, b) => b - a);
    sorted.forEach((idx) => {
      deleteFrame(idx);
    });
    setSelectedIndices([0]);
  };

  const handleBatchDuplicate = () => {
    const sorted = [...selectedIndices].sort((a, b) => a - b);
    sorted.forEach((idx) => {
      duplicateFrame(idx);
    });
  };

  // Drag and Drop
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    setDraggedFrameIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedFrameIndex !== null && draggedFrameIndex !== targetIndex) {
      moveFrame(draggedFrameIndex, targetIndex);
    }
    setDraggedFrameIndex(null);
  };

  return (
    <div className="flex flex-col bg-surface border-t border-border h-52 select-none z-10 relative">
      {/* Playback controls + Timeline header */}
      <div className="relative flex items-center justify-between px-3 py-2 border-b border-border h-12">
        {/* Esquerda: Ações de quadros + Duração/Exposição em Lote */}
        <div className="flex items-center gap-2">
          <button
            onClick={addFrame}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-primary hover:bg-primary-hover text-text-inverse transition-colors font-semibold shadow-sm"
            title="Adicionar Novo Quadro em Branco (Ctrl+Shift+I)"
          >
            + Quadro
          </button>
          <button
            onClick={handleBatchDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-light hover:bg-surface border border-border text-text font-semibold transition-colors shadow-xs"
            title={`Duplicar Quadro (${selectedIndices.length} selecionado(s)) (Ctrl+D)`}
          >
            <Copy size={13} className="text-primary" />
            Duplicar Quadro
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={project.frames.length <= selectedIndices.length}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-surface-light border border-border disabled:opacity-30"
            title={`Excluir (${selectedIndices.length} selecionado(s))`}
          >
            <Trash2 size={14} />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Stepper de Duração / Exposição (Aplica aos selecionados) */}
          <div className="flex items-center gap-1 bg-surface-light border border-border rounded-lg px-2 py-1" title="Alterar duração de exposição (holds em frames) para a seleção">
            <span className="text-[10px] text-text-muted font-medium">Exposição:</span>
            <button
              onClick={() => handleBatchDurationChange(Math.max(1, (currentFrame?.duration || 1) - 1))}
              className="w-5 h-5 rounded flex items-center justify-center text-xs text-text-muted hover:text-text hover:bg-surface font-bold"
            >
              -
            </button>
            <span className="text-xs font-mono text-primary font-bold px-1 min-w-[24px] text-center">
              {currentFrame?.duration || 1}f
            </span>
            <button
              onClick={() => handleBatchDurationChange(Math.min(100, (currentFrame?.duration || 1) + 1))}
              className="w-5 h-5 rounded flex items-center justify-center text-xs text-text-muted hover:text-text hover:bg-surface font-bold"
            >
              +
            </button>
          </div>

          {selectedIndices.length > 1 && (
            <span className="text-[10px] bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full border border-primary/30">
              {selectedIndices.length} quadros selecionados
            </span>
          )}
        </div>

        {/* Centro: Controles de Playback Centralizados */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-surface-light/80 border border-border px-2.5 py-1 rounded-xl shadow-sm">
          <button
            onClick={() => setCurrentFrame(Math.max(0, project.currentFrameIndex - 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            title="Quadro Anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={handlePlay}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              playback.isPlaying
                ? 'bg-accent-red text-white shadow-sm scale-105'
                : 'bg-primary text-text-inverse hover:bg-primary-hover shadow-sm'
            }`}
            title={playback.isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
          >
            {playback.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={handleStop}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            title="Parar"
          >
            <Square size={12} />
          </button>

          <button
            onClick={handleToggleLoop}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              playback.loop
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
            title="Repetir (Loop)"
          >
            <Repeat size={14} />
          </button>

          <button
            onClick={() =>
              setCurrentFrame(Math.min(project.frames.length - 1, project.currentFrameIndex + 1))
            }
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface transition-colors"
            title="Próximo Quadro"
          >
            <ChevronRight size={16} />
          </button>

          <div className="w-px h-4 bg-border mx-0.5" />

          <span className="text-xs font-mono text-text font-semibold min-w-[64px] text-center">
            {project.currentFrameIndex + 1} / {project.frames.length}
          </span>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Seletor de Frame Rate (FPS) Global junto ao Playback */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg px-2 py-0.5" title="Alterar taxa de quadros (FPS)">
            <Gauge size={12} className="text-primary" />
            <select
              value={project.fps}
              onChange={(e) => updateProject({ fps: Number(e.target.value) })}
              className="bg-transparent text-xs font-mono text-text focus:outline-none cursor-pointer"
            >
              <option value={8}>8 fps</option>
              <option value={12}>12 fps</option>
              <option value={24}>24 fps</option>
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </div>
        </div>

        {/* Direita: Onion Skin & Easing */}
        <div className="flex items-center gap-2">
          {/* Easing */}
          <div className="relative">
            <button
              onClick={() => setShowEasing(!showEasing)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                showEasing
                  ? 'bg-primary text-text-inverse border-primary'
                  : 'text-text-muted border-border hover:text-text hover:bg-surface-light'
              }`}
            >
              <Clock size={12} />
              <span>
                {EASING_OPTIONS.find((e) => e.value === currentFrame?.easing)?.label || 'Linear'}
              </span>
            </button>
            {showEasing && (
              <div className="absolute bottom-full mb-1 right-0 bg-surface border border-border rounded-xl p-2 shadow-2xl z-50 w-52">
                <div className="text-[10px] text-text-muted mb-1 font-semibold uppercase tracking-wider px-1">
                  Interpolação de Animação
                </div>
                {EASING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      selectedIndices.forEach((idx) => {
                        updateFrame(idx, { easing: opt.value as EaseType });
                      });
                      setShowEasing(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      currentFrame?.easing === opt.value
                        ? 'bg-primary text-text-inverse font-medium'
                        : 'text-text hover:bg-surface-light'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Onion skin */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted">Pele de Cebola</span>
            <input
              type="range"
              min={0}
              max={100}
              value={onionSkinOpacity * 100}
              onChange={(e) => setOnionSkinOpacity(Number(e.target.value) / 100)}
              className="w-16 accent-primary h-1.5 bg-surface-light rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <span className="text-[10px] text-text-muted font-mono ml-1">
            {playback.currentTime.toFixed(1)}f / {totalDuration}f
          </span>
        </div>
      </div>

      {/* Carrossel de Frames */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 min-w-full h-full">
          {project.frames.map((frame, index) => {
            const isCurrent = index === project.currentFrameIndex;
            const isSelected = selectedIndices.includes(index);

            return (
              <div
                key={frame.id}
                draggable
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(index)}
                onClick={(e) => handleFrameClick(index, e)}
                onDoubleClick={() => setActiveSettingsFrame(index)}
                className={`group relative flex-shrink-0 w-16 h-20 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                  isCurrent
                    ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                    : isSelected
                    ? 'border-accent-yellow bg-accent-yellow/10'
                    : 'border-border bg-surface-light hover:border-text-muted'
                } ${draggedFrameIndex === index ? 'opacity-40 border-dashed border-primary' : ''}`}
              >
                {/* Grip de arrasto */}
                <div className="absolute top-1 left-1 text-text-muted/40 group-hover:text-text-muted transition-colors">
                  <GripVertical size={10} />
                </div>

                {/* Ícone de opções do frame */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSettingsFrame(index);
                  }}
                  className="absolute top-1 right-1 w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 bg-surface border border-border text-text-muted hover:text-primary transition-all z-10"
                  title="Configurar opções do quadro"
                >
                  <Settings2 size={10} />
                </button>

                {/* Thumbnail / Conteúdo do frame */}
                <div className="absolute inset-2 top-4 bottom-3 rounded-md bg-background/50 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-[11px] text-text font-bold font-mono">{index + 1}</span>
                  {frame.duration > 1 && (
                    <span
                      className="text-[9px] font-mono text-primary font-bold bg-primary/20 px-1 rounded border border-primary/30"
                      title={`Duração: ${frame.duration} quadros`}
                    >
                      {frame.duration}f
                    </span>
                  )}
                </div>

                {/* Barra indicadora de duração no rodapé do thumbnail */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-border rounded-b-xl overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-b-xl transition-all"
                    style={{ width: `${Math.min((frame.duration / 4) * 100, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}

          <button
            onClick={addFrame}
            className="flex-shrink-0 w-16 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary hover:text-primary text-text-muted flex items-center justify-center transition-colors font-bold text-xl"
            title="Adicionar Novo Quadro"
          >
            +
          </button>
        </div>
      </div>

      {/* Modal de Opções do Frame (acionado por duplo clique ou ícone de engrenagem) */}
      {activeSettingsFrame !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-xs">
          <div className="bg-surface border border-border rounded-2xl p-5 w-80 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <Settings2 size={16} className="text-primary" />
                Opções do Quadro #{activeSettingsFrame + 1}
              </h4>
              <button
                onClick={() => setActiveSettingsFrame(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light"
              >
                <X size={14} />
              </button>
            </div>

            {/* Duração / Exposição (Holds) */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted block font-medium">
                Duração de Exposição (Holds):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={project.frames[activeSettingsFrame]?.duration || 1}
                  onChange={(e) => {
                    const dur = Math.max(1, Number(e.target.value));
                    updateFrame(activeSettingsFrame, { duration: dur });
                  }}
                  className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-primary"
                />
                <span className="text-xs font-mono text-text-muted">quadros</span>
              </div>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 6, 8].map((d) => (
                  <button
                    key={d}
                    onClick={() => updateFrame(activeSettingsFrame, { duration: d })}
                    className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                      project.frames[activeSettingsFrame]?.duration === d
                        ? 'border-primary bg-primary text-text-inverse font-bold'
                        : 'border-border text-text-muted hover:text-text hover:bg-surface-light'
                    }`}
                  >
                    {d}f
                  </button>
                ))}
              </div>
            </div>

            {/* Easing */}
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted block font-medium">Interpolação (Easing):</label>
              <select
                value={project.frames[activeSettingsFrame]?.easing || 'linear'}
                onChange={(e) =>
                  updateFrame(activeSettingsFrame, { easing: e.target.value as EaseType })
                }
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary cursor-pointer"
              >
                {EASING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                duplicateFrame(activeSettingsFrame);
                setActiveSettingsFrame(null);
              }}
              className="w-full py-2 bg-surface-light hover:bg-surface border border-border text-text rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Copy size={14} className="text-primary" />
              Duplicar Quadro #{activeSettingsFrame + 1}
            </button>

            {selectedIndices.length > 1 && (
              <button
                onClick={() => {
                  const targetDuration = project.frames[activeSettingsFrame]?.duration || 1;
                  const targetEasing = project.frames[activeSettingsFrame]?.easing || 'linear';
                  selectedIndices.forEach((idx) => {
                    updateFrame(idx, { duration: targetDuration, easing: targetEasing });
                  });
                  setActiveSettingsFrame(null);
                }}
                className="w-full py-2 bg-primary hover:bg-primary-hover text-text-inverse rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Check size={14} />
                Aplicar a todos os {selectedIndices.length} quadros selecionados
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
