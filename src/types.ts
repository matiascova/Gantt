export type DurationUnit = 'weeks' | 'days';

export type StartType = 'sequential' | 'custom_date' | 'offset';

export type MilestoneIconType = 'star' | 'flag' | 'rocket' | 'check' | 'target' | 'diamond';

export type CountryCode = 'MX' | 'ES' | 'CO' | 'CL' | 'AR' | 'PE' | 'US' | 'NONE';

export interface CalendarConfig {
  country: CountryCode;
  includeHolidays: boolean;
  workingDaysPerWeek: 5 | 6 | 7; // 5 = Lunes a Viernes, 6 = Lunes a Sábado, 7 = Todos los días
  customHolidays?: string[]; // Array of YYYY-MM-DD
}

export interface Stage {
  id: string;
  name: string;
  duration: number; // in weeks (or days if chosen)
  durationUnit: DurationUnit; // default 'weeks'
  startType: StartType; // 'sequential' (default)
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string; // YYYY-MM-DD
  offsetFromPrevious?: number; // offset in durationUnit
  isMilestone?: boolean;
  milestoneIcon?: MilestoneIconType;
  customColor?: string;
  progress?: number; // 0 - 100
  notes?: string;
  responsible?: string;
}

export interface ColorTheme {
  id: string;
  name: string;
  sapFamily: string;
  barColor: string;
  barHover: string;
  barText: string;
  accentColor: string;
  milestoneColor: string;
  headerBg: string;
  gridColor: string;
  previewBg: string;
  badgeBg: string;
}

export interface ProjectSettings {
  id: string;
  title: string;
  subtitle?: string;
  companyOrArea?: string;
  startDate: string; // YYYY-MM-DD
  themeId: string;
  calendar: CalendarConfig;
  showWeekNumbers: boolean;
  showDateBadges: boolean;
  showDurationOnBars: boolean;
  showProgress: boolean;
  showResponsible: boolean;
  showGridLines: boolean;
  showHolidaysNotice: boolean;
  aspectRatio: '16:9' | '4:3' | 'auto';
  presentationWindow?: 'auto' | '1_month' | '2_months' | '3_months' | '4_months' | '6_months' | '12_months';
  barStyle: 'rounded' | 'pills' | 'minimal';
  labelPosition: 'beside' | 'inside' | 'auto';
  backgroundStyle: 'white' | 'subtle-slate' | 'navy-dark' | 'sap-fiori';
}

export interface ProjectPlan {
  settings: ProjectSettings;
  stages: Stage[];
}

export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string; // ISO string
  createdAt: string; // ISO string
  plan: ProjectPlan;
  stagesCount: number;
  totalDurationWeeks: number;
  country: CountryCode;
  startDate: string;
}

export interface ComputedStage extends Stage {
  computedStartDate: Date;
  computedEndDate: Date;
  startDayOffset: number; // days from project timeline start
  durationDays: number; // total calendar duration in days
  workingDaysCount: number; // actual business days
  holidaysEncountered: { date: string; name: string }[];
  leftPercent: number; // 0 to 100% on visual timeline
  widthPercent: number; // 0 to 100% on visual timeline
}

export interface TimelineBounds {
  startDate: Date;
  endDate: Date;
  totalDays: number;
  months: {
    name: string;
    year: number;
    startDate: Date;
    endDate: Date;
    widthPercent: number;
    leftPercent: number;
    weeks: {
      weekNum: number;
      label: string;
      startDate: Date;
      widthPercent: number;
      leftPercent: number;
    }[];
  }[];
}
