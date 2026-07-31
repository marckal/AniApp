import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { ANIMATION_PRINCIPLES, type AnimationPrinciple } from '@/data/animationPrinciples';
import { getCustomPrinciplesMap, getCustomPrinciple } from '@/lib/customPrinciples';
import { GraduationCap, ChevronDown, Sparkles, Check, Star } from 'lucide-react';

interface PrincipleSelectorProps {
  activePrincipleId: string | null;
  onSelectPrinciple: (principle: AnimationPrinciple | null) => void;
}

export default function PrincipleSelector({
  activePrincipleId,
  onSelectPrinciple,
}: PrincipleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMap, setCustomMap] = useState<Record<string, any>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setProject = useStore((s) => s.setProject);
  const setPlayback = useStore((s) => s.setPlayback);

  const activePrinciple = ANIMATION_PRINCIPLES.find((p) => p.id === activePrincipleId) || null;

  // Atualiza os exemplos customizados armazenados
  const refreshCustomMap = () => {
    setCustomMap(getCustomPrinciplesMap());
  };

  useEffect(() => {
    refreshCustomMap();
  }, [isOpen]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (principle: AnimationPrinciple) => {
    // Carrega a versão customizada se existir, ou a padrão
    const customProj = getCustomPrinciple(principle.id);
    const projToLoad = customProj || principle.generateProject();

    setProject(projToLoad);
    setPlayback({ isPlaying: true });
    onSelectPrinciple(principle);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border shadow-xs ${
          activePrinciple
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
            : 'bg-surface-light/80 text-text hover:bg-surface hover:text-primary border-border'
        }`}
        title="Estudar os 12 Princípios Clássicos da Animação (Disney & Richard Williams)"
      >
        <GraduationCap size={15} className={activePrinciple ? 'text-amber-500' : 'text-primary'} />
        <span className="max-w-[150px] truncate">
          {activePrinciple ? activePrinciple.title : 'Princípios da Animação'}
        </span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu Dropdown de Seleção */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[340px] bg-surface border border-border rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 backdrop-blur-md">
          <div className="px-3.5 py-2 border-b border-border/60 bg-surface-light/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text">
              <Sparkles size={14} className="text-amber-500" />
              <span>12 Princípios da Animação</span>
            </div>
            <span className="text-[10px] text-text-muted font-mono">Disney & Williams</span>
          </div>

          <div className="max-h-[360px] overflow-y-auto py-1 space-y-0.5 px-1">
            {ANIMATION_PRINCIPLES.map((principle) => {
              const isSelected = activePrincipleId === principle.id;
              const hasCustom = !!customMap[principle.id];
              return (
                <button
                  key={principle.id}
                  onClick={() => handleSelect(principle)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                      : 'hover:bg-surface-light text-text hover:text-primary'
                  }`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {principle.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold truncate flex items-center gap-1">
                        {principle.title}
                        {hasCustom && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
                            <Star size={9} className="fill-amber-500 text-amber-500" />
                            Custom
                          </span>
                        )}
                      </span>
                      {isSelected && <Check size={14} className="text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-text-muted truncate mt-0.5 font-normal">
                      {hasCustom ? '⭐ Exemplo personalizado salvo pelo usuário' : principle.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
