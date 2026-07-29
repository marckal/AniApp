import { useState } from 'react';
import { useStore } from '@/lib/store';
import type { FillType } from '@/types';

const PRESET_COLORS = [
  '#000000', '#1a1a1a', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
  '#ff5c5c', '#ff8c5c', '#f5c542', '#5cff8a', '#5c9cff', '#5ce8ff', '#ff5ce8',
  '#aa3bff', '#7c5cff', '#3b5cff', '#0055ff', '#0088ff', '#00bbff',
  '#8b4513', '#a0522d', '#cd853f', '#deb887', '#f5deb3',
  '#2f4f4f', '#556b2f', '#6b8e23', '#228b22', '#32cd32',
];

const GRADIENT_PRESETS = [
  { name: 'Pôr do Sol', colors: ['#ff5c5c', '#f5c542'] as [string, string] },
  { name: 'Cyberpunk', colors: ['#ff5ce8', '#5ce8ff'] as [string, string] },
  { name: 'Vaporwave', colors: ['#7c5cff', '#ff5ce8'] as [string, string] },
  { name: 'Neon Forest', colors: ['#5cff8a', '#0088ff'] as [string, string] },
  { name: 'Retro GameBoy', colors: ['#8b956d', '#0f380f'] as [string, string] },
  { name: 'Dither Mono', colors: ['#000000', '#ffffff'] as [string, string] },
];

export default function BrushSettings() {
  const brush = useStore((s) => s.brush);
  const setBrush = useStore((s) => s.setBrush);
  const tool = useStore((s) => s.tool);
  const [showCustom, setShowCustom] = useState(false);

  const isShapeTool = tool === 'rectangle' || tool === 'circle' || tool === 'line';
  const isFillTool = tool === 'fill';

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border w-60 p-3 gap-3 select-none z-10 overflow-y-auto">
      <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Configurações do Pincel
      </h3>

      {/* Cor atual */}
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border-2 border-border shadow-inner flex items-center justify-center overflow-hidden"
          style={{ backgroundColor: brush.color }}
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-muted">Cor do Traço</span>
          <span className="text-xs font-mono text-text uppercase">
            {brush.color}
          </span>
        </div>
      </div>

      {/* Cores pré-definidas */}
      <div className="grid grid-cols-5 gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setBrush({ color: c })}
            className={`w-8 h-8 rounded-md border transition-transform hover:scale-110 ${
              brush.color === c ? 'border-white ring-1 ring-primary' : 'border-border'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Picker customizado */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className="text-xs text-primary hover:text-primary-hover transition-colors text-left"
      >
        {showCustom ? 'Ocultar seletor' : 'Seletor de cor customizado'}
      </button>

      {showCustom && (
        <input
          type="color"
          value={brush.color}
          onChange={(e) => setBrush({ color: e.target.value })}
          className="w-full h-10 rounded-lg border border-border cursor-pointer"
        />
      )}

      <div className="w-full h-px bg-border" />

      {/* Opções de Gradiente e Dither (para Preencher ou Formas) */}
      {(isFillTool || isShapeTool) && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Estilo de Preenchimento
          </label>

          <select
            value={brush.fillType || 'solid'}
            onChange={(e) => setBrush({ fillType: e.target.value as FillType })}
            className="w-full bg-surface-light border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
          >
            <option value="solid">Cor Sólida</option>
            <option value="gradient-linear">Gradiente Linear</option>
            <option value="gradient-dither">Gradiente Dither (Flipnote/16-bit)</option>
          </select>

          {brush.fillType !== 'solid' && (
            <div className="flex flex-col gap-2 mt-1 bg-surface-light p-2 rounded-xl border border-border">
              <span className="text-[10px] text-text-muted font-medium">Presets de Gradiente:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {GRADIENT_PRESETS.map((gp) => (
                  <button
                    key={gp.name}
                    onClick={() =>
                      setBrush({
                        gradientColors: gp.colors,
                        color: gp.colors[0],
                      })
                    }
                    className="flex items-center gap-1.5 p-1 rounded-lg border border-border hover:border-primary transition-colors text-[10px] text-text"
                  >
                    <div
                      className="w-4 h-4 rounded-full border border-border"
                      style={{
                        background: `linear-gradient(to right, ${gp.colors[0]}, ${gp.colors[1]})`,
                      }}
                    />
                    <span className="truncate">{gp.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-muted">Cor 1:</span>
                  <input
                    type="color"
                    value={brush.gradientColors?.[0] || '#7c5cff'}
                    onChange={(e) =>
                      setBrush({
                        gradientColors: [
                          e.target.value,
                          brush.gradientColors?.[1] || '#00c8ff',
                        ],
                      })
                    }
                    className="w-6 h-6 rounded border border-border cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-text-muted">Cor 2:</span>
                  <input
                    type="color"
                    value={brush.gradientColors?.[1] || '#00c8ff'}
                    onChange={(e) =>
                      setBrush({
                        gradientColors: [
                          brush.gradientColors?.[0] || '#7c5cff',
                          e.target.value,
                        ],
                      })
                    }
                    className="w-6 h-6 rounded border border-border cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full h-px bg-border" />

      {/* Tamanho do pincel */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">Tamanho</span>
          <span className="text-xs font-mono text-text">{brush.size}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={brush.size}
          onChange={(e) => setBrush({ size: Number(e.target.value) })}
          className="w-full accent-primary h-1.5 bg-surface-light rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-center py-2">
          <div
            className="rounded-full bg-white"
            style={{
              width: Math.max(brush.size, 4),
              height: Math.max(brush.size, 4),
              opacity: brush.opacity,
            }}
          />
        </div>
      </div>

      {/* Opacidade */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-text-muted">Opacidade</span>
          <span className="text-xs font-mono text-text">
            {Math.round(brush.opacity * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={brush.opacity * 100}
          onChange={(e) => setBrush({ opacity: Number(e.target.value) / 100 })}
          className="w-full accent-primary h-1.5 bg-surface-light rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Opções de preenchimento para formas */}
      {isShapeTool && (
        <>
          <div className="w-full h-px bg-border" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="filled"
              checked={brush.filled}
              onChange={(e) => setBrush({ filled: e.target.checked })}
              className="accent-primary"
            />
            <label htmlFor="filled" className="text-xs text-text">Preencher forma</label>
          </div>
          {brush.filled && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Cor de preenchimento:</span>
              <input
                type="color"
                value={brush.fillColor}
                onChange={(e) => setBrush({ fillColor: e.target.value })}
                className="w-8 h-8 rounded border border-border cursor-pointer"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
