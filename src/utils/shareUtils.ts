import LZString from 'lz-string';
import { ProjectPlan, Stage, ProjectSettings } from '../types';

/**
 * Compact Schema Version 2
 */
interface CompactPlanV2 {
  v: 2;
  t: string; // title
  s: string; // start date YYYY-MM-DD
  c: string; // country code
  w?: number; // working days (default 5)
  th?: string; // themeId
  sub?: string; // subtitle
  cmp?: string; // company
  fl?: number[]; // boolean flags [weekNums, dateBadges, durOnBars, prog, resp, grid, holNotice]
  ar?: string; // aspect ratio
  bs?: string; // barStyle
  lp?: string; // labelPosition
  bg?: string; // backgroundStyle
  st: Array<Array<string | number>>; // Compact stages list
}

/**
 * Converts standard ProjectPlan into an ultra-compact data structure
 */
export function compactProjectPlan(plan: ProjectPlan): CompactPlanV2 {
  const s = plan.settings;
  
  // Compact booleans into numeric array (1/0)
  const flags = [
    s.showWeekNumbers ? 1 : 0,
    s.showDateBadges ? 1 : 0,
    s.showDurationOnBars ? 1 : 0,
    s.showProgress ? 1 : 0,
    s.showResponsible ? 1 : 0,
    s.showGridLines ? 1 : 0,
    s.showHolidaysNotice ? 1 : 0,
  ];

  const compactStages: Array<Array<string | number>> = plan.stages.map((stg) => {
    // [name, duration, durationUnit, startType, isMilestone, icon, color, progress, resp, customStart, customEnd, offset]
    const row: Array<string | number> = [
      stg.name,
      stg.duration ?? 1,
      stg.durationUnit === 'days' ? 'd' : 'w',
      stg.startType === 'sequential' ? '' : stg.startType,
      stg.isMilestone ? 1 : 0,
      stg.milestoneIcon || '',
      stg.customColor || '',
      stg.progress || 0,
      stg.responsible || '',
      stg.customStartDate || '',
      stg.customEndDate || '',
      stg.offsetFromPrevious || 0,
    ];

    // Trim trailing default / empty values to minimize payload size
    while (
      row.length > 2 &&
      (row[row.length - 1] === '' || row[row.length - 1] === 0 || (row.length === 3 && row[2] === 'w'))
    ) {
      row.pop();
    }

    return row;
  });

  const compact: CompactPlanV2 = {
    v: 2,
    t: s.title || 'Plan de Proyecto',
    s: s.startDate || new Date().toISOString().split('T')[0],
    c: s.calendar?.country || 'MX',
    st: compactStages,
  };

  if (s.calendar?.workingDaysPerWeek && s.calendar.workingDaysPerWeek !== 5) {
    compact.w = s.calendar.workingDaysPerWeek;
  }
  if (s.themeId && s.themeId !== 'sap-horizon') {
    compact.th = s.themeId;
  }
  if (s.subtitle) {
    compact.sub = s.subtitle;
  }
  if (s.companyOrArea) {
    compact.cmp = s.companyOrArea;
  }
  if (flags.some((f) => f === 0)) {
    compact.fl = flags;
  }
  if (s.aspectRatio && s.aspectRatio !== '16:9') {
    compact.ar = s.aspectRatio;
  }
  if (s.barStyle && s.barStyle !== 'rounded') {
    compact.bs = s.barStyle;
  }
  if (s.labelPosition && s.labelPosition !== 'beside') {
    compact.lp = s.labelPosition;
  }
  if (s.backgroundStyle && s.backgroundStyle !== 'white') {
    compact.bg = s.backgroundStyle;
  }

  return compact;
}

/**
 * Reconstructs a full ProjectPlan from CompactPlanV2
 */
export function expandCompactPlan(compact: CompactPlanV2): ProjectPlan {
  const flags = compact.fl || [1, 1, 1, 1, 1, 1, 1];

  const stages: Stage[] = (compact.st || []).map((row, idx) => {
    const name = String(row[0] || `Etapa ${idx + 1}`);
    const duration = typeof row[1] === 'number' ? row[1] : Number(row[1]) || 1;
    const durationUnit = row[2] === 'd' ? 'days' : 'weeks';
    const startType = (row[3] as any) || 'sequential';
    const isMilestone = Boolean(row[4]);
    const milestoneIcon = (row[5] as any) || (isMilestone ? 'star' : undefined);
    const customColor = row[6] ? String(row[6]) : undefined;
    const progress = typeof row[7] === 'number' ? row[7] : undefined;
    const responsible = row[8] ? String(row[8]) : undefined;
    const customStartDate = row[9] ? String(row[9]) : undefined;
    const customEndDate = row[10] ? String(row[10]) : undefined;
    const offsetFromPrevious = typeof row[11] === 'number' ? row[11] : undefined;

    return {
      id: `stg-${idx + 1}-${Date.now().toString(36)}`,
      name,
      duration,
      durationUnit,
      startType,
      isMilestone,
      milestoneIcon,
      customColor,
      progress,
      responsible,
      customStartDate,
      customEndDate,
      offsetFromPrevious,
    };
  });

  const settings: ProjectSettings = {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: compact.t || 'Plan de Proyecto SAP S/4HANA',
    subtitle: compact.sub || '',
    companyOrArea: compact.cmp || '',
    startDate: compact.s || new Date().toISOString().split('T')[0],
    themeId: compact.th || 'sap-horizon',
    calendar: {
      country: (compact.c as any) || 'MX',
      includeHolidays: true,
      workingDaysPerWeek: (compact.w as any) || 5,
    },
    showWeekNumbers: Boolean(flags[0] ?? 1),
    showDateBadges: Boolean(flags[1] ?? 1),
    showDurationOnBars: Boolean(flags[2] ?? 1),
    showProgress: Boolean(flags[3] ?? 1),
    showResponsible: Boolean(flags[4] ?? 1),
    showGridLines: Boolean(flags[5] ?? 1),
    showHolidaysNotice: Boolean(flags[6] ?? 1),
    aspectRatio: (compact.ar as any) || '16:9',
    barStyle: (compact.bs as any) || 'rounded',
    labelPosition: (compact.lp as any) || 'beside',
    backgroundStyle: (compact.bg as any) || 'white',
  };

  return {
    settings,
    stages,
  };
}

/**
 * Compresses and encodes a ProjectPlan into an ultra-short URL parameter
 */
export function encodePlanToUrlParam(plan: ProjectPlan): string {
  try {
    const compact = compactProjectPlan(plan);
    const minifiedJson = JSON.stringify(compact);
    return LZString.compressToEncodedURIComponent(minifiedJson);
  } catch (e) {
    console.error('Error compacting plan for URL:', e);
    // Fallback to standard LZ-string of raw plan
    return LZString.compressToEncodedURIComponent(JSON.stringify(plan));
  }
}

/**
 * Decodes a ProjectPlan from a URL parameter (supports v2 compact, v1 full JSON, and base64)
 */
export function decodePlanFromUrlParam(paramStr: string): ProjectPlan | null {
  if (!paramStr) return null;

  // 1. Try LZ-String decompression
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(paramStr);
    if (decompressed) {
      const parsed = JSON.parse(decompressed);

      // Check if it is v2 compact
      if (parsed && parsed.v === 2 && Array.isArray(parsed.st)) {
        return expandCompactPlan(parsed as CompactPlanV2);
      }

      // Check if it is v1 full ProjectPlan
      if (parsed && Array.isArray(parsed.stages) && parsed.settings) {
        return parsed as ProjectPlan;
      }
    }
  } catch (e) {
    console.warn('LZString decompress failed, attempting fallback parsing:', e);
  }

  // 2. Try raw JSON parsing (if passed directly)
  try {
    const parsed = JSON.parse(decodeURIComponent(paramStr));
    if (parsed && parsed.v === 2 && Array.isArray(parsed.st)) {
      return expandCompactPlan(parsed as CompactPlanV2);
    }
    if (parsed && Array.isArray(parsed.stages) && parsed.settings) {
      return parsed as ProjectPlan;
    }
  } catch (e) {
    // Continue to Base64 fallback
  }

  // 3. Fallback Base64 decoding
  try {
    const decodedStr = decodeURIComponent(escape(atob(decodeURIComponent(paramStr))));
    const parsed = JSON.parse(decodedStr);
    if (parsed && parsed.v === 2 && Array.isArray(parsed.st)) {
      return expandCompactPlan(parsed as CompactPlanV2);
    }
    if (parsed && Array.isArray(parsed.stages) && parsed.settings) {
      return parsed as ProjectPlan;
    }
  } catch (e) {
    console.error('Failed to decode project plan from URL param:', e);
  }

  return null;
}

/**
 * Generates an ultra-short shareable URL for a given ProjectPlan.
 * Automatically ensures public URL (ais-pre instead of private ais-dev) so external users and mobile phones don't get Error 403 Forbidden.
 */
export function getShareableUrl(plan: ProjectPlan): string {
  const encoded = encodePlanToUrlParam(plan);
  let origin = window.location.origin;

  // Convert private AI Studio dev URL (ais-dev-...) to public preview URL (ais-pre-...)
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const baseUrl = origin + window.location.pathname;
  // Use short param 'p' for ultra-short mobile URLs
  return `${baseUrl}?p=${encoded}`;
}

/**
 * Reads share parameter from current window URL if present (supports ?p=, ?share=, #p=, #share=)
 */
export function getSharedPlanFromCurrentUrl(): { plan: ProjectPlan; rawParam: string } | null {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    let shareParam = searchParams.get('p') || searchParams.get('share');

    // Also check hash in case it was passed via hash
    if (!shareParam && window.location.hash) {
      const hashStr = window.location.hash.replace(/^#/, '');
      const hashParams = new URLSearchParams(hashStr);
      shareParam = hashParams.get('p') || hashParams.get('share');
    }

    if (shareParam) {
      const decodedPlan = decodePlanFromUrlParam(shareParam);
      if (decodedPlan) {
        return { plan: decodedPlan, rawParam: shareParam };
      }
    }
  } catch (e) {
    console.error('Error reading shared plan from URL:', e);
  }
  return null;
}

/**
 * Cleans the share parameter from the browser URL bar without page reload
 */
export function clearShareParamFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('p');
    url.searchParams.delete('share');
    if (url.hash && (url.hash.includes('p=') || url.hash.includes('share='))) {
      url.hash = '';
    }
    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
  } catch (e) {
    console.warn('Could not clear URL search param:', e);
  }
}

/**
 * Creates an ultra-short TinyURL / is.gd link via public CORS endpoint
 */
export async function createShortLink(longUrl: string): Promise<string | null> {
  try {
    // Attempt TinyURL API first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const short = await response.text();
      if (short && short.startsWith('http')) {
        return short.trim();
      }
    }
  } catch (err) {
    console.warn('TinyURL shortener failed or timed out:', err);
  }

  // Fallback to is.gd
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const short = await response.text();
      if (short && short.startsWith('http')) {
        return short.trim();
      }
    }
  } catch (err) {
    console.warn('is.gd shortener failed or timed out:', err);
  }

  return null;
}
