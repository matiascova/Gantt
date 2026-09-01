import React, { useState } from 'react';
import { ProjectPlan } from '../types';
import { toPng, toSvg, toBlob } from 'html-to-image';
import confetti from 'canvas-confetti';
import {
  X,
  Copy,
  Download,
  Check,
  FileCode,
  Sparkles,
  Presentation,
  Image as ImageIcon,
  Loader2,
  Share2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProjectPlan;
  onImportPlan: (plan: ProjectPlan) => void;
  onOpenShareModal?: () => void;
  timelineContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  plan,
  onImportPlan,
  onOpenShareModal,
  timelineContainerRef,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Copy PNG image directly to clipboard for immediate paste (Ctrl+V) in PowerPoint / Slides
  const handleCopyToClipboard = async () => {
    if (!timelineContainerRef.current) return;
    try {
      setIsExporting(true);
      setExportStatus('Generando imagen para portapapeles...');

      const blob = await toBlob(timelineContainerRef.current, {
        pixelRatio: 2.5, // Crisp 2.5x retina resolution
        cacheBust: true,
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopySuccess(true);
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
        setTimeout(() => setCopySuccess(false), 3500);
      } else {
        // Fallback: download if clipboard item is unsupported in some browsers
        handleDownloadPNG(2);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      // Fallback download
      handleDownloadPNG(2);
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  // Download High-Resolution PNG for PowerPoint / Keynote
  const handleDownloadPNG = async (scale: number = 2) => {
    if (!timelineContainerRef.current) return;
    try {
      setIsExporting(true);
      setExportStatus(`Exportando PNG en alta resolución (${scale}x)...`);

      const dataUrl = await toPng(timelineContainerRef.current, {
        pixelRatio: scale,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `${plan.settings.title.toLowerCase().replace(/\s+/g, '-')}-planificacion.png`;
      link.href = dataUrl;
      link.click();

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error('Error downloading PNG', err);
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  // Download SVG
  const handleDownloadSVG = async () => {
    if (!timelineContainerRef.current) return;
    try {
      setIsExporting(true);
      setExportStatus('Generando SVG vectorial...');

      const dataUrl = await toSvg(timelineContainerRef.current);
      const link = document.createElement('a');
      link.download = `${plan.settings.title.toLowerCase().replace(/\s+/g, '-')}-cronograma.svg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading SVG', err);
    } finally {
      setIsExporting(false);
      setExportStatus(null);
    }
  };

  // Export JSON file
  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(plan, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${plan.settings.title.toLowerCase().replace(/\s+/g, '-')}-data.json`;
    link.href = url;
    link.click();
  };

  // Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.settings && parsed.stages) {
          onImportPlan(parsed);
          onClose();
        }
      } catch (err) {
        alert('Archivo JSON no válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                Exportar para Presentaciones
              </h2>
              <p className="text-xs text-slate-500">
                Pega directamente en PowerPoint, Google Slides o Canva
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: Copy to Clipboard */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Opción Recomendada
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                Copiar Imagen al Portapapeles
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Haz clic y luego presiona <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border text-[11px] font-mono shadow-xs">Ctrl + V</kbd> (o Cmd + V) en tu diapositiva.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="copy-to-clipboard-btn"
            onClick={handleCopyToClipboard}
            disabled={isExporting}
            className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
              copySuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {exportStatus || 'Procesando...'}
              </>
            ) : copySuccess ? (
              <>
                <Check className="w-4 h-4" />
                ¡Copiado! Listo para pegar en tu presentación
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar Imagen en Alta Calidad
              </>
            )}
          </button>
        </div>

        {/* Other Export Options */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
            Descargar Archivos
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              id="download-hd-png-btn"
              onClick={() => handleDownloadPNG(2)}
              disabled={isExporting}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col gap-1"
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                <ImageIcon className="w-4 h-4" />
                Descargar PNG (HD 2x)
              </div>
              <span className="text-[11px] text-slate-500">
                Ideal para proyectar o imprimir
              </span>
            </button>

            <button
              type="button"
              id="download-svg-btn"
              onClick={handleDownloadSVG}
              disabled={isExporting}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/80 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col gap-1"
            >
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-xs">
                <Download className="w-4 h-4" />
                Descargar SVG
              </div>
              <span className="text-[11px] text-slate-500">
                Vectorial sin pérdida de calidad
              </span>
            </button>
          </div>
        </div>

        {/* Share Link Banner */}
        {onOpenShareModal && (
          <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-[#0070F2] flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  ¿Quieres compartir la planificación con tu equipo?
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Genera un enlace web interactivo para que otros lo abran y guarden
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-open-share-from-export"
              onClick={() => {
                onClose();
                onOpenShareModal();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#0070F2] hover:bg-[#005FB8] text-white text-xs font-semibold flex-shrink-0 transition-colors"
            >
              Compartir Enlace
            </button>
          </div>
        )}

        {/* Project Backup (JSON) */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={handleDownloadJSON}
            className="hover:text-indigo-600 flex items-center gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5" />
            Guardar archivo de proyecto (.json)
          </button>

          <label className="hover:text-indigo-600 cursor-pointer flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Cargar proyecto
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
