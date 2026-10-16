import {
  DurationUnit,
  Stage,
  ComputedStage,
  TimelineBounds,
  CalendarConfig,
} from '../types';
import { getCountryHolidays, Holiday, getHolidaysMap } from './holidayUtils';

export const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const SPANISH_MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

// Helper to parse 'YYYY-MM-DD' in local timezone to avoid UTC shifts with zero intermediate array allocations
export function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.length < 10) return new Date();
  const year = +dateStr.slice(0, 4);
  const month = +dateStr.slice(5, 7) - 1;
  const day = +dateStr.slice(8, 10);
  return new Date(year, month, day);
}

export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${year}-${month < 10 ? '0' : ''}${month}-${day < 10 ? '0' : ''}${day}`;
}

export function formatPresentationDate(d: Date, includeYear: boolean = false): string {
  const day = d.getDate();
  const month = SPANISH_MONTHS_SHORT[d.getMonth()];
  if (includeYear) {
    return `${day} ${month} ${d.getFullYear()}`;
  }
  return `${day} ${month}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysBetween(start: Date, end: Date): number {
  const msPerDay = 86400000;
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / msPerDay);
}

// Pre-allocated static singletons to eliminate 99% of heap allocations in date loops
const NON_WORKING_WEEKEND = Object.freeze({ isNonWorking: true, isWeekend: true });
const WORKING_DAY = Object.freeze({ isNonWorking: false, isWeekend: false });

/**
 * Checks if a specific date is a non-working day (weekend or country holiday)
 * Uses static singletons to avoid GC allocation thrashing
 */
export function isNonWorkingDay(
  date: Date,
  calendar: CalendarConfig,
  holidaysMap: Map<string, string>
): { isNonWorking: boolean; isWeekend: boolean; holidayName?: string } {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  let isWeekend = false;

  if (calendar.workingDaysPerWeek === 5) {
    isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  } else if (calendar.workingDaysPerWeek === 6) {
    isWeekend = dayOfWeek === 0;
  }

  if (isWeekend) {
    return NON_WORKING_WEEKEND;
  }

  if (calendar.includeHolidays && calendar.country !== 'NONE') {
    const iso = formatDateISO(date);
    const holidayName = holidaysMap.get(iso);
    if (holidayName) {
      return { isNonWorking: true, isWeekend: false, holidayName };
    }
  }

  return WORKING_DAY;
}

/**
 * Finds the first working day starting from or after the given date without intermediate allocations
 */
export function getNextWorkingDay(
  date: Date,
  calendar: CalendarConfig,
  holidaysMap: Map<string, string>
): Date {
  const curr = new Date(date);
  let attempts = 0;
  while (attempts < 60) {
    const { isNonWorking } = isNonWorkingDay(curr, calendar, holidaysMap);
    if (!isNonWorking) return curr;
    curr.setDate(curr.getDate() + 1);
    attempts++;
  }
  return curr;
}

/**
 * Calculates end date and working days elapsed given a start date and target working days
 * Optimized with in-place date mutation to prevent garbage collection spikes
 */
export function calculateWorkingDaysSpan(
  startDate: Date,
  targetWorkingDays: number,
  calendar: CalendarConfig,
  holidaysMap: Map<string, string>
): {
  endDate: Date;
  calendarDays: number;
  holidaysEncountered: { date: string; name: string }[];
  nextWorkingDay: Date;
} {
  const effectiveStart = getNextWorkingDay(startDate, calendar, holidaysMap);
  const current = new Date(effectiveStart);
  let workingDaysCounted = 0;
  const holidaysEncountered: { date: string; name: string }[] = [];

  const neededDays = Math.max(1, targetWorkingDays);

  // If calendar doesn't filter weekends or holidays (7-day calendar with no holidays)
  if (calendar.workingDaysPerWeek === 7 && !calendar.includeHolidays) {
    const endDate = addDays(effectiveStart, Math.max(1, Math.round(targetWorkingDays)) - 1);
    const nextWorkingDay = addDays(endDate, 1);
    return {
      endDate,
      calendarDays: daysBetween(effectiveStart, endDate) + 1,
      holidaysEncountered,
      nextWorkingDay,
    };
  }

  // Iterate day by day in-place without generating garbage
  let safetyLoop = 0;
  while (workingDaysCounted < neededDays && safetyLoop < 1000) {
    safetyLoop++;
    const check = isNonWorkingDay(current, calendar, holidaysMap);
    if (!check.isNonWorking) {
      workingDaysCounted += 1;
      if (workingDaysCounted >= neededDays) {
        break;
      }
    } else if (check.holidayName) {
      const iso = formatDateISO(current);
      if (!holidaysEncountered.some((h) => h.date === iso)) {
        holidaysEncountered.push({ date: iso, name: check.holidayName });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  const endDate = new Date(current);
  const nextWorkingDay = getNextWorkingDay(addDays(endDate, 1), calendar, holidaysMap);

  return {
    endDate,
    calendarDays: daysBetween(effectiveStart, endDate) + 1,
    holidaysEncountered,
    nextWorkingDay,
  };
}

/**
 * Calculates working days and holiday encounters between two fixed dates
 */
export function calculateWorkingDaysBetween(
  startDate: Date,
  endDate: Date,
  calendar: CalendarConfig,
  holidaysMap: Map<string, string>
): {
  effectiveStart: Date;
  effectiveEnd: Date;
  calendarDays: number;
  workingDaysCount: number;
  holidaysEncountered: { date: string; name: string }[];
  nextWorkingDay: Date;
} {
  const effectiveStart = new Date(startDate);
  let effectiveEnd = new Date(endDate);
  if (effectiveEnd.getTime() < effectiveStart.getTime()) {
    effectiveEnd = new Date(effectiveStart);
  }

  const current = new Date(effectiveStart);
  let workingDays = 0;
  const holidaysEncountered: { date: string; name: string }[] = [];

  while (current.getTime() <= effectiveEnd.getTime()) {
    const check = isNonWorkingDay(current, calendar, holidaysMap);
    if (!check.isNonWorking) {
      workingDays++;
    } else if (check.holidayName) {
      const iso = formatDateISO(current);
      if (!holidaysEncountered.some((h) => h.date === iso)) {
        holidaysEncountered.push({ date: iso, name: check.holidayName });
      }
    }
    current.setDate(current.getDate() + 1);
  }

  const nextWorkingDay = getNextWorkingDay(addDays(effectiveEnd, 1), calendar, holidaysMap);

  return {
    effectiveStart,
    effectiveEnd,
    calendarDays: daysBetween(effectiveStart, effectiveEnd) + 1,
    workingDaysCount: Math.max(1, workingDays),
    holidaysEncountered,
    nextWorkingDay,
  };
}

/**
 * Calculates stage start and end dates with:
 * - Consecutive execution by default (each stage starts on the working day after the previous ends)
 * - Working days per week (5, 6 or 7)
 * - Public holidays based on country calendar
 * - Duration in weeks (or days)
 * - Fixed custom start and end dates when configured
 */
export function computeStagesDates(
  projectStartDateStr: string,
  stages: Stage[],
  calendar: CalendarConfig = { country: 'MX', includeHolidays: true, workingDaysPerWeek: 5 },
  presentationWindow: 'auto' | '1_month' | '2_months' | '3_months' | '4_months' | '6_months' | '12_months' = 'auto'
): {
  computedStages: ComputedStage[];
  minDate: Date;
  maxDate: Date;
  totalDays: number;
} {
  const initialDate = parseDate(projectStartDateStr);

  // Pre-load holidays via memoized cache for relevant years
  const baseYear = initialDate.getFullYear();
  const holidaysMap = getHolidaysMap(calendar, baseYear);

  const projectStartWorkingDate = getNextWorkingDay(initialDate, calendar, holidaysMap);
  const computedList: {
    stage: Stage;
    start: Date;
    end: Date;
    durationDays: number;
    workingDaysCount: number;
    holidaysEncountered: { date: string; name: string }[];
  }[] = [];

  let nextConsecutiveStart = new Date(projectStartWorkingDate);

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];

    // Check if stage is Fixed Date with explicit start and end dates
    if (stage.startType === 'custom_date' && stage.customStartDate) {
      const fixedStart = parseDate(stage.customStartDate);
      
      if (stage.customEndDate) {
        const fixedEnd = parseDate(stage.customEndDate);
        const fixedResult = calculateWorkingDaysBetween(
          fixedStart,
          fixedEnd,
          calendar,
          holidaysMap
        );

        computedList.push({
          stage,
          start: fixedResult.effectiveStart,
          end: fixedResult.effectiveEnd,
          durationDays: fixedResult.calendarDays,
          workingDaysCount: fixedResult.workingDaysCount,
          holidaysEncountered: fixedResult.holidaysEncountered,
        });

        nextConsecutiveStart = fixedResult.nextWorkingDay;
        continue;
      } else {
        // Only customStartDate is given: calculate end date from duration
        const workingDaysPerWeek = calendar.workingDaysPerWeek || 5;
        const targetWorkingDays =
          stage.durationUnit === 'weeks'
            ? Math.max(1, Math.round(stage.duration * workingDaysPerWeek))
            : Math.max(1, Math.round(stage.duration));
        const effectiveWorkingDays = stage.isMilestone ? Math.max(1, targetWorkingDays) : targetWorkingDays;

        const { endDate, calendarDays, holidaysEncountered, nextWorkingDay } = calculateWorkingDaysSpan(
          fixedStart,
          effectiveWorkingDays,
          calendar,
          holidaysMap
        );

        computedList.push({
          stage,
          start: fixedStart,
          end: endDate,
          durationDays: calendarDays,
          workingDaysCount: effectiveWorkingDays,
          holidaysEncountered,
        });

        nextConsecutiveStart = nextWorkingDay;
        continue;
      }
    }

    // Calculate required working days:
    // If unit is 'weeks', 1 week = calendar.workingDaysPerWeek working days (e.g. 5 business days).
    const workingDaysPerWeek = calendar.workingDaysPerWeek || 5;
    let targetWorkingDays: number;

    if (stage.durationUnit === 'weeks') {
      targetWorkingDays = Math.max(1, Math.round(stage.duration * workingDaysPerWeek));
    } else {
      targetWorkingDays = Math.max(1, Math.round(stage.duration));
    }

    let stageStart: Date;

    if (stage.startType === 'offset' && i > 0) {
      const prev = computedList[i - 1];
      const offsetWorkingDays =
        stage.durationUnit === 'weeks'
          ? (stage.offsetFromPrevious ?? 0) * workingDaysPerWeek
          : stage.offsetFromPrevious ?? 0;
      stageStart = getNextWorkingDay(
        addDays(prev.start, Math.round(offsetWorkingDays)),
        calendar,
        holidaysMap
      );
    } else if (i === 0) {
      stageStart = new Date(projectStartWorkingDate);
    } else {
      // Consecutive sequential: start immediately on the next working day after previous stage
      stageStart = new Date(nextConsecutiveStart);
    }

    // Target working days
    const effectiveWorkingDays = stage.isMilestone ? Math.max(1, targetWorkingDays) : targetWorkingDays;

    const { endDate, calendarDays, holidaysEncountered, nextWorkingDay } = calculateWorkingDaysSpan(
      stageStart,
      effectiveWorkingDays,
      calendar,
      holidaysMap
    );

    computedList.push({
      stage,
      start: stageStart,
      end: endDate,
      durationDays: calendarDays,
      workingDaysCount: effectiveWorkingDays,
      holidaysEncountered,
    });

    nextConsecutiveStart = nextWorkingDay;
  }

  // Find min and max dates across all computed stages
  let minTime = projectStartWorkingDate.getTime();
  let maxTime = nextConsecutiveStart.getTime();

  for (const item of computedList) {
    if (item.start.getTime() < minTime) minTime = item.start.getTime();
    if (item.end.getTime() > maxTime) maxTime = item.end.getTime();
  }

  const minDateObj = new Date(minTime);
  const maxDateObj = new Date(maxTime);

  const startTimeline = new Date(minDateObj.getFullYear(), minDateObj.getMonth(), 1);
  let endMonthDate: Date;

  if (presentationWindow && presentationWindow !== 'auto') {
    const windowMonthsMap: Record<string, number> = {
      '1_month': 1,
      '2_months': 2,
      '3_months': 3,
      '4_months': 4,
      '6_months': 6,
      '12_months': 12,
    };
    const numMonths = windowMonthsMap[presentationWindow] || 2;
    endMonthDate = new Date(startTimeline.getFullYear(), startTimeline.getMonth() + numMonths, 0);
  } else {
    endMonthDate = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth() + 1, 0);
  }

  const totalDays = Math.max(1, daysBetween(startTimeline, endMonthDate) + 1);

  const computedStages: ComputedStage[] = computedList.map((item) => {
    const startDayOffset = daysBetween(startTimeline, item.start);
    const leftPercent = (startDayOffset / totalDays) * 100;
    const widthPercent = (item.durationDays / totalDays) * 100;

    return {
      ...item.stage,
      computedStartDate: item.start,
      computedEndDate: item.end,
      startDayOffset,
      durationDays: item.durationDays,
      workingDaysCount: item.workingDaysCount,
      holidaysEncountered: item.holidaysEncountered,
      leftPercent,
      widthPercent,
    };
  });

  return {
    computedStages,
    minDate: startTimeline,
    maxDate: endMonthDate,
    totalDays,
  };
}

// High-performance cache for computed timeline bounds to eliminate repeated month/week object allocations
let cachedBoundsKey = '';
let cachedBoundsResult: TimelineBounds | null = null;

/**
 * Builds timeline month and week divisions for header visualization (memoized)
 */
export function buildTimelineBounds(
  timelineStart: Date,
  timelineEnd: Date,
  totalDays: number
): TimelineBounds {
  const cacheKey = `${timelineStart.getTime()}_${timelineEnd.getTime()}_${totalDays}`;
  if (cachedBoundsResult && cachedBoundsKey === cacheKey) {
    return cachedBoundsResult;
  }

  const months: TimelineBounds['months'] = [];

  let current = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);

  while (current <= timelineEnd) {
    const year = current.getFullYear();
    const monthIdx = current.getMonth();
    const monthStart = new Date(year, monthIdx, 1);
    const monthEnd = new Date(year, monthIdx + 1, 0);

    const effectiveStart = monthStart < timelineStart ? timelineStart : monthStart;
    const effectiveEnd = monthEnd > timelineEnd ? timelineEnd : monthEnd;

    const monthDays = daysBetween(effectiveStart, effectiveEnd) + 1;
    const startOffset = daysBetween(timelineStart, effectiveStart);
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (monthDays / totalDays) * 100;

    const weeks = [];
    const daysInMonth = monthEnd.getDate();
    const numWeeks = Math.ceil(daysInMonth / 7);

    for (let w = 0; w < numWeeks; w++) {
      const wStartDay = w * 7 + 1;
      const wEndDay = Math.min((w + 1) * 7, daysInMonth);
      const wStartDate = new Date(year, monthIdx, wStartDay);
      const wEndDate = new Date(year, monthIdx, wEndDay);

      const wDays = daysBetween(wStartDate, wEndDate) + 1;
      const wOffset = daysBetween(timelineStart, wStartDate);

      weeks.push({
        weekNum: w + 1,
        label: `S${w + 1}`,
        startDate: wStartDate,
        leftPercent: (wOffset / totalDays) * 100,
        widthPercent: (wDays / totalDays) * 100,
      });
    }

    months.push({
      name: SPANISH_MONTHS[monthIdx],
      year,
      startDate: effectiveStart,
      endDate: effectiveEnd,
      widthPercent,
      leftPercent,
      weeks,
    });

    current = new Date(year, monthIdx + 1, 1);
  }

  const result: TimelineBounds = {
    startDate: timelineStart,
    endDate: timelineEnd,
    totalDays,
    months,
  };

  cachedBoundsKey = cacheKey;
  cachedBoundsResult = result;
  return result;
}
