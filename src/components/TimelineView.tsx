import React from 'react';
import {
  ProjectPlan,
  ComputedStage,
  TimelineBounds,
  MilestoneIconType,
} from '../types';
import { COLOR_THEMES } from '../data/templates';
import { formatPresentationDate } from '../utils/dateUtils';
import { COUNTRIES } from '../utils/holidayUtils';
import {
  Star,
  Flag,
  Rocket,
  CheckCircle2,
  Target,
  Diamond,
  Calendar,
  Layers,
  ChevronDown,
  Globe2,
  Coffee,
} from 'lucide-react';

interface TimelineViewProps {
  plan: ProjectPlan;
  computedStages: ComputedStage[];
  bounds: TimelineBounds;
  isPresentationMode?: boolean;
  timelineContainerRef?: React.RefObject<HTMLDivElement | null>;
  onSelectStage?: (stageId: string) => void;
  selectedStageId?: string | null;
  onUpdatePlan?: (updated: ProjectPlan) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  plan,
  computedStages,
  bounds,
  isPresentationMode = false,
  timelineContainerRef,
  onSelectStage,
  selectedStageId,
  onUpdatePlan,
}) => {
  const currentTheme =
    COLOR_THEMES.find((t) => t.id === plan.settings.themeId) || COLOR_THEMES[0];

  const countryInfo =
    COUNTRIES.find((c) => c.code === plan.settings.calendar?.country) || COUNTRIES[0];

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);

  const renderMilestoneIcon = (icon?: MilestoneIconType, className: string = 'w-5 h-5') => {
    switch (icon) {
      case 'flag':
        return <Flag className={className} />;
      case 'rocket':
        return <Rocket className={className} />;
      case 'check':
        return <CheckCircle2 className={className} />;
      case 'target':
        return <Target className={className} />;
      case 'diamond':
        return <Diamond className={className} />;
      case 'star':
      default:
        return <Star className={`${className} fill-amber-400 text-amber-600`} />;
    }
  };

  const getBackgroundClass = () => {
    switch (plan.settings.backgroundStyle) {
      case 'subtle-slate':
        return 'bg-slate-50';
      case 'navy-dark':
        return 'bg-[#0B1521] text-slate-100';
      case 'sap-fiori':
        return 'bg-[#F5F7FA]';
      case 'white':
      default:
        return 'bg-white';
    }
  };

  const isDarkMode =
    plan.settings.backgroundStyle === 'navy-dark' ||
    plan.settings.themeId === 'sap-horizon-dark';

  const currentWindow = plan.settings.presentationWindow || 'auto';

  return (
    <div
      id="presentation-slide-canvas"
      ref={timelineContainerRef}
      className={`relative w-full rounded-2xl shadow-xs border ${
        isDarkMode
          ? 'border-slate-800 bg-[#0B1521] text-slate-100'
          : `border-slate-200/90 ${getBackgroundClass()}`
      } overflow-hidden transition-all duration-300`}
      style={{
        minHeight: isPresentationMode ? '620px' : 'auto',
      }}
    >
      {/* Slide Header Banner (SAP Fiori Horizon Exec presentation style) */}
      <div
        id="slide-top-header"
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${
          isDarkMode
            ? 'border-slate-800/80 bg-[#102030]'
            : 'border-slate-200/80 bg-white/80 backdrop-blur-sm'
        }`}
      >
        {/* Left: Project Icon & Editable Project Name */}
        <div className="flex items-center gap-3.5 flex-1 min-w-[280px]">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs font-bold text-base flex-shrink-0"
            style={{
              backgroundColor: currentTheme.accentColor + '15',
              color: currentTheme.accentColor,
              border: `1px solid ${currentTheme.accentColor}30`,
            }}
          >
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {onUpdatePlan ? (
                <input
                  type="text"
                  value={plan.settings.companyOrArea || ''}
                  placeholder="Módulo o Área (ej. SAP S/4HANA)"
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        companyOrArea: e.target.value,
                      },
                    })
                  }
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-transparent focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0070F2] ${
                    isDarkMode ? 'text-slate-300' : 'text-[#0070F2]'
                  }`}
                />
              ) : (
                <span
                  className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isDarkMode
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-[#EBF3FC] text-[#0070F2]'
                  }`}
                >
                  {plan.settings.companyOrArea || 'SAP S/4HANA'}
                </span>
              )}
              <span
                className={`text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                • {computedStages.length} Etapas consecutivas
              </span>
            </div>

            {/* Editable Project Name */}
            {onUpdatePlan ? (
              <div className="mt-1">
                <input
                  type="text"
                  value={plan.settings.title}
                  placeholder="Nombre del Proyecto (ej. Mejora procesos importaciones)"
                  onChange={(e) =>
                    onUpdatePlan({
                      ...plan,
                      settings: {
                        ...plan.settings,
                        title: e.target.value,
                      },
                    })
                  }
                  className={`w-full text-lg md:text-xl font-bold tracking-tight font-['Outfit',sans-serif] bg-transparent hover:bg-black/5 dark:hover:bg-white/5 focus:bg-white dark:focus:bg-slate-900 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#0070F2] focus:outline-none ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                />
              </div>
            ) : (
              <h1
                className={`text-xl md:text-2xl font-bold tracking-tight font-['Outfit',sans-serif] ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                {plan.settings.title || 'Mejora procesos importaciones'}
              </h1>
            )}
          </div>
        </div>

        {/* Right Info: Project Start Date Picker & Presentation Window Selector */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          
          {/* Project Start Date Picker (Directly in header) */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isDarkMode
                ? 'bg-slate-900/80 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#0070F2] flex-shrink-0" />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                Inicio:
              </span>
              {onUpdatePlan ? (
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
                  className="font-mono font-bold text-xs bg-transparent border-0 text-[#0070F2] focus:ring-0 p-0 cursor-pointer"
                />
              ) : (
                <span className="font-mono font-bold text-xs">
                  {plan.settings.startDate}
                </span>
              )}
            </div>
          </div>

          {/* Presentation Window Selector (1 Mes, 2 Meses, 3 Meses, Auto) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
              isDarkMode
                ? 'bg-slate-900/80 border-slate-700'
                : 'bg-white border-slate-200 shadow-2xs'
            }`}
            title="Ventana de presentación: cantidad de meses/semanas a proyectar"
          >
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
              Ventana:
            </span>
            {onUpdatePlan ? (
              <select
                id="presentation-window-select"
                value={currentWindow}
                onChange={(e) =>
                  onUpdatePlan({
                    ...plan,
                    settings: {
                      ...plan.settings,
                      presentationWindow: e.target.value as any,
                    },
                  })
                }
                className="text-xs font-bold bg-transparent border-0 text-[#0070F2] focus:ring-0 cursor-pointer pr-1 py-0.5"
              >
                <option value="auto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  Auto (Todas las etapas)
                </option>
                <option value="1_month" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  1 Mes (4-5 sem)
                </option>
                <option value="2_months" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  2 Meses (8-9 sem)
                </option>
                <option value="3_months" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  3 Meses (Trimestre)
                </option>
                <option value="4_months" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  4 Meses (Cuatrimestre)
                </option>
                <option value="6_months" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  6 Meses (Semestre)
                </option>
              </select>
            ) : (
              <span className="font-bold text-xs text-[#0070F2]">
                {currentWindow === '2_months' ? '2 Meses' : currentWindow}
              </span>
            )}
          </div>

          {/* Country Calendar Badge */}
          {plan.settings.calendar && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                isDarkMode
                  ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                  : 'bg-[#F0F6FD] border-[#D0E2FF] text-[#004B99]'
              }`}
              title="Calendario laboral con festivos"
            >
              <span className="text-sm leading-none">{countryInfo.flag}</span>
              <span className="font-medium text-xs">
                {countryInfo.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Roadmap Area: Split Table (Left: Stages List, Right: Interactive Gantt Timeline) */}
      <div className="w-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
        
        {/* LEFT COLUMN: Stages List (Matches SAP Presentation Style) */}
        <div className="w-full md:w-[320px] lg:w-[340px] flex-shrink-0 flex flex-col">
          {/* Header Row */}
          <div
            className={`h-14 px-5 flex items-center gap-2.5 border-b font-medium text-sm ${
              isDarkMode
                ? 'bg-[#102030] border-slate-800 text-slate-200'
                : 'bg-slate-50/90 border-slate-200 text-slate-800'
            }`}
          >
            <ChevronDown className="w-4 h-4 text-slate-400" />
            <div className="w-4 h-4 flex flex-col justify-center gap-0.5">
              <span className="w-full h-0.5 bg-slate-500 rounded"></span>
              <span className="w-full h-0.5 bg-slate-500 rounded"></span>
              <span className="w-full h-0.5 bg-slate-500 rounded"></span>
            </div>
            <span className="font-semibold truncate text-slate-800 dark:text-slate-100">
              {plan.settings.title || 'Etapas del Proyecto'}
            </span>
          </div>

          {/* Stages List Items */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {computedStages.map((stage) => {
              const isSelected = selectedStageId === stage.id;
              return (
                <div
                  key={stage.id}
                  id={`stage-row-left-${stage.id}`}
                  onClick={() => onSelectStage && onSelectStage(stage.id)}
                  className={`h-12 px-5 flex items-center justify-between gap-3 text-sm cursor-pointer transition-colors ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-blue-950/50 font-semibold'
                        : 'bg-blue-50/80 font-semibold'
                      : isDarkMode
                      ? 'hover:bg-slate-900/60'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {stage.isMilestone ? (
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        title="Hito Crítico / Go-Live"
                      >
                        {renderMilestoneIcon(stage.milestoneIcon, 'w-4 h-4 stroke-[2.2]')}
                      </div>
                    ) : (
                      <div
                        className="w-3.5 h-3.5 rounded-sm flex-shrink-0 bg-[#0070F2] shadow-xs"
                        style={{
                          backgroundColor: stage.customColor || undefined,
                        }}
                      />
                    )}
                    <span
                      className={`truncate ${
                        stage.isMilestone
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'font-medium text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>

                  {/* Right duration badge in weeks */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {stage.holidaysEncountered && stage.holidaysEncountered.length > 0 && (
                      <span
                        className="text-[10px] text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60 flex items-center gap-0.5"
                        title={`Festivos en etapa: ${stage.holidaysEncountered.map(h => `${h.date} (${h.name})`).join(', ')}`}
                      >
                        <Coffee className="w-2.5 h-2.5" />
                        {stage.holidaysEncountered.length}
                      </span>
                    )}

                    {plan.settings.showDurationOnBars && (
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-mono ${
                          isDarkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {stage.duration} {stage.durationUnit === 'weeks' ? (stage.duration === 1 ? 'sem' : 'sems') : (stage.duration === 1 ? 'día' : 'días')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Calendar Gantt Timeline */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="min-w-[620px] flex flex-col">
            
            {/* Timeline Header (Months & Weeks) */}
            <div
              className={`h-14 border-b flex relative select-none ${
                isDarkMode
                  ? 'bg-[#102030] border-slate-800 text-slate-300'
                  : 'bg-slate-50/90 border-slate-200 text-slate-700'
              }`}
            >
              {bounds.months.map((month, idx) => (
                <div
                  key={`${month.year}-${month.name}-${idx}`}
                  style={{ width: `${month.widthPercent}%` }}
                  className={`h-full flex flex-col justify-center items-center border-r relative px-2 ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <span className="text-sm font-semibold tracking-wide capitalize text-slate-800 dark:text-slate-200">
                    {month.name}
                  </span>
                  {plan.settings.showWeekNumbers && (
                    <div className="w-full flex justify-between text-[10px] text-slate-600 dark:text-slate-400 px-1 pt-0.5 border-t border-slate-200/50 dark:border-slate-800">
                      {month.weeks.map((w, wIdx) => (
                        <span key={wIdx} className="font-mono">
                          {w.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline Stage Rows */}
            <div className="relative divide-y divide-slate-100 dark:divide-slate-800/70">
              
              {/* Background Grid Vertical Lines */}
              {plan.settings.showGridLines && (
                <div className="absolute inset-0 pointer-events-none flex z-0">
                  {bounds.months.map((month, idx) => (
                    <div
                      key={`grid-${idx}`}
                      style={{ width: `${month.widthPercent}%` }}
                      className={`h-full border-r ${
                        isDarkMode ? 'border-slate-800/80 border-dashed' : 'border-slate-200/80 border-dashed'
                      } flex`}
                    >
                      {plan.settings.showWeekNumbers &&
                        month.weeks.map((_, wIdx) => (
                          <div
                            key={`wgrid-${wIdx}`}
                            className={`flex-1 h-full border-r ${
                              isDarkMode
                                ? 'border-slate-900/60 border-dotted'
                                : 'border-slate-100 border-dotted'
                            } last:border-r-0`}
                          />
                        ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Rows */}
              {computedStages.map((stage) => {
                const isSelected = selectedStageId === stage.id;
                
                return (
                  <div
                    key={stage.id}
                    id={`stage-row-right-${stage.id}`}
                    onClick={() => onSelectStage && onSelectStage(stage.id)}
                    className={`h-12 relative flex items-center cursor-pointer transition-colors z-10 ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-blue-950/30'
                          : 'bg-blue-50/40'
                        : isDarkMode
                        ? 'hover:bg-slate-900/40'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {/* The Stage Timeline Bar: Accurately spans the exact width of the activity */}
                    <div
                      className="absolute h-[30px] flex items-center transition-all duration-200 group"
                      style={{
                        left: `${stage.leftPercent}%`,
                        width: `${stage.widthPercent}%`,
                        minWidth: stage.isMilestone ? '44px' : '10px',
                      }}
                    >
                      {/* Bar Container: Takes 100% of stage.widthPercent */}
                      <div
                        className={`w-full h-full flex-shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.02] ${
                          stage.isMilestone
                            ? `${currentTheme.milestoneColor} rounded-xl shadow-md px-2.5`
                            : `${currentTheme.barColor} ${
                                plan.settings.barStyle === 'pills'
                                  ? 'rounded-full'
                                  : plan.settings.barStyle === 'minimal'
                                  ? 'rounded-sm'
                                  : 'rounded-lg'
                              } shadow-xs px-2`
                        }`}
                        style={{
                          backgroundColor: stage.customColor || undefined,
                        }}
                      >
                        {/* Milestone Inner Content (Star / Go-Live) */}
                        {stage.isMilestone ? (
                          <div className="flex items-center gap-1.5 font-bold">
                            {renderMilestoneIcon(
                              stage.milestoneIcon,
                              'w-5 h-5 stroke-[2.2] animate-pulse'
                            )}
                            {plan.settings.labelPosition === 'inside' && (
                              <span className="text-xs truncate font-bold text-amber-900">
                                {stage.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          // Standard Phase Bar Content
                          <div className="w-full flex items-center justify-between overflow-hidden">
                            {plan.settings.labelPosition === 'inside' && (
                              <span className="text-xs font-semibold truncate px-1 text-white">
                                {stage.name}
                              </span>
                            )}
                            {plan.settings.showProgress && stage.progress !== undefined && stage.progress > 0 && (
                              <span className="text-[10px] font-bold opacity-85 px-1 bg-black/10 rounded">
                                {stage.progress}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Beside Label: Positioned OUTSIDE to the right of the bar so it NEVER squishes the bar */}
                      {plan.settings.labelPosition !== 'inside' && (
                        <div
                          className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 whitespace-nowrap flex items-center gap-2 select-none pointer-events-none z-20"
                        >
                          <span
                            className={`text-sm ${
                              stage.isMilestone
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {stage.name}
                          </span>
                          {plan.settings.showDateBadges && (
                            <span
                              className={`text-[11px] font-normal font-mono ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}
                            >
                              ({formatPresentationDate(stage.computedStartDate)} - {formatPresentationDate(stage.computedEndDate)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Footer / Presenter Notes */}
      <div
        id="slide-bottom-footer"
        className={`px-7 py-3 border-t flex flex-wrap items-center justify-between text-xs gap-3 ${
          isDarkMode
            ? 'border-slate-800/80 bg-[#102030]/60 text-slate-400'
            : 'border-slate-200/80 bg-slate-50/70 text-slate-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#C7E0F8] border border-[#85B8E8]" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Etapas Consecutivas (SAP Fiori)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Hito Crítico / Salida en Vivo</span>
          </div>
          {plan.settings.calendar?.includeHolidays && (
            <div className="flex items-center gap-1 text-slate-500">
              <Globe2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Festivos de {countryInfo.name} contemplados</span>
            </div>
          )}
        </div>

        <div className="font-mono text-[11px] text-slate-500">
          {plan.settings.subtitle || 'Cronograma Ejecutivo'} • SAP S/4HANA
        </div>
      </div>
    </div>
  );
};
