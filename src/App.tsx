import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import DrawingCanvas from '@/components/canvas/DrawingCanvas';
import Toolbar from '@/components/tools/Toolbar';
import BrushSettings from '@/components/tools/BrushSettings';
import Timeline from '@/components/timeline/Timeline';
import LayerPanel from '@/components/timeline/LayerPanel';
import NewProjectModal from '@/components/modals/NewProjectModal';
import SplashScreen from '@/components/modals/SplashScreen';
import AppLogo from '@/components/common/AppLogo';
import { Save, FolderOpen, Keyboard, Plus, Download, Sun, Moon } from 'lucide-react';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const project = useStore((s) => s.project);
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

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        useStore.getState().addFrame();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key.toLowerCase() === 'd' || e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        const st = useStore.getState();
        st.deleteFrame(st.project.currentFrameIndex);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo(project.currentFrameIndex, project.currentLayerIndex);
        } else {
          undo(project.currentFrameIndex, project.currentLayerIndex);
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        useStore.getState().deleteSelection();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        useStore.getState().copySelection();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        useStore.getState().cutSelection();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        useStore.getState().pasteClipboard();
      }

      switch (e.key.toLowerCase()) {
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
          const state = useStore.getState();
          state.setPlayback({ isPlaying: !state.playback.isPlaying });
          break;
        case '[':
          useStore.getState().setBrush({ size: Math.max(1, useStore.getState().brush.size - 1) });
          break;
        case ']':
          useStore.getState().setBrush({ size: Math.min(100, useStore.getState().brush.size + 1) });
          break;
        case '0':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            useStore.getState().setZoom(1);
            useStore.getState().setPan({ x: 0, y: 0 });
          }
          break;
        case 'n':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setShowNewProject(true);
          }
          break;
        case 's':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            const data = saveProject();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}.ani`;
            a.click();
            URL.revokeObjectURL(url);
          }
          break;
        case 'o':
          if (e.metaKey || e.ctrlKey) {
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
          }
          break;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const st = useStore.getState();
            const proj = st.project;
            const cx = proj.width / 2;
            const cy = proj.height / 2;
            const maxW = Math.min(img.width, proj.width * 0.6);
            const w = maxW;
            const h = (maxW / img.width) * img.height;
            const newStroke: import('@/types').Stroke = {
              tool: 'image',
              color: '#000000',
              size: 1,
              opacity: 1,
              imageUrl: reader.result as string,
              points: [
                { x: cx - w / 2, y: cy - h / 2 },
                { x: cx + w / 2, y: cy - h / 2 },
                { x: cx + w / 2, y: cy + h / 2 },
                { x: cx - w / 2, y: cy + h / 2 },
              ],
              startPoint: { x: cx - w / 2, y: cy - h / 2 },
              endPoint: { x: cx + w / 2, y: cy + h / 2 },
            };
            const fi = proj.currentFrameIndex;
            const li = proj.currentLayerIndex;
            st.addStroke(fi, li, newStroke);
            const layer = proj.frames[fi]?.layers[li];
            const newIndex = layer ? layer.strokes.length : 0;
            st.setSelection([newIndex]);
            st.setTool('select');
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
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
      {/* Barra superior */}
      <header className="relative flex items-center justify-between px-3 h-11 bg-surface border-b border-border select-none z-20">
        {/* Esquerda: Logo, Nome, Resolução & Seletor de FPS */}
        <div className="flex items-center gap-2.5">
          <AppLogo size="sm" onClick={() => setShowSplash(true)} />

          <div className="w-px h-4 bg-border" />

          <span className="text-xs font-medium text-text-muted max-w-[140px] truncate">
            {project.name}
          </span>
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
              const data = saveProject();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${project.name}.ani`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
            title="Salvar Projeto (.ani)"
          >
            <Save size={14} />
            Salvar
          </button>
          <button
            onClick={() => {
              const data = saveProject();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${project.name}.ani`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-2.5 py-1 rounded-lg text-xs text-text hover:bg-surface hover:text-primary transition-colors flex items-center gap-1.5 font-medium"
            title="Exportar Projeto"
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
