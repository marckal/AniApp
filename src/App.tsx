import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import Toolbar from '@/components/tools/Toolbar';
import BrushSettings from '@/components/tools/BrushSettings';
import Timeline from '@/components/timeline/Timeline';
import LayerPanel from '@/components/timeline/LayerPanel';
import NewProjectModal from '@/components/modals/NewProjectModal';
import SplashScreen from '@/components/modals/SplashScreen';
import ExportModal from '@/components/modals/ExportModal';
import { processClipboardPasteEvent } from '@/lib/canvas/imagePaste';
import AppLogo from '@/components/common/AppLogo';
import { Save, FolderOpen, Keyboard, Plus, Download, Sun, Moon, Pencil, Check } from 'lucide-react';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const project = useStore((s) => s.project);
  const updateProject = useStore((s) => s.updateProject);
  const saveProject = useStore((s) => s.saveProject);
  const loadProject = useStore((s) => s.loadProject);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // ---- Modifier combos: handle ALL mod+key before the tool switch ----
      if (mod) {
        if (e.shiftKey && key === 'i') {
          e.preventDefault();
          useStore.getState().addFrame();
          return;
        }
        if (key === 'd' && !e.shiftKey) {
          e.preventDefault();
          const st = useStore.getState();
          st.duplicateFrame(st.project.currentFrameIndex);
          return;
        }
        if (e.shiftKey && (key === 'd' || key === 'r')) {
          e.preventDefault();
          const st = useStore.getState();
          st.deleteFrame(st.project.currentFrameIndex);
          return;
        }
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo(project.currentFrameIndex, project.currentLayerIndex);
          } else {
            undo(project.currentFrameIndex, project.currentLayerIndex);
          }
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          useStore.getState().copySelection();
          return;
        }
        if (key === 'x') {
          e.preventDefault();
          useStore.getState().cutSelection();
          return;
        }
        // Ctrl+V / Cmd+V: Do NOT handle paste here.
        // The browser fires a 'paste' event which we handle below in handlePaste.
        // Handling it here would cause double-paste because both handlers fire.
        if (key === 'v') {
          // Let the native paste event fire — handlePaste will process it.
          return;
        }
        if (key === 's') {
          e.preventDefault();
          saveProject();
          setShowSaveToast(true);
          setTimeout(() => setShowSaveToast(false), 2500);
          return;
        }
        if (key === 'n') {
          e.preventDefault();
          setShowNewProject(true);
          return;
        }
        if (key === 'o') {
          e.preventDefault();
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.ani,.json';
          input.onchange = (ev) => {
            const file = (ev.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => loadProject(reader.result as string);
            reader.readAsText(file);
          };
          input.click();
          return;
        }
        if (key === '0') {
          e.preventDefault();
          useStore.getState().setZoom(1);
          useStore.getState().setPan({ x: 0, y: 0 });
          return;
        }
        // Any other mod combo — don't fall through to tool shortcuts
        return;
      }

      // ---- Non-modifier single keys: tool shortcuts ----
      if (e.key === 'Delete' || e.key === 'Backspace') {
        useStore.getState().deleteSelection();
        return;
      }

      switch (key) {
        case 'b':
          useStore.getState().setTool('brush');
          break;
        case 'n':
          useStore.getState().setTool('hard-brush');
          break;
        case 'e':
          useStore.getState().setTool('eraser');
          break;
        case 'f':
          useStore.getState().setTool('fill');
          break;
        case 'h':
          useStore.getState().setTool('move');
          break;
        case 'r':
          useStore.getState().setTool('rectangle');
          break;
        case 'c':
          useStore.getState().setTool('circle');
          break;
        case 'l':
          useStore.getState().setTool('line');
          break;
        case 'v':
          useStore.getState().setTool('select');
          break;
        case ' ':
          e.preventDefault();
          {
            const state = useStore.getState();
            state.setPlayback({ isPlaying: !state.playback.isPlaying });
          }
          break;
        case '[':
          useStore.getState().setBrush({ size: Math.max(1, useStore.getState().brush.size - 1) });
          break;
        case ']':
          useStore.getState().setBrush({ size: Math.min(100, useStore.getState().brush.size + 1) });
          break;
      }
    };

    const handlePaste = async (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Try to handle as an external image paste (from other apps/browser tabs)
      const handledExternal = await processClipboardPasteEvent(e);
      if (!handledExternal) {
        // No external image — paste from internal AniApp clipboard
        useStore.getState().pasteClipboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [project, undo, redo, saveProject, loadProject]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      {/* Toast de salvamento local */}
      {showSaveToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-4 py-2 rounded-xl shadow-lg z-50 text-xs font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top duration-200">
          <Check size={15} />
          Progresso salvo com sucesso!
        </div>
      )}

      {/* Barra superior */}
      <header className="relative flex items-center justify-between px-3 h-11 bg-surface border-b border-border select-none z-20">
        {/* Esquerda: Logo, Nome editável & Resolução */}
        <div className="flex items-center gap-2.5">
          <AppLogo size="sm" onClick={() => setShowSplash(true)} />

          <div className="w-px h-4 bg-border" />

          {/* Nome do projeto editável ao clicar */}
          <button
            onClick={() => {
              const newName = prompt('Renomear projeto:', project.name);
              if (newName && newName.trim()) {
                updateProject({ name: newName.trim() });
              }
            }}
            className="text-xs font-semibold text-text hover:text-primary max-w-[160px] truncate cursor-pointer transition-colors px-1.5 py-0.5 rounded-md hover:bg-surface-light flex items-center gap-1.5 group"
            title="Clique para renomear este projeto"
          >
            <span className="truncate">{project.name}</span>
            <Pencil size={11} className="opacity-0 group-hover:opacity-100 text-text-muted transition-opacity flex-shrink-0" />
          </button>

          <span className="text-[10px] text-text-muted/60 font-mono">
            {project.width}×{project.height}
          </span>
        </div>

        {/* Centro: Ações do documento centralizadas (estilo Figma) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface-light/90 border border-border rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setShowNewProject(true)}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
            title="Novo Projeto"
          >
            <Plus size={14} className="text-primary" />
            Novo
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.ani,.json';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => loadProject(reader.result as string);
                reader.readAsText(file);
              };
              input.click();
            }}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
            title="Abrir Projeto"
          >
            <FolderOpen size={14} />
            Abrir
          </button>
          <button
            onClick={() => {
              saveProject();
              setShowSaveToast(true);
              setTimeout(() => setShowSaveToast(false), 2500);
            }}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            title="Salvar progresso do projeto (Autosave)"
          >
            <Save size={14} />
            Salvar
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            title="Exportar Animação (GIF ou MP4)"
          >
            <Download size={14} />
            Exportar
          </button>
        </div>

        {/* Direita: Tema e Atalhos */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="px-2.5 py-1 rounded-lg text-xs text-text-muted hover:text-text hover:bg-surface-light transition-colors flex items-center gap-1.5"
            title="Atalhos de Teclado"
          >
            <Keyboard size={14} />
            Atalhos
          </button>
        </div>
      </header>

      {/* Área de trabalho principal */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            {/* Viewport do Canvas com Barra de Tarefas Flutuante */}
            <div className="flex-1 relative overflow-hidden">
              <DrawingCanvas />
              <Toolbar />
            </div>

            <BrushSettings />
            <LayerPanel />
          </div>

          <Timeline />
        </div>
      </div>

      {showSplash && <SplashScreen onClose={() => setShowSplash(false)} />}
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
      {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-2xl p-6 w-[440px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-text">Atalhos de Teclado</h2>
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Ctrl+Shift+I', 'Inserir novo quadro'],
                ['Ctrl+Shift+D / R', 'Remover quadro atual'],
                ['B', 'Ferramenta Pincel Suave'],
                ['N', 'Ferramenta Pincel Nítido (Sem Anti-Aliasing)'],
                ['E', 'Ferramenta Borracha'],
                ['F', 'Ferramenta Preencher'],
                ['R', 'Ferramenta Retângulo'],
                ['C', 'Ferramenta Círculo'],
                ['L', 'Ferramenta Linha'],
                ['H', 'Ferramenta Mover Tela'],
                ['V', 'Ferramenta Seleção / Transformação Livre'],
                ['Shift (formas/escala)', 'Restringir ângulo 15° / proporção 1:1'],
                ['Alt / Option + arrastar (V)', 'Duplicar seleção'],
                ['Shift + clique (pincel)', 'Linha reta desde o último traço'],
                ['Alt + clique', 'Conta-gotas (capturar cor)'],
                ['Delete / Backspace', 'Excluir seleção'],
                ['Ctrl+C / X / V', 'Copiar / Recortar / Colar'],
                ['Ctrl+T', 'Transformar seleção livre'],
                ['Espaço', 'Reproduzir / Pausar'],
                ['[ / ]', 'Diminuir / Aumentar pincel'],
                ['Ctrl+Z / Ctrl+Shift+Z', 'Desfazer / Refazer'],
                ['Ctrl+N / S / O', 'Novo / Salvar / Abrir projeto'],
              ].map(([key, desc]) => (
                <div key={key} className="flex justify-between py-1 border-b border-border/50">
                  <kbd className="px-2 py-0.5 bg-surface-light rounded text-xs font-mono text-text-muted border border-border">
                    {key}
                  </kbd>
                  <span className="text-text">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
