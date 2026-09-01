import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProjectPlan, SavedProject, CountryCode } from './types';
import { TEMPLATES } from './data/templates';
import { computeStagesDates, buildTimelineBounds } from './utils/dateUtils';
import { COUNTRIES } from './utils/holidayUtils';
import {
  loadSavedProjects,
  saveAllProjectsToStorage,
  getStoredActiveProjectId,
  setStoredActiveProjectId,
  createNewProject,
  createSavedProjectRecord,
  calculatePlanTotalWeeks,
} from './utils/projectStore';
import {
  getSharedPlanFromCurrentUrl,
  clearShareParamFromUrl,
} from './utils/shareUtils';
import { Navbar } from './components/Navbar';
import { TimelineView } from './components/TimelineView';
import { StageEditor } from './components/StageEditor';
import { ExportModal } from './components/ExportModal';
import { PresenterModal } from './components/PresenterModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ShareModal } from './components/ShareModal';
import {
  Sparkles,
  Presentation,
  CheckCircle2,
  Layers,
  Globe2,
  Calendar,
  FolderKanban,
  Plus,
  Share2,
  Save,
  Check,
  X,
  Link,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Check if URL has a shared project plan
  const sharedUrlData = useMemo(() => getSharedPlanFromCurrentUrl(), []);

  // Shared banner notification state
  const [sharedBanner, setSharedBanner] = useState<{
    title: string;
    isSaved: boolean;
  } | null>(() => {
    if (sharedUrlData) {
      return {
        title: sharedUrlData.plan.settings.title || 'Cronograma Compartido',
        isSaved: false,
      };
    }
    return null;
  });

  // Load saved projects collection
  const [projects, setProjects] = useState<SavedProject[]>(() => {
    const initial = loadSavedProjects();
    // If opened with a shared plan, add or ensure it's available
    if (sharedUrlData) {
      const sharedPlan = sharedUrlData.plan;
      const sharedId = sharedPlan.settings.id || `proj-shared-${Date.now()}`;
      sharedPlan.settings.id = sharedId;
      const exists = initial.some((p) => p.id === sharedId);
      if (!exists) {
        const record = createSavedProjectRecord(
          sharedPlan,
          sharedId,
          sharedPlan.settings.title || 'Cronograma Compartido'
        );
        const updated = [record, ...initial];
        saveAllProjectsToStorage(updated);
        return updated;
      }
    }
    return initial;
  });

  // Active Project ID
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    if (sharedUrlData) {
      return sharedUrlData.plan.settings.id || `proj-shared-${Date.now()}`;
    }
    const initialProjects = loadSavedProjects();
    return getStoredActiveProjectId(initialProjects);
  });

  // Current active project plan
  const [plan, setPlan] = useState<ProjectPlan>(() => {
    if (sharedUrlData) {
      return sharedUrlData.plan;
    }
    const initialProjects = loadSavedProjects();
    const activeId = getStoredActiveProjectId(initialProjects);
    const found = initialProjects.find((p) => p.id === activeId);
    if (found && found.plan) {
      return found.plan;
    }
    return initialProjects[0]?.plan || JSON.parse(JSON.stringify(TEMPLATES[0].plan));
  });

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPresenterModalOpen, setIsPresenterModalOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPlan, setShareTargetPlan] = useState<ProjectPlan | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync active plan changes back into the projects collection & persist
  useEffect(() => {
    setProjects((prevProjects) => {
      const exists = prevProjects.some((p) => p.id === activeProjectId);
      let updated: SavedProject[];

      if (exists) {
        updated = prevProjects.map((p) => {
          if (p.id === activeProjectId) {
            return {
              ...p,
              name: plan.settings.title || p.name,
              plan: plan,
              stagesCount: plan.stages.length,
              totalDurationWeeks: calculatePlanTotalWeeks(plan),
              country: plan.settings.calendar?.country || 'MX',
              startDate: plan.settings.startDate,
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        });
      } else {
        const newRecord = createSavedProjectRecord(plan, activeProjectId, plan.settings.title);
        updated = [newRecord, ...prevProjects];
      }

      saveAllProjectsToStorage(updated);
      return updated;
    });
  }, [plan, activeProjectId]);

  // Switch active project
  const handleSelectProject = (projectId: string) => {
    const found = projects.find((p) => p.id === projectId);
    if (found) {
      setActiveProjectId(projectId);
      setStoredActiveProjectId(projectId);
      setPlan(JSON.parse(JSON.stringify(found.plan)));
      setSelectedStageId(null);
    }
  };

  // Create brand new project
  const handleCreateProject = (
    name: string,
    templateId: string,
    startDate: string,
    country: CountryCode
  ) => {
    const newProject = createNewProject(name, templateId, startDate, country);
    const updated = [newProject, ...projects];
    setProjects(updated);
    saveAllProjectsToStorage(updated);
    setActiveProjectId(newProject.id);
    setStoredActiveProjectId(newProject.id);
    setPlan(newProject.plan);
    setSelectedStageId(null);
  };

  // Duplicate an existing project
  const handleDuplicateProject = (projectId: string) => {
    const source = projects.find((p) => p.id === projectId);
    if (!source) return;

    const copyPlan: ProjectPlan = JSON.parse(JSON.stringify(source.plan));
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const copyName = `${source.name} (Copia)`;
    copyPlan.settings.id = newId;
    copyPlan.settings.title = copyName;

    const newRecord = createSavedProjectRecord(copyPlan, newId, copyName);
    const updated = [newRecord, ...projects];
    setProjects(updated);
    saveAllProjectsToStorage(updated);
    setActiveProjectId(newId);
    setStoredActiveProjectId(newId);
    setPlan(newRecord.plan);
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) return; // Don't delete if only 1
    const updated = projects.filter((p) => p.id !== projectId);
    setProjects(updated);
    saveAllProjectsToStorage(updated);

    if (activeProjectId === projectId) {
      const nextActive = updated[0];
      if (nextActive) {
        setActiveProjectId(nextActive.id);
        setStoredActiveProjectId(nextActive.id);
        setPlan(JSON.parse(JSON.stringify(nextActive.plan)));
      }
    }
  };

  // Rename project
  const handleRenameProject = (projectId: string, newName: string) => {
    setProjects((prev) => {
      const updated = prev.map((p) => {
        if (p.id === projectId) {
          const updatedPlan = {
            ...p.plan,
            settings: { ...p.plan.settings, title: newName },
          };
          return {
            ...p,
            name: newName,
            plan: updatedPlan,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      saveAllProjectsToStorage(updated);
      return updated;
    });

    if (projectId === activeProjectId) {
      setPlan((prevPlan) => ({
        ...prevPlan,
        settings: { ...prevPlan.settings, title: newName },
      }));
    }
  };

  // Save current project state as a new independent project copy
  const handleSaveCurrentAsCopy = (newName: string) => {
    const copyPlan: ProjectPlan = JSON.parse(JSON.stringify(plan));
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    copyPlan.settings.id = newId;
    copyPlan.settings.title = newName;

    const newRecord = createSavedProjectRecord(copyPlan, newId, newName);
    const updated = [newRecord, ...projects];
    setProjects(updated);
    saveAllProjectsToStorage(updated);
    setActiveProjectId(newId);
    setStoredActiveProjectId(newId);
    setPlan(newRecord.plan);
  };

  // Explicit Save Shared Plan to My Projects
  const handleSaveSharedPlanToLocal = () => {
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const savedName = plan.settings.title || 'Plan de Proyecto Compartido';
    const planToSave: ProjectPlan = {
      ...plan,
      settings: {
        ...plan.settings,
        id: newId,
        title: savedName,
      },
    };

    const newRecord = createSavedProjectRecord(planToSave, newId, savedName);
    const updated = [newRecord, ...projects.filter((p) => p.id !== activeProjectId)];
    setProjects(updated);
    saveAllProjectsToStorage(updated);
    setActiveProjectId(newId);
    setStoredActiveProjectId(newId);
    setPlan(newRecord.plan);
    setSharedBanner({ title: savedName, isSaved: true });

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.2 },
      colors: ['#0070F2', '#36D399', '#38BDF8'],
    });
  };

  // Trigger share modal for current active plan
  const handleOpenShareCurrent = () => {
    setShareTargetPlan(plan);
    setIsShareModalOpen(true);
  };

  // Trigger share modal for a specific plan (e.g. from ProjectManager)
  const handleOpenShareSpecific = (targetPlan: ProjectPlan) => {
    setShareTargetPlan(targetPlan);
    setIsShareModalOpen(true);
  };

  // Import plan from JSON file
  const handleImportPlan = (importedPlan: ProjectPlan) => {
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const importedName = importedPlan.settings.title || 'Plan Importado';
    importedPlan.settings.id = newId;

    const newRecord = createSavedProjectRecord(importedPlan, newId, importedName);
    const updated = [newRecord, ...projects];
    setProjects(updated);
    saveAllProjectsToStorage(updated);
    setActiveProjectId(newId);
    setStoredActiveProjectId(newId);
    setPlan(newRecord.plan);
    setSelectedStageId(null);
  };

  // Compute stage dates & timeline bounds reactively with country holidays and consecutive scheduling
  const { computedStages, bounds } = useMemo(() => {
    const { computedStages, minDate, maxDate, totalDays } = computeStagesDates(
      plan.settings.startDate,
      plan.stages,
      plan.settings.calendar,
      plan.settings.presentationWindow
    );
    const bounds = buildTimelineBounds(minDate, maxDate, totalDays);
    return { computedStages, bounds };
  }, [plan.settings.startDate, plan.stages, plan.settings.calendar, plan.settings.presentationWindow]);

  const countryInfo =
    COUNTRIES.find((c) => c.code === plan.settings.calendar?.country) || COUNTRIES[0];

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-[#070E17] text-slate-900 dark:text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Shared Plan Banner if loaded from shared URL */}
      {sharedBanner && (
        <div
          id="shared-project-alert-banner"
          className="bg-gradient-to-r from-blue-600 via-[#0070F2] to-indigo-600 text-white px-4 py-2.5 text-xs shadow-md flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="p-1 rounded bg-white/20 text-white">
              <Share2 className="w-3.5 h-3.5" />
            </span>
            <span>
              Estás visualizando una planificación compartida:{' '}
              <strong className="underline underline-offset-2">{sharedBanner.title}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!sharedBanner.isSaved ? (
              <button
                type="button"
                id="btn-save-shared-to-my-projects"
                onClick={handleSaveSharedPlanToLocal}
                className="px-3 py-1 rounded-lg bg-white text-[#0070F2] hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar en Mis Proyectos</span>
              </button>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
                <Check className="w-3.5 h-3.5" />
                <span>¡Guardado en tu navegador!</span>
              </span>
            )}

            <button
              type="button"
              id="btn-re-share-link"
              onClick={handleOpenShareCurrent}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <Link className="w-3.5 h-3.5" />
              <span>Reenviar Enlace</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSharedBanner(null);
                clearShareParamFromUrl();
              }}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top App Header */}
      <Navbar
        plan={plan}
        onUpdatePlan={setPlan}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenPresenterModal={() => setIsPresenterModalOpen(true)}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
        onOpenShareModal={handleOpenShareCurrent}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        timelineContainerRef={timelineContainerRef}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* Context Banner: SAP S/4HANA & Consecutive & Country Calendar & Active Project */}
        <div className="bg-white dark:bg-[#0F1E2E] rounded-2xl p-4 md:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EBF3FC] dark:bg-[#162D44] text-[#0070F2] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                  {plan.settings.title || 'Cronograma de Proyecto SAP S/4HANA'}
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  Actividades Consecutivas
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-[#0070F2] dark:text-blue-300">
                  {plan.stages.length} etapas
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calcula automáticamente las fechas de cada etapa en semanas respetando fines de semana y festivos oficiales de{' '}
                <strong>{countryInfo.name}</strong>. Guardado automáticamente y listo para compartir.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <button
              type="button"
              id="banner-share-link-btn"
              onClick={handleOpenShareCurrent}
              className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[#0070F2] dark:text-blue-300 font-semibold flex items-center gap-1.5 border border-blue-200 dark:border-blue-800/80 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Compartir Enlace</span>
            </button>

            <button
              type="button"
              id="banner-manage-projects-btn"
              onClick={() => setIsProjectManagerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5 text-[#0070F2]" />
              <span>Mis Proyectos ({projects.length})</span>
            </button>

            <div className="px-3 py-1.5 rounded-lg bg-[#EBF3FC] dark:bg-[#122A44] text-[#004B99] dark:text-[#99C5FF] font-semibold flex items-center gap-1.5 border border-[#C7E0F8] dark:border-[#1E436D]">
              <Globe2 className="w-3.5 h-3.5 text-[#0070F2]" />
              <span>{countryInfo.flag} {countryInfo.name}</span>
            </div>
          </div>
        </div>

        {/* TOP SECTION: The Visual Presentation Canvas */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0070F2]" />
              Vista Previa de la Diapositiva (SAP S/4HANA)
            </h3>
            <span className="text-[11px] text-slate-400">
              Formato ejecutivo de alta fidelidad para proyectar
            </span>
          </div>

          <TimelineView
            plan={plan}
            computedStages={computedStages}
            bounds={bounds}
            timelineContainerRef={timelineContainerRef}
            onSelectStage={(id) => setSelectedStageId(id)}
            selectedStageId={selectedStageId}
            onUpdatePlan={setPlan}
          />
        </section>

        {/* BOTTOM SECTION: Interactive ALV Editor */}
        <section className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0070F2]" />
              ALV Grid de Etapas, Duraciones en Semanas & Calendario
            </h3>
            <span className="text-[11px] text-slate-400">
              Edición compacta y cálculo en tiempo real
            </span>
          </div>

          <StageEditor
            plan={plan}
            computedStages={computedStages}
            onUpdatePlan={setPlan}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
          />
        </section>
      </main>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareTargetPlan(null);
        }}
        plan={shareTargetPlan || plan}
        onImportPlan={handleImportPlan}
      />

      <ProjectManagerModal
        isOpen={isProjectManagerOpen}
        onClose={() => setIsProjectManagerOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onRenameProject={handleRenameProject}
        onSaveCurrentAsCopy={handleSaveCurrentAsCopy}
        onShareProject={handleOpenShareSpecific}
        currentPlan={plan}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        plan={plan}
        onImportPlan={(imported) => {
          setPlan(imported);
          setIsExportModalOpen(false);
        }}
        onOpenShareModal={handleOpenShareCurrent}
        timelineContainerRef={timelineContainerRef}
      />

      <PresenterModal
        isOpen={isPresenterModalOpen}
        onClose={() => setIsPresenterModalOpen(false)}
        plan={plan}
        computedStages={computedStages}
        bounds={bounds}
      />
    </div>
  );
}


