import * as XLSX from 'xlsx';
import { ProjectPlan, ComputedStage } from '../types';
import { formatPresentationDate, formatDateISO } from './dateUtils';
import { COUNTRIES, getCountryHolidays } from './holidayUtils';

/**
 * Generates and downloads a complete, professionally formatted Excel workbook (.xlsx)
 * containing the full project schedule, calculated dates, working days, and holidays catalog.
 */
export function exportPlanToExcel(plan: ProjectPlan, computedStages: ComputedStage[]): void {
  const settings = plan.settings;
  const countryInfo = COUNTRIES.find((c) => c.code === settings.calendar?.country) || COUNTRIES[0];
  const workingDaysPerWeek = settings.calendar?.workingDaysPerWeek || 5;

  // 1. Calculate overall summary statistics
  let totalWeeks = 0;
  let totalWorkingDays = 0;
  let totalCalendarDays = 0;
  let totalHolidaysCount = 0;

  for (const st of computedStages) {
    if (st.durationUnit === 'weeks') {
      totalWeeks += st.duration;
    } else {
      totalWeeks += st.duration / workingDaysPerWeek;
    }
    totalWorkingDays += st.workingDaysCount || 0;
    totalCalendarDays += st.durationDays || 0;
    totalHolidaysCount += st.holidaysEncountered?.length || 0;
  }
  totalWeeks = Math.round(totalWeeks * 10) / 10;

  const firstDate = computedStages[0]?.computedStartDate;
  const lastDate = computedStages[computedStages.length - 1]?.computedEndDate;

  // 2. Build Sheet 1: "Cronograma de Etapas"
  const aoaData: any[][] = [];

  // Project Header Block
  aoaData.push(['CRONOGRAMA EJECUTIVO DE PROYECTO', '']);
  aoaData.push(['Proyecto:', settings.title || 'Plan de Proyecto']);
  if (settings.subtitle) {
    aoaData.push(['Subtítulo / Versión:', settings.subtitle]);
  }
  if (settings.companyOrArea) {
    aoaData.push(['Área / Módulo:', settings.companyOrArea]);
  }
  aoaData.push(['Fecha Inicio Global:', settings.startDate]);
  aoaData.push(['Fecha Fin Estimada:', lastDate ? formatDateISO(lastDate) : '-']);
  aoaData.push(['Duración Total Estimada:', `${totalWeeks} Semanas (${totalWorkingDays} días hábiles)`]);
  aoaData.push(['País y Calendario:', `${countryInfo.name} (${countryInfo.flag}) - Jornada de ${workingDaysPerWeek} días/sem`]);
  aoaData.push(['Festivos Contemplados:', settings.calendar?.includeHolidays ? `Sí (${totalHolidaysCount} festivos en período)` : 'No']);
  aoaData.push([]); // Empty row for separation

  // Table Column Headers
  const tableHeaders = [
    'Pos',
    'Tipo',
    'Denominación / Etapa',
    'Duración',
    'Unidad',
    'Inicio (Calc)',
    'Fin (Calc)',
    'Días Hábiles',
    'Días Calendario',
    'Comportamiento',
    'Responsable',
    'Progreso (%)',
    'Festivos en Período',
    'Notas / Observaciones',
  ];
  aoaData.push(tableHeaders);

  // Table Data Rows
  computedStages.forEach((stage, idx) => {
    const rowPos = (idx + 1) * 10;
    const tipo = stage.isMilestone ? 'Hito Crítico' : 'Etapa';
    const unidad = stage.durationUnit === 'weeks' ? 'Semanas' : 'Días hábiles';
    const inicioStr = stage.computedStartDate ? formatPresentationDate(stage.computedStartDate, true) : '';
    const finStr = stage.computedEndDate ? formatPresentationDate(stage.computedEndDate, true) : '';
    
    let comportamiento = 'Consecutivo (Auto)';
    if (stage.startType === 'custom_date') {
      comportamiento = 'Fecha Fija';
    } else if (stage.startType === 'offset') {
      comportamiento = `Desfase (${stage.offsetFromPrevious || 0} ${unidad})`;
    }

    const festivosStr = stage.holidaysEncountered && stage.holidaysEncountered.length > 0
      ? stage.holidaysEncountered.map((h) => `${h.name} (${h.date})`).join('; ')
      : 'Ninguno';

    aoaData.push([
      rowPos,
      tipo,
      stage.name,
      stage.duration,
      unidad,
      inicioStr,
      finStr,
      stage.workingDaysCount ?? 0,
      stage.durationDays ?? 0,
      comportamiento,
      stage.responsible || '',
      stage.progress !== undefined ? `${stage.progress}%` : '',
      festivosStr,
      stage.notes || '',
    ]);
  });

  // Summary Total Row
  aoaData.push([]);
  aoaData.push([
    'TOTAL',
    `${computedStages.length} Etapas`,
    '',
    totalWeeks,
    'Semanas',
    firstDate ? formatPresentationDate(firstDate, true) : '',
    lastDate ? formatPresentationDate(lastDate, true) : '',
    totalWorkingDays,
    totalCalendarDays,
    '',
    '',
    '',
    `${totalHolidaysCount} festivos descontados`,
    'Cálculo automático de días hábiles',
  ]);

  // Convert array of arrays to sheet
  const wsStages = XLSX.utils.aoa_to_sheet(aoaData);

  // Set intelligent column widths for clean readability in Excel
  wsStages['!cols'] = [
    { wch: 8 },  // Pos
    { wch: 14 }, // Tipo
    { wch: 34 }, // Denominación / Etapa
    { wch: 12 }, // Duración
    { wch: 16 }, // Unidad
    { wch: 16 }, // Inicio (Calc)
    { wch: 16 }, // Fin (Calc)
    { wch: 14 }, // Días Hábiles
    { wch: 16 }, // Días Calendario
    { wch: 22 }, // Comportamiento
    { wch: 24 }, // Responsable
    { wch: 14 }, // Progreso
    { wch: 36 }, // Festivos
    { wch: 40 }, // Notas
  ];

  // 3. Build Sheet 2: "Festivos Oficiales"
  const wsHolidaysData: any[][] = [];
  wsHolidaysData.push(['CATÁLOGO DE DÍAS FESTIVOS Y FERIADOS DEL PROYECTO', '']);
  wsHolidaysData.push(['País:', `${countryInfo.name} (${countryInfo.flag})`]);
  wsHolidaysData.push(['Rango del Proyecto:', `${firstDate ? formatDateISO(firstDate) : ''} al ${lastDate ? formatDateISO(lastDate) : ''}`]);
  wsHolidaysData.push([]);
  wsHolidaysData.push(['Fecha (YYYY-MM-DD)', 'Festivo / Conmemoración', 'Aplica en Cronograma']);

  if (firstDate && lastDate && settings.calendar?.includeHolidays && settings.calendar.country !== 'NONE') {
    const startYear = firstDate.getFullYear();
    const endYear = lastDate.getFullYear();
    const allHolidaysList = [];

    for (let y = startYear; y <= endYear; y++) {
      allHolidaysList.push(...getCountryHolidays(settings.calendar.country, y));
    }

    // Custom holidays
    if (settings.calendar.customHolidays) {
      settings.calendar.customHolidays.forEach((dateStr) => {
        allHolidaysList.push({ date: dateStr, name: 'Festivo Personalizado' });
      });
    }

    allHolidaysList.sort((a, b) => a.date.localeCompare(b.date));

    // Check which holidays fall inside project boundaries
    const startIso = formatDateISO(firstDate);
    const endIso = formatDateISO(lastDate);

    allHolidaysList.forEach((h) => {
      const inRange = h.date >= startIso && h.date <= endIso;
      wsHolidaysData.push([
        h.date,
        h.name,
        inRange ? 'SÍ (Impacta cronograma)' : 'Fuera del período',
      ]);
    });
  } else {
    wsHolidaysData.push(['-', 'Sin días festivos configurados', '-']);
  }

  const wsHolidays = XLSX.utils.aoa_to_sheet(wsHolidaysData);
  wsHolidays['!cols'] = [
    { wch: 20 },
    { wch: 42 },
    { wch: 28 },
  ];

  // 4. Create Workbook and Attach Sheets
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsStages, 'Cronograma');
  XLSX.utils.book_append_sheet(wb, wsHolidays, 'Festivos Oficiales');

  // 5. Trigger download with clean sanitized filename
  const cleanTitle = (settings.title || 'cronograma')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const fileName = `${cleanTitle}-cronograma.xlsx`;
  XLSX.writeFile(wb, fileName);
}
