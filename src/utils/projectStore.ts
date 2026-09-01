import { ProjectPlan, SavedProject, CountryCode } from '../types';
import { TEMPLATES } from '../data/templates';

const PROJECTS_STORAGE_KEY = 'sap_project_planner_saved_projects_v3';
const ACTIVE_PROJECT_ID_KEY = 'sap_project_planner_active_project_id_v3';
const LEGACY_STORAGE_KEY = 'project_presentation_planner_data_v2';

/**
 * Calculates total duration in weeks for a project plan
 */
export function calculatePlanTotalWeeks(plan: ProjectPlan): number {
  if (!plan.stages || plan.stages.length === 0) return 0;
  const workingDaysPerWeek = plan.settings.calendar?.workingDaysPerWeek || 5;
  const totalDays = plan.stages.reduce((sum, s) => {
    if (s.durationUnit === 'weeks') {
      return sum + s.duration * workingDaysPerWeek;
    }
    return sum + s.duration;
  }, 0);
  return Math.round((totalDays / workingDaysPerWeek) * 10) / 10;
}

/**
 * Creates a SavedProject object from a ProjectPlan
 */
export function createSavedProjectRecord(plan: ProjectPlan, customId?: string, customName?: string): SavedProject {
  const now = new Date().toISOString();
  const id = customId || plan.settings.id || `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const name = customName || plan.settings.title || 'Proyecto sin título';

  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    plan: {
      ...plan,
      settings: {
        ...plan.settings,
        id,
        title: name,
      },
    },
    stagesCount: plan.stages?.length || 0,
    totalDurationWeeks: calculatePlanTotalWeeks(plan),
    country: plan.settings.calendar?.country || 'MX',
    startDate: plan.settings.startDate,
  };
}

/**
 * Seeds default initial projects if storage is empty
 */
function getInitialDefaultProjects(): SavedProject[] {
  // Check if there was an existing plan in legacy storage
  let initialPlan: ProjectPlan = TEMPLATES[0].plan;
  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.settings && parsed?.stages) {
        initialPlan = parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading legacy storage:', e);
  }

  const proj1 = createSavedProjectRecord(
    initialPlan,
    'proj-default-1',
    initialPlan.settings.title || 'Mejora procesos importaciones'
  );

  // Also include 2 alternative templates as pre-saved examples
  const proj2Plan = JSON.parse(JSON.stringify(TEMPLATES[1] ? TEMPLATES[1].plan : TEMPLATES[0].plan));
  const proj2 = createSavedProjectRecord(
    proj2Plan,
    'proj-default-2',
    TEMPLATES[1] ? TEMPLATES[1].name : 'Implementación S/4HANA Finance'
  );

  const proj3Plan = JSON.parse(JSON.stringify(TEMPLATES[2] ? TEMPLATES[2].plan : TEMPLATES[0].plan));
  const proj3 = createSavedProjectRecord(
    proj3Plan,
    'proj-default-3',
    TEMPLATES[2] ? TEMPLATES[2].name : 'Migración SAP ECC a Cloud'
  );

  return [proj1, proj2, proj3];
}

/**
 * Loads all saved projects from localStorage
 */
export function loadSavedProjects(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load saved projects from localStorage:', e);
  }

  const defaults = getInitialDefaultProjects();
  saveAllProjectsToStorage(defaults);
  return defaults;
}

/**
 * Persists all projects array to localStorage
 */
export function saveAllProjectsToStorage(projects: SavedProject[]): void {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to localStorage:', e);
  }
}

/**
 * Gets currently active project ID
 */
export function getStoredActiveProjectId(projects: SavedProject[]): string {
  try {
    const stored = localStorage.getItem(ACTIVE_PROJECT_ID_KEY);
    if (stored && projects.some((p) => p.id === stored)) {
      return stored;
    }
  } catch (e) {
    console.warn('Error reading active project ID:', e);
  }
  return projects[0]?.id || 'proj-default-1';
}

/**
 * Sets active project ID in storage
 */
export function setStoredActiveProjectId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROJECT_ID_KEY, id);
  } catch (e) {
    console.warn('Error saving active project ID:', e);
  }
}

/**
 * Creates a fresh new project based on an optional template
 */
export function createNewProject(
  title: string,
  templateId?: string,
  startDate?: string,
  country: CountryCode = 'MX'
): SavedProject {
  const baseTemplate = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const newPlan: ProjectPlan = JSON.parse(JSON.stringify(baseTemplate.plan));

  const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  newPlan.settings.id = newId;
  newPlan.settings.title = title || 'Nuevo Proyecto SAP';
  if (startDate) {
    newPlan.settings.startDate = startDate;
  }
  if (country) {
    if (!newPlan.settings.calendar) {
      newPlan.settings.calendar = {
        country,
        includeHolidays: true,
        workingDaysPerWeek: 5,
      };
    } else {
      newPlan.settings.calendar.country = country;
    }
  }

  const record = createSavedProjectRecord(newPlan, newId, title || newPlan.settings.title);
  return record;
}
