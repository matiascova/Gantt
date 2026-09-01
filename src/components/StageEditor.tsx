import React, { useState, useMemo } from 'react';
import {
  ProjectPlan,
  Stage,
  ComputedStage,
  DurationUnit,
  StartType,
  MilestoneIconType,
  CountryCode,
} from '../types';
import { COLOR_THEMES } from '../data/templates';
import { COUNTRIES, getCountryHolidays } from '../utils/holidayUtils';
import {
  formatPresentationDate,
  formatDateISO,
  parseDate,
  calculateWorkingDaysBetween,
  calculateWorkingDaysSpan,
} from '../utils/dateUtils';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Flag,
  Rocket,
  CheckCircle2,
  Target,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
  Globe2,
  Palette,
  Coffee,
  Check,
  Table as TableIcon,
  Copy,
  Search,
  SlidersHorizontal,
  Sigma,
  Info,
  CalendarDays,
  FileSpreadsheet,
} from 'lucide-react';

interface StageEditorProps {
  plan: ProjectPlan;
  computedStages: ComputedStage[];
  onUpdatePlan: (updated: ProjectPlan) => void;
  selectedStageId: string | null;
  onSelectStage: (id: string | null) => void;
}

export const StageEditor: React.FC<StageEditorProps> = ({
  plan,
  computedStages,
  onUpdatePlan,
  selectedStageId,
  onSelectStage,
}) => {
  const [activeTab, setActiveTab] = useState<'alv' | 'calendar' | 'settings'>('alv');
  const [searchFilter, setSearchFilter] = useState('');
  const [density, setDensity] = useState<'compact' | 'normal'>('compact');

  // Handle stage property updates
  const handleUpdateStage = (id: string, updates: Partial<Stage>) => {
    const updatedStages = plan.stages.map((st) =>
      st.id === id ? { ...st, ...updates } : st
    );
    onUpdatePlan({ ...plan, stages: updatedStages });
  };

  // Handle switching start behavior (auto vs fecha fija vs desfase)
  const handleStartTypeChange = (stageId: string, newStartType: StartType) => {
    const stage = plan.stages.find((s) => s.id === stageId);
    const computed = computedStages.find((c) => c.id === stageId);
    if (!stage) return;

    if (newStartType === 'custom_date') {
      const startStr =
        stage.customStartDate ||
        (computed ? formatDateISO(computed.computedStartDate) : plan.settings.startDate);
      const endStr =
        stage.customEndDate ||
        (computed ? formatDateISO(computed.computedEndDate) : startStr);
      handleUpdateStage(stageId, {
        startType: 'custom_date',
        customStartDate: startStr,
        customEndDate: endStr,
      });
    } else {
      handleUpdateStage(stageId, {
        startType: newStartType,
        customStartDate: undefined,
        customEndDate: undefined,
      });
    }
  };

  // Handle fixed start or end date change with automatic recalculation of working days & duration
  const handleFixedDateChange = (
    stageId: string,
    field: 'customStartDate' | 'customEndDate',
    newDateStr: string
  ) => {
    const stage = plan.stages.find((s) => s.id === stageId);
    if (!stage) return;

    const currentComputed = computedStages.find((c) => c.id === stageId);
    const startStr =
      field === 'customStartDate'
        ? newDateStr
        : stage.customStartDate ||
          (currentComputed
            ? formatDateISO(currentComputed.computedStartDate)
            : plan.settings.startDate);

    let endStr =
      field === 'customEndDate'
        ? newDateStr
        : stage.customEndDate ||
          (currentComputed
            ? formatDateISO(currentComputed.computedEndDate)
            : startStr);

    if (startStr && endStr && endStr < startStr) {
      if (field === 'customStartDate') {
        endStr = startStr;
      } else {
        endStr = startStr;
      }
    }

    // Build holiday map for accurate duration recalculation
    const baseYear = parseDate(startStr).getFullYear();
    const holidaysMap = new Map<string, string>();
    if (plan.settings.calendar?.includeHolidays && plan.settings.calendar.country !== 'NONE') {
      for (let y = baseYear - 1; y <= baseYear + 4; y++) {
        const list = getCountryHolidays(plan.settings.calendar.country, y);
        for (const h of list) {
          holidaysMap.set(h.date, h.name);
        }
      }
    }
    if (plan.settings.calendar?.customHolidays) {
      for (const d of plan.settings.calendar.customHolidays) {
        holidaysMap.set(d, 'Festivo personalizado');
      }
    }

    const fixedResult = calculateWorkingDaysBetween(
      parseDate(startStr),
      parseDate(endStr),
      plan.settings.calendar,
      holidaysMap
    );

    const workingDaysPerWeek = plan.settings.calendar?.workingDaysPerWeek || 5;
    const calculatedDuration =
      stage.durationUnit === 'weeks'
        ? Math.max(0.5, Math.round((fixedResult.workingDaysCount / workingDaysPerWeek) * 10) / 10)
        : Math.max(1, fixedResult.workingDaysCount);

    handleUpdateStage(stageId, {
      customStartDate: startStr,
      customEndDate: endStr,
      duration: calculatedDuration,
    });
  };

  // Handle duration edit with sync for custom_date
  const handleDurationChange = (stageId: string, newDuration: number) => {
    const stage = plan.stages.find((s) => s.id === stageId);
    if (!stage) return;

    if (stage.startType === 'custom_date' && stage.customStartDate) {
      const workingDaysPerWeek = plan.settings.calendar?.workingDaysPerWeek || 5;
      const targetWorkingDays =
        stage.durationUnit === 'weeks'
          ? Math.max(1, Math.round(newDuration * workingDaysPerWeek))
          : Math.max(1, Math.round(newDuration));
      const effectiveWorkingDays = stage.isMilestone
        ? Math.max(1, targetWorkingDays)
        : targetWorkingDays;

      const baseYear = parseDate(stage.customStartDate).getFullYear();
      const holidaysMap = new Map<string, string>();
      if (plan.settings.calendar?.includeHolidays && plan.settings.calendar.country !== 'NONE') {
        for (let y = baseYear - 1; y <= baseYear + 4; y++) {
          const list = getCountryHolidays(plan.settings.calendar.country, y);
          for (const h of list) {
            holidaysMap.set(h.date, h.name);
          }
        }
      }
      if (plan.settings.calendar?.customHolidays) {
        for (const d of plan.settings.calendar.customHolidays) {
          holidaysMap.set(d, 'Festivo personalizado');
        }
      }

      const { endDate } = calculateWorkingDaysSpan(
        parseDate(stage.customStartDate),
        effectiveWorkingDays,
        plan.settings.calendar,
        holidaysMap
      );

      handleUpdateStage(stageId, {
        duration: newDuration,
        customEndDate: formatDateISO(endDate),
      });
    } else {
      handleUpdateStage(stageId, { duration: newDuration });
    }
  };

  // Add new consecutive stage
  const handleAddStage = () => {
    const newId = 'stage-' + Date.now();
    const newStage: Stage = {
      id: newId,
      name: 'Nueva Etapa',
      duration: 2,
      durationUnit: 'weeks',
      startType: 'sequential', // Consecutive by default
      isMilestone: false,
    };
    onUpdatePlan({ ...plan, stages: [...plan.stages, newStage] });
    onSelectStage(newId);
  };

  // Duplicate stage
  const handleDuplicateStage = (stageId: string) => {
    const targetIdx = plan.stages.findIndex((s) => s.id === stageId);
    if (targetIdx === -1) return;
    const original = plan.stages[targetIdx];
    const duplicated: Stage = {
      ...original,
      id: 'stage-' + Date.now(),
      name: `${original.name} (Copia)`,
    };
    const newStages = [...plan.stages];
    newStages.splice(targetIdx + 1, 0, duplicated);
    onUpdatePlan({ ...plan, stages: newStages });
    onSelectStage(duplicated.id);
  };

  // Delete stage
  const handleDeleteStage = (id: string) => {
    if (plan.stages.length <= 1) return;
    const updatedStages = plan.stages.filter((st) => st.id !== id);
    onUpdatePlan({ ...plan, stages: updatedStages });
    if (selectedStageId === id) onSelectStage(null);
  };

  // Move stage up/down (consecutive order changes immediately)
  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= plan.stages.length) return;

    const newStages = [...plan.stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIdx];
    newStages[targetIdx] = temp;

    onUpdatePlan({ ...plan, stages: newStages });
  };

  // Quick reset to standard SAP S/4HANA stages
  const handleResetStandardSAP = () => {
    const standardStages: Stage[] = [
      {
        id: 's1',
        name: 'Inicio de proyecto',
        duration: 0.5,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
        notes: 'Kickoff y alineación inicial',
      },
      {
        id: 's2',
        name: 'BBP',
        duration: 2,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
        notes: 'Business Blueprint',
      },
      {
        id: 's3',
        name: 'Realización',
        duration: 4,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
        notes: 'Desarrollo y parametrización SAP S/4HANA',
      },
      {
        id: 's4',
        name: 'Pruebas unitarias',
        duration: 1.5,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
      },
      {
        id: 's5',
        name: 'Pruebas Integrales',
        duration: 2,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
      },
      {
        id: 's6',
        name: 'Capacitación',
        duration: 2,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
      },
      {
        id: 's7',
        name: 'Cut Over',
        duration: 1,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: false,
      },
      {
        id: 's8',
        name: 'Salida en vivo',
        duration: 1,
        durationUnit: 'weeks',
        startType: 'sequential',
        isMilestone: true,
        milestoneIcon: 'star',
      },
    ];
    onUpdatePlan({ ...plan, stages: standardStages });
  };

  const currentYear = parseDate(plan.settings.startDate).getFullYear();
  const detectedHolidays = getCountryHolidays(plan.settings.calendar?.country || 'MX', currentYear);

  // Totals for ALV summary footer
  const totalStats = useMemo(() => {
    let totalWeeks = 0;
    let totalWorkingDays = 0;
    let totalCalendarDays = 0;
    let totalHolidays = 0;

    for (const st of computedStages) {
      if (st.durationUnit === 'weeks') {
        totalWeeks += st.duration;
      } else {
        totalWeeks += st.duration / (plan.settings.calendar?.workingDaysPerWeek || 5);
      }
      totalWorkingDays += st.workingDaysCount || 0;
      totalCalendarDays += st.durationDays || 0;
      totalHolidays += st.holidaysEncountered?.length || 0;
    }

    return {
      totalWeeks: parseFloat(totalWeeks.toFixed(1)),
      totalWorkingDays,
      totalCalendarDays,
      totalHolidays,
      totalCount: plan.stages.length,
    };
  }, [computedStages, plan.stages.length, plan.settings.calendar?.workingDaysPerWeek]);

  // Filtered stages for ALV search
  const filteredStages = useMemo(() => {
    if (!searchFilter.trim()) return plan.stages;
    const q = searchFilter.toLowerCase();
    return plan.stages.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.responsible && s.responsible.toLowerCase().includes(q))
    );
  }, [plan.stages, searchFilter]);

  return (
    <div className="bg-white dark:bg-[#0F1E2E] rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top ALV Tab Bar & SAP System Status */}
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/90 dark:bg-[#132438]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            id="tab-alv-grid-btn"
            onClick={() => setActiveTab('alv')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'alv'
                ? 'bg-[#0070F2] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>ALV Grid de Etapas ({plan.stages.length})</span>
          </button>

          <button
            type="button"
            id="tab-calendar-btn"
            onClick={() => setActiveTab('calendar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'calendar'
                ? 'bg-[#0070F2] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>Calendario & Festivos ({COUNTRIES.find(c => c.code === plan.settings.calendar?.country)?.flag || '🌐'})</span>
          </button>

          <button
            type="button"
            id="tab-settings-btn"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-[#0070F2] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Paleta SAP & Opciones</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="quick-reset-standard-btn"
            onClick={handleResetStandardSAP}
            title="Cargar catálogo oficial de etapas SAP S/4HANA"
            className="text-[11px] text-[#0070F2] hover:underline flex items-center gap-1 font-semibold px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hitos SAP Estándar</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SAP ALV GRID (ABAP List Viewer) */}
      {activeTab === 'alv' && (
        <div className="flex flex-col">
          
          {/* SAP Project Header Parameters (Nombre, Fecha Inicio, Ventana de Presentación, Calendario) */}
          <div className="p-3.5 bg-slate-50/70 dark:bg-[#0B1521]/80 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Project Name */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0070F2]" />
                <span>Nombre del Proyecto</span>
              </label>
              <input
                type="text"
                id="input-project-title-alv"
                value={plan.settings.title}
                onChange={(e) =>
                  onUpdatePlan({
                    ...plan,
                    settings: { ...plan.settings, title: e.target.value },
                  })
                }
                placeholder="Ej. Mejora procesos importaciones"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-[#0070F2] focus:border-[#0070F2] shadow-2xs"
              />
            </div>

            {/* 2. Project Start Date */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <CalendarDays className="w-3.5 h-3.5 text-[#0070F2]" />
                <span>Fecha de Inicio del Proyecto</span>
              </label>
              <input
                type="date"
                id="input-project-startdate-alv"
                value={plan.settings.startDate}
                onChange={(e) =>
                  onUpdatePlan({
                    ...plan,
                    settings: { ...plan.settings, startDate: e.target.value },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-xs focus:ring-1 focus:ring-[#0070F2] focus:border-[#0070F2] shadow-2xs"
              />
            </div>

            {/* 3. Presentation Window (Zoom / Horizon) */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-[#0070F2]" />
                <span>Ventana de Presentación</span>
              </label>
              <select
                id="input-presentation-window-alv"
                value={plan.settings.presentationWindow || 'auto'}
                onChange={(e) =>
                  onUpdatePlan({
                    ...plan,
                    settings: {
                      ...plan.settings,
                      presentationWindow: e.target.value as any,
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[#0070F2] font-semibold text-xs focus:ring-1 focus:ring-[#0070F2] focus:border-[#0070F2] shadow-2xs cursor-pointer"
              >
                <option value="auto">Auto (Todas las etapas calculadas)</option>
                <option value="1_month">1 Mes (~4-5 semanas)</option>
                <option value="2_months">2 Meses (~8-9 semanas)</option>
                <option value="3_months">3 Meses (Trimestre / 12-14 semanas)</option>
                <option value="4_months">4 Meses (Cuatrimestre / 17 semanas)</option>
                <option value="6_months">6 Meses (Semestre / 26 semanas)</option>
                <option value="12_months">12 Meses (1 Año completo)</option>
              </select>
            </div>

            {/* 4. Calendar & Country Holidays */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Globe2 className="w-3.5 h-3.5 text-[#0070F2]" />
                <span>País & Festivos Oficiales</span>
              </label>
              <select
                id="input-country-calendar-alv"
                value={plan.settings.calendar?.country || 'MX'}
                onChange={(e) =>
                  onUpdatePlan({
                    ...plan,
                    settings: {
                      ...plan.settings,
                      calendar: {
                        ...(plan.settings.calendar || {
                          includeHolidays: true,
                          workingDaysPerWeek: 5,
                        }),
                        country: e.target.value as CountryCode,
                      },
                    },
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium text-xs focus:ring-1 focus:ring-[#0070F2] focus:border-[#0070F2] shadow-2xs cursor-pointer"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SAP ALV Standard Toolbar */}
          <div className="px-3 py-2 bg-[#F5F8FB] dark:bg-[#0B1521] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            
            {/* Left ALV Actions (Insert, Delete, Move Up, Move Down, Duplicate) */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                id="alv-add-row-btn"
                onClick={handleAddStage}
                className="px-2.5 py-1 rounded bg-[#0070F2] hover:bg-[#005FB8] text-white font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                title="Insertar nueva etapa consecutiva en el ALV"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Insertar Etapa</span>
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              {/* Move selected up/down */}
              {selectedStageId && (
                <>
                  {(() => {
                    const idx = plan.stages.findIndex((s) => s.id === selectedStageId);
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'up')}
                          disabled={idx <= 0}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                          title="Subir posición en la secuencia"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Subir</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveStage(idx, 'down')}
                          disabled={idx >= plan.stages.length - 1 || idx === -1}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                          title="Bajar posición en la secuencia"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                          <span className="hidden sm:inline">Bajar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateStage(selectedStageId)}
                          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 font-medium"
                          title="Duplicar etapa seleccionada"
                        >
                          <Copy className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden sm:inline">Duplicar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStage(selectedStageId)}
                          disabled={plan.stages.length <= 1}
                          className="px-2 py-1 rounded border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 disabled:opacity-40 flex items-center gap-1 font-medium"
                          title="Eliminar etapa seleccionada"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Borrar</span>
                        </button>
                      </>
                    );
                  })()}
                </>
              )}

              {/* Density toggle */}
              <button
                type="button"
                onClick={() => setDensity(density === 'compact' ? 'normal' : 'compact')}
                className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
                title="Alternar densidad de filas ALV"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden md:inline">
                  {density === 'compact' ? 'Vista Compacta' : 'Vista Cómoda'}
                </span>
              </button>
            </div>

            {/* Right ALV Quick Search & Status */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filtrar ALV..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs text-slate-800 dark:text-slate-200 w-32 sm:w-40 focus:outline-none focus:ring-1 focus:ring-[#0070F2]"
                />
              </div>

              <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/50 rounded border border-blue-200 dark:border-blue-900 text-[#004B99] dark:text-[#99C5FF] font-semibold text-[11px]">
                <Sigma className="w-3 h-3 text-[#0070F2]" />
                <span>{totalStats.totalWeeks} Semanas totales</span>
              </div>
            </div>
          </div>

          {/* ALV Table Grid */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[860px]">
              {/* ALV Column Headers (SAP Table Header style) */}
              <thead>
                <tr className="bg-[#E9EEF4] dark:bg-[#16273B] text-slate-700 dark:text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 dark:border-slate-700 select-none">
                  <th className="py-2 px-2.5 text-center w-10 border-r border-slate-200 dark:border-slate-700">
                    Pos
                  </th>
                  <th className="py-2 px-2 text-center w-14 border-r border-slate-200 dark:border-slate-700">
                    Tipo
                  </th>
                  <th className="py-2 px-3 border-r border-slate-200 dark:border-slate-700 min-w-[200px]">
                    Denominación / Etapa
                  </th>
                  <th className="py-2 px-2 text-center w-28 border-r border-slate-200 dark:border-slate-700">
                    Duración
                  </th>
                  <th className="py-2 px-2 text-center w-24 border-r border-slate-200 dark:border-slate-700">
                    Unidad
                  </th>
                  <th className="py-2 px-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700">
                    Inicio (Calc)
                  </th>
                  <th className="py-2 px-2.5 text-center w-28 border-r border-slate-200 dark:border-slate-700">
                    Fin (Calc)
                  </th>
                  <th className="py-2 px-2 text-center w-20 border-r border-slate-200 dark:border-slate-700">
                    Días Háb.
                  </th>
                  <th className="py-2 px-2 text-center w-28 border-r border-slate-200 dark:border-slate-700">
                    Comportamiento
                  </th>
                  <th className="py-2 px-2 text-center w-20">
                    Acciones
                  </th>
                </tr>
              </thead>

              {/* ALV Table Body Rows */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredStages.map((stage, idx) => {
                  const isSelected = selectedStageId === stage.id;
                  const computed = computedStages.find((c) => c.id === stage.id);
                  const rowPos = (idx + 1) * 10; // Standard SAP item position (10, 20, 30...)

                  return (
                    <tr
                      key={stage.id}
                      id={`alv-row-${stage.id}`}
                      onClick={() => onSelectStage(stage.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-blue-100/70 dark:bg-blue-950/60 font-semibold'
                          : idx % 2 === 0
                          ? 'bg-white dark:bg-[#0B1521] hover:bg-slate-50 dark:hover:bg-slate-900/50'
                          : 'bg-[#F9FBFC] dark:bg-[#0F1B2B] hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Posición (Pos) */}
                      <td className={`py-1.5 px-2.5 text-center font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800 ${density === 'compact' ? 'py-1' : 'py-2'}`}>
                        {rowPos}
                      </td>

                      {/* Tipo / Hito (Milestone Star or Standard Phase) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStage(stage.id, {
                              isMilestone: !stage.isMilestone,
                              milestoneIcon: stage.milestoneIcon || 'star',
                            });
                          }}
                          className={`w-7 h-7 mx-auto rounded flex items-center justify-center transition-all ${
                            stage.isMilestone
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 border border-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                          }`}
                          title={stage.isMilestone ? 'Hito Crítico / Go-Live' : 'Convertir en Hito'}
                        >
                          {stage.isMilestone ? (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-600" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-xs bg-[#0070F2]" />
                          )}
                        </button>
                      </td>

                      {/* Denominación de la Etapa (Inline Cell Edit) */}
                      <td className="py-1.5 px-3 border-r border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={stage.name}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleUpdateStage(stage.id, { name: e.target.value })
                            }
                            className="w-full bg-transparent hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-[#0070F2] text-slate-900 dark:text-white font-medium text-xs focus:outline-none"
                            placeholder="Nombre de la etapa..."
                          />
                        </div>
                      </td>

                      {/* Duración (Number with quick steppers) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={stage.duration}
                            onChange={(e) =>
                              handleDurationChange(
                                stage.id,
                                Math.max(0.5, parseFloat(e.target.value) || 0.5)
                              )
                            }
                            className="w-16 px-1.5 py-0.5 text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#0070F2]"
                          />
                        </div>
                      </td>

                      {/* Unidad (Semanas / Días) */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <select
                          value={stage.durationUnit}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleUpdateStage(stage.id, {
                              durationUnit: e.target.value as DurationUnit,
                            })
                          }
                          className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none"
                        >
                          <option value="weeks">Semanas</option>
                          <option value="days">Días hábiles</option>
                        </select>
                      </td>

                      {/* Fecha Inicio (Calculada o Input Editable si es Fecha Fija) */}
                      <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                        {stage.startType === 'custom_date' ? (
                          <div
                            className="flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="date"
                              id={`input-startdate-${stage.id}`}
                              value={
                                stage.customStartDate ||
                                (computed ? formatDateISO(computed.computedStartDate) : '')
                              }
                              onChange={(e) =>
                                handleFixedDateChange(
                                  stage.id,
                                  'customStartDate',
                                  e.target.value
                                )
                              }
                              className="w-28 px-1 py-0.5 text-center bg-blue-50/90 dark:bg-blue-950/80 border border-blue-400 dark:border-blue-500 rounded font-mono font-bold text-[#0070F2] dark:text-[#6CB4EE] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#0070F2] cursor-pointer shadow-2xs"
                              title="Fecha fija de inicio para esta etapa"
                            />
                          </div>
                        ) : computed ? (
                          formatPresentationDate(computed.computedStartDate, true)
                        ) : (
                          '...'
                        )}
                      </td>

                      {/* Fecha Fin (Calculada o Input Editable si es Fecha Fija) */}
                      <td className="py-1.5 px-2 text-center font-mono text-[11px] font-semibold text-slate-900 dark:text-white border-r border-slate-200/70 dark:border-slate-800 whitespace-nowrap">
                        {stage.startType === 'custom_date' ? (
                          <div
                            className="flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="date"
                              id={`input-enddate-${stage.id}`}
                              min={stage.customStartDate || undefined}
                              value={
                                stage.customEndDate ||
                                (computed ? formatDateISO(computed.computedEndDate) : '')
                              }
                              onChange={(e) =>
                                handleFixedDateChange(
                                  stage.id,
                                  'customEndDate',
                                  e.target.value
                                )
                              }
                              className="w-28 px-1 py-0.5 text-center bg-blue-50/90 dark:bg-blue-950/80 border border-blue-400 dark:border-blue-500 rounded font-mono font-bold text-[#0070F2] dark:text-[#6CB4EE] text-[11px] focus:outline-none focus:ring-1 focus:ring-[#0070F2] cursor-pointer shadow-2xs"
                              title="Fecha fija de fin para esta etapa"
                            />
                          </div>
                        ) : computed ? (
                          formatPresentationDate(computed.computedEndDate, true)
                        ) : (
                          '...'
                        )}
                      </td>

                      {/* Días Hábiles & Festivos Badge */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                            {computed?.workingDaysCount || '-'}d
                          </span>
                          {computed?.holidaysEncountered && computed.holidaysEncountered.length > 0 && (
                            <span
                              className="text-[10px] bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded font-bold"
                              title={`Festivo(s): ${computed.holidaysEncountered.map(h => `${h.name} (${h.date})`).join(', ')}`}
                            >
                              +{computed.holidaysEncountered.length}f
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Comportamiento de Inicio */}
                      <td className="py-1.5 px-2 text-center border-r border-slate-200/70 dark:border-slate-800">
                        <select
                          value={stage.startType}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            handleStartTypeChange(stage.id, e.target.value as StartType)
                          }
                          className={`w-full px-1.5 py-0.5 rounded text-[11px] font-medium focus:outline-none border transition-colors ${
                            stage.startType === 'custom_date'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-[#0070F2] dark:text-[#6CB4EE] font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <option value="sequential">
                            {idx === 0 ? 'Inicio proyecto' : 'Consecutivo (Auto)'}
                          </option>
                          <option value="custom_date">Fecha fija</option>
                          {idx > 0 && <option value="offset">Desfase (+/-)</option>}
                        </select>
                      </td>

                      {/* Acciones Rápidas */}
                      <td className="py-1.5 px-2 text-center">
                        <div
                          className="flex items-center justify-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                            title="Subir"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, 'down')}
                            disabled={idx === plan.stages.length - 1}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-20"
                            title="Bajar"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStage(stage.id)}
                            disabled={plan.stages.length <= 1}
                            className="p-1 text-rose-400 hover:text-rose-600 disabled:opacity-20"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ALV Footer Summary / Totalizer Row (Pie de tabla ALV estándar) */}
              <tfoot>
                <tr className="bg-[#E9EEF4] dark:bg-[#16273B] text-slate-900 dark:text-slate-100 text-xs font-bold border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={3} className="py-2.5 px-3 border-r border-slate-300 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Sigma className="w-4 h-4 text-[#0070F2]" />
                      <span>TOTAL ALV ({totalStats.totalCount} Registros)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[#0070F2] dark:text-[#4DB1FF] border-r border-slate-300 dark:border-slate-700">
                    {totalStats.totalWeeks} Semanas
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-500 border-r border-slate-300 dark:border-slate-700">
                    -
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] border-r border-slate-300 dark:border-slate-700">
                    {computedStages[0] ? formatPresentationDate(computedStages[0].computedStartDate, true) : ''}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] border-r border-slate-300 dark:border-slate-700">
                    {computedStages[computedStages.length - 1]
                      ? formatPresentationDate(computedStages[computedStages.length - 1].computedEndDate, true)
                      : ''}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono border-r border-slate-300 dark:border-slate-700">
                    {totalStats.totalWorkingDays}d háb.
                  </td>
                  <td colSpan={2} className="py-2.5 px-3 text-slate-500 text-[11px] font-normal text-right">
                    {totalStats.totalHolidays > 0
                      ? `${totalStats.totalHolidays} festivos descontados`
                      : 'Sin festivos en período'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CALENDAR & HOLIDAYS */}
      {activeTab === 'calendar' && (
        <div className="p-4 space-y-4 text-xs">
          {/* Country Selector */}
          <div className="p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-[#0070F2]" />
                País & Días Festivos Oficiales
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0070F2] font-semibold">
                Cálculo automático en ALV
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px]">
              Selecciona el país del proyecto para calcular con exactitud los fines de semana y días no laborales (feriados). Las etapas consecutivas se desplazarán automáticamente evitando días inhábiles.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {COUNTRIES.map((c) => {
                const isSelected = (plan.settings.calendar?.country || 'MX') === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() =>
                      onUpdatePlan({
                        ...plan,
                        settings: {
                          ...plan.settings,
                          calendar: {
                            ...plan.settings.calendar,
                            country: c.code,
                          },
                        },
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'border-[#0070F2] bg-[#EBF3FC] dark:bg-[#122A44] text-[#002B49] dark:text-white font-bold ring-1 ring-[#0070F2]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl leading-none">{c.flag}</span>
                    <div className="truncate">
                      <div className="text-xs truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{c.region}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working week & Holiday toggle */}
          <div className="p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Reglas de la Semana Laboral
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Jornada Laboral por Semana:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 5, label: '5 Días (Lunes a Viernes)' },
                    { val: 6, label: '6 Días (Lunes a Sábado)' },
                    { val: 7, label: '7 Días (Continuo / Corrido)' },
                  ].map((opt) => {
                    const isSelected = (plan.settings.calendar?.workingDaysPerWeek || 5) === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() =>
                          onUpdatePlan({
                            ...plan,
                            settings: {
                              ...plan.settings,
                              calendar: {
                                ...plan.settings.calendar,
                                workingDaysPerWeek: opt.val as 5 | 6 | 7,
                              },
                            },
                          })
                        }
                        className={`py-2 px-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                          isSelected
                            ? 'border-[#0070F2] bg-[#0070F2] text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Coffee className="w-4 h-4 text-amber-600" />
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-white">
                      Tomar en cuenta días festivos del país
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Pausa las actividades durante feriados nacionales y reanuda el siguiente día hábil
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={plan.settings.calendar?.includeHolidays ?? true}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        calendar: {
                          ...plan.settings.calendar,
                          includeHolidays: e.target.checked,
                        },
                      },
                    })
                  }
                  className="w-4 h-4 text-[#0070F2] rounded"
                />
              </label>
            </div>
          </div>

          {/* List of Detected Holidays in the Selected Country */}
          {plan.settings.calendar?.country !== 'NONE' && (
            <div className="p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Festivos detectados para {currentYear} ({detectedHolidays.length}):
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {detectedHolidays.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1 px-2 bg-white dark:bg-slate-800/80 rounded border border-slate-200/60 dark:border-slate-700/60 text-[11px]"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {h.name}
                    </span>
                    <span className="font-mono text-slate-500">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & SAP PALETTES */}
      {activeTab === 'settings' && (
        <div className="p-4 space-y-4 text-xs">
          {/* SAP Color Theme Selector */}
          <div className="p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-[#0070F2]" />
                Paleta de Colores SAP S/4HANA
              </h3>
            </div>

            <div className="space-y-2">
              {COLOR_THEMES.map((theme) => {
                const isSelected = plan.settings.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      onUpdatePlan({
                        ...plan,
                        settings: { ...plan.settings, themeId: theme.id },
                      })
                    }
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-[#0070F2] bg-[#EBF3FC] dark:bg-[#122A44] ring-1 ring-[#0070F2]'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg shadow-xs flex items-center justify-center font-bold text-xs"
                        style={{
                          backgroundColor: theme.accentColor,
                          color: '#FFFFFF',
                        }}
                      >
                        SAP
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {theme.name}
                        </div>
                        <div className="text-[10px] text-slate-500">{theme.sapFamily}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#0070F2] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project Title and Global Start Date */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0070F2]" />
              Datos Generales del Proyecto
            </h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Título del Proyecto (Encabezado para la presentación)
                </label>
                <input
                  type="text"
                  value={plan.settings.title}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: { ...plan.settings, title: e.target.value },
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Fecha de Inicio del Proyecto
                  </label>
                  <input
                    type="date"
                    value={plan.settings.startDate}
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        settings: {
                          ...plan.settings,
                          startDate: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Área o Módulo SAP
                  </label>
                  <input
                    type="text"
                    value={plan.settings.companyOrArea || ''}
                    placeholder="Ej. Cadena de Suministro / MM-SD"
                    onChange={(e) =>
                      onUpdatePlan({
                        ...plan,
                        settings: {
                          ...plan.settings,
                          companyOrArea: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Display Toggles for Slides */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#102030] rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              Opciones Visuales para Presentaciones
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">
                  Mostrar semanas (S1, S2, S3, S4)
                </span>
                <input
                  type="checkbox"
                  checked={plan.settings.showWeekNumbers}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        showWeekNumbers: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-[#0070F2] rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">
                  Mostrar fechas exactas en etiquetas
                </span>
                <input
                  type="checkbox"
                  checked={plan.settings.showDateBadges}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        showDateBadges: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-[#0070F2] rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">
                  Mostrar duración en lista izquierda
                </span>
                <input
                  type="checkbox"
                  checked={plan.settings.showDurationOnBars}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        showDurationOnBars: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-[#0070F2] rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">
                  Líneas guía verticales de meses
                </span>
                <input
                  type="checkbox"
                  checked={plan.settings.showGridLines}
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        showGridLines: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 text-[#0070F2] rounded"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
