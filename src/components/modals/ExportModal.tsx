import { useState } from 'react';
import { useStore } from '@/lib/store';
import { exportToGif, exportToMp4, type ExportProgress } from '@/lib/exportUtils';
import { X, Film, Image as ImageIcon, Download, Loader2, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const project = useStore((s) => s.project);
  const [format, setFormat] = useState<'gif' | 'mp4'>('gif');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const durationSec = (project.frames.length / (project.fps || 24)).toFixed(1);

  const handleExport = async () => {
    setIsExporting(true);
    setCompleted(false);
    setErrorMsg(null);
    setProgress({
      currentFrame: 0,
      totalFrames: project.frames.length,
      percentage: 0,
      status: 'Iniciando exportação...',
    });

    try {
      let blob: Blob;
      if (format === 'gif') {
        blob = await exportToGif(project, (p) => setProgress(p));
      } else {
        blob = await exportToMp4(project, (p) => setProgress(p));
      }

      // Baixa o arquivo gerado
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name || 'animacao'}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      setCompleted(true);
    } catch (err: any) {
      console.error('Erro na exportação:', err);
      setErrorMsg(err.message || 'Ocorreu um erro durante a exportação.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 select-none backdrop-blur-xs">
      <div className="bg-surface border border-border rounded-2xl w-[480px] max-w-[95vw] shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-surface-light/50">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-primary" />
            <h2 className="text-base font-semibold text-text">Exportar Animação</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-light transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-5 space-y-5">
          {/* Seletor de Formato */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Escolha o formato de saída
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Opção GIF */}
              <button
                type="button"
                onClick={() => setFormat('gif')}
                disabled={isExporting}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  format === 'gif'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-surface-light/40 text-text-muted hover:border-border/80 hover:text-text'
                }`}
              >
                <ImageIcon size={28} className="mb-2" />
                <span className="text-sm font-bold text-text">GIF Animado</span>
                <span className="text-[11px] text-text-muted mt-0.5">.gif (Web / Loop)</span>
              </button>

              {/* Opção MP4 */}
              <button
                type="button"
                onClick={() => setFormat('mp4')}
                disabled={isExporting}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  format === 'mp4'
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-surface-light/40 text-text-muted hover:border-border/80 hover:text-text'
                }`}
              >
                <Film size={28} className="mb-2" />
                <span className="text-sm font-bold text-text">Vídeo MP4</span>
                <span className="text-[11px] text-text-muted mt-0.5">.mp4 (Alta Qualidade)</span>
              </button>
            </div>
          </div>

          {/* Resumo do Projeto */}
          <div className="bg-surface-light/60 rounded-xl p-3.5 border border-border/60 text-xs space-y-1.5 font-mono text-text-muted">
            <div className="flex justify-between">
              <span>Resolução:</span>
              <span className="text-text font-medium">{project.width} × {project.height} px</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de quadros (FPS):</span>
              <span className="text-text font-medium">{project.fps || 24} fps</span>
            </div>
            <div className="flex justify-between">
              <span>Total de quadros:</span>
              <span className="text-text font-medium">{project.frames.length} quadros</span>
            </div>
            <div className="flex justify-between border-t border-border/40 pt-1.5 mt-1.5">
              <span>Duração estimada:</span>
              <span className="text-primary font-bold">{durationSec} segundos</span>
            </div>
          </div>

          {/* Progresso durante a exportação */}
          {isExporting && progress && (
            <div className="space-y-2 bg-primary/5 p-3.5 rounded-xl border border-primary/20">
              <div className="flex justify-between text-xs font-medium text-text">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 size={14} className="animate-spin" />
                  {progress.status}
                </span>
                <span className="font-mono">{progress.percentage}%</span>
              </div>
              <div className="w-full bg-surface-light h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-200"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Sucesso */}
          {completed && !isExporting && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-500 text-xs font-medium">
              <CheckCircle2 size={16} />
              <span>Exportação concluída com sucesso! O download do arquivo foi iniciado.</span>
            </div>
          )}

          {/* Erro */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Rodapé / Botões */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-border bg-surface-light/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text hover:bg-surface-light transition-colors cursor-pointer disabled:opacity-50"
          >
            {completed ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-black bg-primary hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download size={14} />
                Exportar em {format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
