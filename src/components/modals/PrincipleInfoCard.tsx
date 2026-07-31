import { useState } from 'react';
import type { AnimationPrinciple } from '@/data/animationPrinciples';
import { useStore } from '@/lib/store';
import {
  saveCustomPrinciple,
  deleteCustomPrinciple,
  getCustomPrinciple,
} from '@/lib/customPrinciples';
import {
  BookOpen,
  X,
  Play,
  Pause,
  Eye,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Save,
  RotateCcw,
} from 'lucide-react';

interface PrincipleInfoCardProps {
  principle: AnimationPrinciple;
  onClose: () => void;
}

export default function PrincipleInfoCard({ principle, onClose }: PrincipleInfoCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasCustom, setHasCustom] = useState(() => !!getCustomPrinciple(principle.id));
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const project = useStore((s) => s.project);
  const setProject = useStore((s) => s.setProject);
  const playback = useStore((s) => s.playback);
  const setPlayback = useStore((s) => s.setPlayback);

  const togglePlay = () => {
    setPlayback({ isPlaying: !playback.isPlaying });
  };

  const toggleOnionSkin = () => {
    setPlayback({ onionSkin: !playback.onionSkin });
  };

  return (
    <div className="fixed top-14 right-4 z-40 w-[380px] max-w-[92vw] select-none transition-all duration-300">
      <div className="bg-surface/95 border-2 border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center justify-center shadow-xs">
              {principle.number}
            </div>
            <div>
              <h3 className="text-xs font-bold text-text truncate max-w-[220px]">
                {principle.title}
              </h3>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                {principle.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors cursor-pointer"
              title={isCollapsed ? 'Expandir Explicação' : 'Recolher Explicação'}
            >
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors cursor-pointer"
              title="Fechar Princípio"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Conteúdo Expandido */}
        {!isCollapsed && (
          <div className="p-4 space-y-3.5 text-xs text-text max-h-[70vh] overflow-y-auto">
            {/* Citação da Fonte Literária */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-light/80 rounded-xl text-[11px] font-mono text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <BookOpen size={13} className="flex-shrink-0" />
              <span className="truncate">{principle.bookSource}</span>
            </div>

            {/* Descrição Teórica */}
            <p className="text-text-muted leading-relaxed font-normal">
              {principle.description}
            </p>

            {/* Lições Fundamentais */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-text uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={12} className="text-amber-500" />
                Pontos de Aprendizado
              </span>
              <ul className="space-y-1">
                {principle.keyLessons.map((lesson, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-text-muted text-[11px]">
                    <CheckCircle2 size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>{lesson}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gerenciamento de Exemplo Customizado */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    saveCustomPrinciple(principle.id, project);
                    setHasCustom(true);
                    setSavedMsg('Exemplo customizado salvo!');
                    setTimeout(() => setSavedMsg(null), 3000);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 border border-amber-500/30 transition-colors cursor-pointer"
                  title="Salvar as alterações atuais do canvas como seu exemplo personalizado deste princípio"
                >
                  <Save size={13} />
                  <span>Salvar como Meu Exemplo</span>
                </button>

                {hasCustom && (
                  <button
                    onClick={() => {
                      deleteCustomPrinciple(principle.id);
                      setHasCustom(false);
                      // Carrega a versão padrão original
                      setProject(principle.generateProject());
                      setSavedMsg('Exemplo padrão restaurado!');
                      setTimeout(() => setSavedMsg(null), 3000);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-surface-light hover:bg-rose-500/15 hover:text-rose-500 text-text-muted font-medium text-[11px] flex items-center gap-1 border border-border transition-colors cursor-pointer"
                    title="Restaurar o exemplo padrão original"
                  >
                    <RotateCcw size={12} />
                    <span>Restaurar</span>
                  </button>
                )}
              </div>

              {savedMsg && (
                <div className="text-[10px] text-center font-semibold text-emerald-500 bg-emerald-500/10 py-1 rounded-lg border border-emerald-500/20">
                  {savedMsg}
                </div>
              )}
            </div>

            {/* Ações Rápidas de Estudo */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <button
                onClick={togglePlay}
                className="px-3 py-1.5 rounded-xl bg-primary text-black font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              >
                {playback.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{playback.isPlaying ? 'Pausar' : 'Reproduzir'}</span>
              </button>

              <button
                onClick={toggleOnionSkin}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  playback.onionSkin
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                    : 'bg-surface-light text-text-muted hover:text-text border-border'
                }`}
                title="Ativar Papel Vegetal (Onion Skin) para observar a sobreposição dos quadros"
              >
                <Eye size={14} />
                <span>Onion Skin {playback.onionSkin ? 'Ativado' : 'Desativado'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
