import { useState } from 'react';
import { useStore } from '@/lib/store';
import { X, Monitor, Film, Palette } from 'lucide-react';

interface NewProjectModalProps {
  onClose: () => void;
}

const PRESETS = [
  { name: 'HD 1080p', width: 1920, height: 1080 },
  { name: 'HD 720p', width: 1280, height: 720 },
  { name: '4K UHD', width: 3840, height: 2160 },
  { name: 'Quadrado 1:1', width: 1080, height: 1080 },
  { name: 'Story', width: 1080, height: 1920 },
  { name: 'Flipnote', width: 256, height: 192 },
  { name: 'Sprite 64', width: 64, height: 64 },
  { name: 'Sprite 128', width: 128, height: 128 },
  { name: 'Sprite 256', width: 256, height: 256 },
];

export default function NewProjectModal({ onClose }: NewProjectModalProps) {
  const newProject = useStore((s) => s.newProject);
  const [name, setName] = useState('');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [fps, setFps] = useState(24);
  const [gridSize, setGridSize] = useState(50);
  const [bgColor, setBgColor] = useState('#ffffff');

  const handleCreate = () => {
    const w = Math.max(1, Math.min(4096, width || 1920));
    const h = Math.max(1, Math.min(4096, height || 1080));
    const f = Math.max(1, Math.min(120, fps || 24));
    newProject(w, h, f, bgColor);
    useStore.getState().updateProject({ name: name || 'Sem Título', gridSize });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface border border-border rounded-2xl p-6 w-[480px] shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Film size={20} className="text-primary" />
            Novo Projeto de Animação
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Nome do Projeto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sem Título"
              className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-2 block">Tamanho do Canvas (máx. 4K)</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setWidth(preset.width);
                    setHeight(preset.height);
                  }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] border transition-colors ${
                    width === preset.width && height === preset.height
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:text-text hover:border-text-muted'
                  }`}
                >
                  <div className="font-semibold">{preset.name}</div>
                  <div className="opacity-70">
                    {preset.width}×{preset.height}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Largura</label>
              <input
                type="number"
                min={1}
                max={4096}
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-end pb-2 text-text-muted">×</div>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Altura</label>
              <input
                type="number"
                min={1}
                max={4096}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Taxa de Quadros</label>
              <div className="flex items-center gap-2">
                <Monitor size={14} className="text-text-muted" />
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-text-muted">fps</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Fundo</label>
              <div className="flex items-center gap-2">
                <Palette size={14} className="text-text-muted" />
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Tamanho da Grade / Grid (px)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={4}
                max={500}
                value={gridSize}
                onChange={(e) => setGridSize(Math.max(4, Number(e.target.value)))}
                className="w-28 bg-surface-light border border-border rounded-lg px-3 py-1.5 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
              <span className="text-xs text-text-muted">px</span>
              <div className="flex gap-1 ml-auto">
                {[10, 16, 24, 32, 50, 64].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGridSize(g)}
                    className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                      gridSize === g
                        ? 'border-primary bg-primary text-text-inverse font-bold'
                        : 'border-border text-text-muted hover:text-text hover:bg-surface-light'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-light transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-sm bg-primary hover:bg-primary-hover text-text-inverse transition-colors"
          >
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
}
