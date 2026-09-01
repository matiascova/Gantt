import React from 'react';
import { ProjectPlan, SavedProject } from '../types';
import { COLOR_THEMES, TEMPLATES } from '../data/templates';
import { COUNTRIES } from '../utils/holidayUtils';
import {
  Presentation,
  Copy,
  Download,
  Maximize2,
  Palette,
  Sparkles,
  Check,
  Globe2,
  FolderKanban,
  Plus,
  Share2,
} from 'lucide-react';
import { toBlob } from 'html-to-image';
import confetti from 'canvas-confetti';

interface NavbarProps {
  plan: ProjectPlan;
  onUpdatePlan: (plan: ProjectPlan) => void;
  onOpenExportModal: () => void;
  onOpenPresenterModal: () => void;
  onOpenProjectManager: () => void;
  onOpenShareModal: () => void;
  projects: SavedProject[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  timelineContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const Navbar: React.FC<NavbarProps> = ({
  plan,
  onUpdatePlan,
  onOpenExportModal,
  onOpenPresenterModal,
  onOpenProjectManager,
  onOpenShareModal,
  projects,
  activeProjectId,
  onSelectProject,
  timelineContainerRef,
}) => {
  const [quickCopied, setQuickCopied] = React.useState(false);

  const handleQuickCopy = async () => {
    if (!timelineContainerRef.current) return;
    try {
      const blob = await toBlob(timelineContainerRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
      });

      if (blob && navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setQuickCopied(true);
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
        setTimeout(() => setQuickCopied(false), 3000);
      } else {
        onOpenExportModal();
      }
    } catch (err) {
      onOpenExportModal();
    }
  };

  const currentCountry =
    COUNTRIES.find((c) => c.code === plan.settings.calendar?.country) || COUNTRIES[0];

  return (
    <header className="bg-white dark:bg-[#0B1521] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-4 lg:px-8 py-2.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Branding & Saved Projects Quick Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0070F2] text-white flex items-center justify-center shadow-xs font-bold text-sm">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-slate-900 dark:text-white font-['Outfit',sans-serif] leading-tight flex items-center gap-1.5">
                <span>Planificador SAP</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#0070F2]">
                  S/4HANA
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-none">
                Cronograma Ejecutivo
              </div>
            </div>
          </div>

          {/* Project Switcher & Manager Button */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              id="btn-open-project-manager"
              onClick={onOpenProjectManager}
              title="Abrir Gestor de Proyectos Guardados"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 text-[#0070F2] dark:text-blue-400 font-bold text-xs shadow-2xs hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span className="max-w-[130px] sm:max-w-[170px] truncate">
                {plan.settings.title || 'Mis Proyectos'}
              </span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#0070F2] dark:text-blue-300 text-[10px]">
                {projects.length}
              </span>
            </button>

            {/* Quick dropdown switch */}
            <select
              id="quick-project-select"
              value={activeProjectId}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  onOpenProjectManager();
                } else {
                  onSelectProject(e.target.value);
                }
              }}
              title="Cambiar rápidamente de proyecto guardado"
              className="text-xs bg-transparent border-0 font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer pr-1"
            >
              {projects.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {p.name}
                </option>
              ))}
              <option value="__new__" className="font-bold text-[#0070F2]">
                + Crear / Gestionar proyectos...
              </option>
            </select>

            <button
              type="button"
              id="btn-quick-new-project"
              onClick={onOpenProjectManager}
              title="Crear nuevo proyecto"
              className="p-1 text-slate-500 hover:text-[#0070F2] dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Country Calendar & SAP Palette & Export Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          
          {/* Country Quick Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <Globe2 className="w-3.5 h-3.5 text-[#0070F2] ml-1" />
            <select
              id="navbar-country-select"
              value={plan.settings.calendar?.country || 'MX'}
              onChange={(e) =>
                onUpdatePlan({
                  ...plan,
                  settings: {
                    ...plan.settings,
                    calendar: {
                      ...plan.settings.calendar,
                      country: e.target.value as any,
                    },
                  },
                })
              }
              className="text-xs bg-transparent border-0 font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-2"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* SAP Theme Palette Picker */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <Palette className="w-3.5 h-3.5 text-[#0070F2] ml-1" />
            <select
              id="color-theme-select"
              value={plan.settings.themeId}
              onChange={(e) =>
                onUpdatePlan({
                  ...plan,
                  settings: { ...plan.settings, themeId: e.target.value },
                })
              }
              className="text-xs bg-transparent border-0 font-medium text-slate-700 dark:text-slate-200 focus:ring-0 cursor-pointer pr-2"
            >
              {COLOR_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Copy to Clipboard Button */}
          <button
            type="button"
            id="quick-copy-slide-btn"
            onClick={handleQuickCopy}
            title="Copiar imagen directamente para pegar en PowerPoint / Google Slides"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0070F2] hover:bg-[#005FB8] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            {quickCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar Diapositiva</span>
                <span className="sm:hidden">Copiar</span>
              </>
            )}
          </button>

          {/* Compartir Enlace Modal */}
          <button
            type="button"
            id="share-modal-btn"
            onClick={onOpenShareModal}
            className="px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#0070F2] dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Compartir enlace para que otros puedan ver y guardar esta planificación"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir</span>
          </button>

          {/* Full-Screen Presentation Mode */}
          <button
            type="button"
            id="presenter-mode-btn"
            onClick={onOpenPresenterModal}
            title="Modo Pantalla Completa para Proyectar"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden md:inline">Presentar</span>
          </button>

          {/* Export High-Res Modal */}
          <button
            type="button"
            id="export-modal-btn"
            onClick={onOpenExportModal}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1"
            title="Descargar imagen PNG / SVG en alta resolución"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Descargar</span>
          </button>
        </div>
      </div>
    </header>
  );
};

