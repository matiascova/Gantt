import React, { useState } from 'react';
import { ProjectPlan, SavedProject, CountryCode } from '../types';
import { TEMPLATES } from '../data/templates';
import { COUNTRIES } from '../utils/holidayUtils';
import {
  FolderKanban,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Clock,
  Search,
  Check,
  Globe2,
  Sparkles,
  X,
  FileDown,
  FileUp,
  ArrowRight,
  ShieldAlert,
  Share2,
} from 'lucide-react';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: SavedProject[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (
    name: string,
    templateId: string,
    startDate: string,
    country: CountryCode
  ) => void;
  onDuplicateProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRenameProject: (projectId: string, newName: string) => void;
  onSaveCurrentAsCopy: (newName: string) => void;
  onShareProject?: (plan: ProjectPlan) => void;
  currentPlan: ProjectPlan;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onRenameProject,
  onSaveCurrentAsCopy,
  onShareProject,
  currentPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'new' | 'save_copy'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Project Form State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState('sap-s4hana-implementation');
  const [newProjectStartDate, setNewProjectStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [newProjectCountry, setNewProjectCountry] = useState<CountryCode>('MX');

  // Save Copy Form State
  const [copyProjectName, setCopyProjectName] = useState('');

  // Inline Rename State
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCreateNew = () => {
    setActiveTab('new');
    setNewProjectName('Nuevo Proyecto SAP S/4HANA');
    setNewProjectStartDate(new Date().toISOString().split('T')[0]);
  };

  const handleStartSaveCopy = () => {
    setActiveTab('save_copy');
    setCopyProjectName(`${currentPlan.settings.title || 'Proyecto'} (Copia ${new Date().toLocaleDateString()})`);
  };

  const submitCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onCreateProject(
      newProjectName.trim(),
      newProjectTemplate,
      newProjectStartDate,
      newProjectCountry
    );
    setActiveTab('list');
    onClose();
  };

  const submitSaveCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copyProjectName.trim()) return;
    onSaveCurrentAsCopy(copyProjectName.trim());
    setActiveTab('list');
    onClose();
  };

  const handleStartRename = (project: SavedProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const submitRename = (projectId: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) {
      onRenameProject(projectId, editingName.trim());
    }
    setEditingProjectId(null);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      id="project-manager-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="project-manager-modal-content"
        className="bg-white dark:bg-[#0F1E2E] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0B1521]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF3FC] dark:bg-[#162D44] text-[#0070F2] flex items-center justify-center font-bold">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-['Outfit',sans-serif]">
                Gestor de Proyectos y Cronogramas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guarda, crea nuevas planificaciones y cambia entre proyectos guardados
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-project-manager"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1E2E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
            <button
              type="button"
              id="tab-projects-list"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-700 text-[#0070F2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Mis Proyectos ({projects.length})</span>
            </button>

            <button
              type="button"
              id="tab-new-project"
              onClick={handleStartCreateNew}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'new'
                  ? 'bg-white dark:bg-slate-700 text-[#0070F2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#0070F2]" />
              <span>+ Nuevo Proyecto</span>
            </button>

            <button
              type="button"
              id="tab-save-copy"
              onClick={handleStartSaveCopy}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'save_copy'
                  ? 'bg-white dark:bg-slate-700 text-[#0070F2] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Guardar Copia</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                id="search-projects-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar proyecto..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0070F2]"
              />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* TAB 1: LIST OF SAVED PROJECTS */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      No se encontraron proyectos
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery
                        ? 'No hay proyectos que coincidan con la búsqueda.'
                        : 'Crea tu primer proyecto para empezar.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartCreateNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0070F2] text-white text-xs font-semibold shadow-xs hover:bg-[#005FB8]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Nuevo Proyecto</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredProjects.map((project) => {
                    const isActive = project.id === activeProjectId;
                    const country =
                      COUNTRIES.find((c) => c.code === project.country) || COUNTRIES[0];

                    return (
                      <div
                        key={project.id}
                        id={`project-card-${project.id}`}
                        onClick={() => {
                          onSelectProject(project.id);
                          onClose();
                        }}
                        className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'bg-blue-50/70 dark:bg-blue-950/30 border-[#0070F2] shadow-xs'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 hover:shadow-xs'
                        }`}
                      >
                        {/* Left: Project Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {editingProjectId === project.id ? (
                              <form
                                onSubmit={(e) => submitRename(project.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  autoFocus
                                  className="px-2 py-0.5 text-sm font-bold bg-white dark:bg-slate-800 border border-[#0070F2] rounded text-slate-900 dark:text-white focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="p-1 rounded bg-[#0070F2] text-white"
                                  title="Guardar nombre"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            ) : (
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                                <span>{project.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRename(project, e)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-opacity"
                                  title="Renombrar proyecto"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </h3>
                            )}

                            {isActive && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0070F2] text-white flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                <span>Abierto</span>
                              </span>
                            )}
                          </div>

                          {/* Metadata Tags */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-[#0070F2]" />
                              <span>Inicio: {project.startDate || 'No definida'}</span>
                            </span>

                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-[#0070F2]" />
                              <span>{project.totalDurationWeeks} semanas</span>
                            </span>

                            <span className="flex items-center gap-1 font-mono">
                              <Layers className="w-3 h-3 text-[#0070F2]" />
                              <span>{project.stagesCount} etapas</span>
                            </span>

                            <span className="flex items-center gap-1">
                              <span>{country.flag}</span>
                              <span>{country.name}</span>
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400">
                            Modificado: {formatDateTime(project.updatedAt)}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div
                          className="flex items-center gap-1.5 self-end sm:self-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isActive && (
                            <button
                              type="button"
                              id={`btn-open-project-${project.id}`}
                              onClick={() => {
                                onSelectProject(project.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#0070F2] hover:bg-[#005FB8] text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                            >
                              <span>Cargar</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            id={`btn-share-project-${project.id}`}
                            onClick={() => {
                              if (onShareProject) {
                                onShareProject(project.plan);
                              }
                            }}
                            title="Compartir enlace de este proyecto"
                            className="p-2 rounded-lg text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            id={`btn-duplicate-project-${project.id}`}
                            onClick={() => onDuplicateProject(project.id)}
                            title="Duplicar proyecto"
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          {confirmDeleteId === project.id ? (
                            <div className="flex items-center gap-1 bg-red-50 dark:bg-red-950/60 p-1 rounded-lg border border-red-200 dark:border-red-900">
                              <span className="text-[10px] text-red-600 dark:text-red-300 font-bold px-1">
                                ¿Borrar?
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteProject(project.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold"
                              >
                                Sí
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              id={`btn-delete-project-${project.id}`}
                              disabled={projects.length <= 1}
                              onClick={() => setConfirmDeleteId(project.id)}
                              title={
                                projects.length <= 1
                                  ? 'No puedes borrar el único proyecto activo'
                                  : 'Eliminar proyecto'
                              }
                              className={`p-2 rounded-lg transition-colors ${
                                projects.length <= 1
                                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                  : 'text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CREATE NEW PROJECT */}
          {activeTab === 'new' && (
            <form onSubmit={submitCreateNew} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nombre del Nuevo Proyecto
                </label>
                <input
                  type="text"
                  id="new-project-name-input"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ej. Implementación SAP S/4HANA Logística"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0070F2] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0070F2]" />
                    <span>Fecha de Inicio</span>
                  </label>
                  <input
                    type="date"
                    id="new-project-date-input"
                    required
                    value={newProjectStartDate}
                    onChange={(e) => setNewProjectStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-[#0070F2] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5 text-[#0070F2]" />
                    <span>País y Calendario</span>
                  </label>
                  <select
                    id="new-project-country-select"
                    value={newProjectCountry}
                    onChange={(e) => setNewProjectCountry(e.target.value as CountryCode)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0070F2] focus:outline-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#0070F2]" />
                  <span>Plantilla Base Inicial</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {TEMPLATES.map((tmpl) => (
                    <label
                      key={tmpl.id}
                      className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                        newProjectTemplate === tmpl.id
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-[#0070F2] ring-1 ring-[#0070F2]'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {tmpl.name}
                        </span>
                        <input
                          type="radio"
                          name="new-template"
                          checked={newProjectTemplate === tmpl.id}
                          onChange={() => setNewProjectTemplate(tmpl.id)}
                          className="text-[#0070F2] focus:ring-[#0070F2] mt-0.5"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {tmpl.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-create-project-submit"
                  className="px-5 py-2 rounded-xl bg-[#0070F2] hover:bg-[#005FB8] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear y Abrir Cronograma</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: SAVE CURRENT AS COPY */}
          {activeTab === 'save_copy' && (
            <form onSubmit={submitSaveCopy} className="space-y-4 max-w-md mx-auto py-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs space-y-1">
                <div className="font-bold text-[#0070F2] dark:text-blue-400 flex items-center gap-1.5">
                  <Copy className="w-4 h-4" />
                  <span>Guardar Copia del Proyecto Actual</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Crea un nuevo proyecto independiente con todas las etapas, fechas, duraciones y ajustes actuales.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Nombre de la Copia
                </label>
                <input
                  type="text"
                  id="copy-project-name-input"
                  required
                  value={copyProjectName}
                  onChange={(e) => setCopyProjectName(e.target.value)}
                  placeholder="Ej. Plan Proyecto v2 (Revisado)"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#0070F2] focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-copy-submit"
                  className="px-5 py-2 rounded-xl bg-[#0070F2] hover:bg-[#005FB8] text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>Guardar como Nuevo Proyecto</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1521] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span>{projects.length} {projects.length === 1 ? 'proyecto guardado' : 'proyectos guardados'}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Almacenamiento Local Activo
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
