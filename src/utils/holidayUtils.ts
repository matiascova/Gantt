import { CountryCode } from '../types';

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface CountryInfo {
  code: CountryCode;
  name: string;
  flag: string;
  region: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'MX', name: 'México', flag: '🇲🇽', region: 'Hispanoamérica' },
  { code: 'ES', name: 'España', flag: '🇪🇸', region: 'Europa' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', region: 'Hispanoamérica' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', region: 'Hispanoamérica' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', region: 'Hispanoamérica' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪', region: 'Hispanoamérica' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸', region: 'Norteamérica' },
  { code: 'NONE', name: 'Sin festivos (Solo días laborales)', flag: '🌐', region: 'Estándar' },
];

/**
 * Calculates Easter Sunday for a given year using Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
 */
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDaysToDate(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Find nth weekday of a month (e.g. 1st Monday of Feb, 3rd Monday of Nov)
function getNthWeekdayOfMonth(year: number, month: number, targetDayOfWeek: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay();
  let daysToAdd = (targetDayOfWeek - dayOfWeek + 7) % 7;
  daysToAdd += (n - 1) * 7;
  return new Date(year, month, 1 + daysToAdd);
}

// Emiliani Law (Colombia): Move holiday to next Monday if not already Monday
function moveToNextMonday(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 1 is Monday
  if (dayOfWeek === 1) return date;
  const daysToAdd = (8 - dayOfWeek) % 7;
  return addDaysToDate(date, daysToAdd === 0 ? 7 : daysToAdd);
}

/**
 * Returns list of public holidays for a given country and year
 */
export function getCountryHolidays(country: CountryCode, year: number): Holiday[] {
  if (country === 'NONE') return [];

  const easter = getEasterSunday(year);
  const holidays: Holiday[] = [];

  const add = (d: Date, name: string) => {
    holidays.push({ date: formatISO(d), name });
  };

  switch (country) {
    case 'MX': {
      // México (Ley Federal del Trabajo)
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(getNthWeekdayOfMonth(year, 1, 1, 1), 'Día de la Constitución'); // 1er lunes de feb
      add(getNthWeekdayOfMonth(year, 2, 1, 3), 'Natalicio de Benito Juárez'); // 3er lunes de mar
      add(new Date(year, 4, 1), 'Día del Trabajo');
      add(new Date(year, 8, 16), 'Día de la Independencia');
      add(getNthWeekdayOfMonth(year, 10, 1, 3), 'Día de la Revolución'); // 3er lunes de nov
      add(new Date(year, 11, 25), 'Navidad');
      // Transmisión Poder Ejecutivo cada 6 años (1 de octubre a partir de 2024)
      if (year % 6 === 0 && year >= 2024) {
        add(new Date(year, 9, 1), 'Transmisión del Poder Ejecutivo');
      }
      break;
    }

    case 'ES': {
      // España (Nacionales)
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(new Date(year, 0, 6), 'Epifanía del Señor / Reyes');
      add(addDaysToDate(easter, -3), 'Jueves Santo');
      add(addDaysToDate(easter, -2), 'Viernes Santo');
      add(new Date(year, 4, 1), 'Fiesta del Trabajo');
      add(new Date(year, 7, 15), 'Asunción de la Virgen');
      add(new Date(year, 9, 12), 'Fiesta Nacional de España');
      add(new Date(year, 10, 1), 'Todos los Santos');
      add(new Date(year, 11, 6), 'Día de la Constitución');
      add(new Date(year, 11, 8), 'Inmaculada Concepción');
      add(new Date(year, 11, 25), 'Natividad del Señor');
      break;
    }

    case 'CO': {
      // Colombia (Ley Emiliani)
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(moveToNextMonday(new Date(year, 0, 6)), 'Reyes Magos');
      add(moveToNextMonday(new Date(year, 2, 19)), 'Día de San José');
      add(addDaysToDate(easter, -3), 'Jueves Santo');
      add(addDaysToDate(easter, -2), 'Viernes Santo');
      add(new Date(year, 4, 1), 'Día del Trabajo');
      add(moveToNextMonday(addDaysToDate(easter, 39)), 'Ascensión del Señor');
      add(moveToNextMonday(addDaysToDate(easter, 60)), 'Corpus Christi');
      add(moveToNextMonday(addDaysToDate(easter, 68)), 'Sagrado Corazón');
      add(new Date(year, 6, 20), 'Día de la Independencia');
      add(new Date(year, 7, 7), 'Batalla de Boyacá');
      add(moveToNextMonday(new Date(year, 7, 15)), 'La Asunción');
      add(moveToNextMonday(new Date(year, 9, 12)), 'Día de la Raza');
      add(moveToNextMonday(new Date(year, 10, 1)), 'Todos los Santos');
      add(moveToNextMonday(new Date(year, 10, 11)), 'Independencia de Cartagena');
      add(new Date(year, 11, 8), 'Inmaculada Concepción');
      add(new Date(year, 11, 25), 'Navidad');
      break;
    }

    case 'CL': {
      // Chile
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(addDaysToDate(easter, -2), 'Viernes Santo');
      add(addDaysToDate(easter, -1), 'Sábado Santo');
      add(new Date(year, 4, 1), 'Día del Trabajo');
      add(new Date(year, 4, 21), 'Día de las Glorias Navales');
      add(new Date(year, 5, 29), 'San Pedro y San Pablo');
      add(new Date(year, 6, 16), 'Día de la Virgen del Carmen');
      add(new Date(year, 7, 15), 'Asunción de la Virgen');
      add(new Date(year, 8, 18), 'Fiestas Patrias');
      add(new Date(year, 8, 19), 'Día de las Glorias del Ejército');
      add(new Date(year, 9, 12), 'Encuentro de Dos Mundos');
      add(new Date(year, 9, 31), 'Día de las Iglesias Evangélicas');
      add(new Date(year, 10, 1), 'Día de Todos los Santos');
      add(new Date(year, 11, 8), 'Inmaculada Concepción');
      add(new Date(year, 11, 25), 'Navidad');
      break;
    }

    case 'AR': {
      // Argentina
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(addDaysToDate(easter, -48), 'Carnaval Lunes');
      add(addDaysToDate(easter, -47), 'Carnaval Martes');
      add(new Date(year, 2, 24), 'Día Nacional de la Memoria');
      add(new Date(year, 3, 2), 'Día del Veterano y de los Caídos en Malvinas');
      add(addDaysToDate(easter, -2), 'Viernes Santo');
      add(new Date(year, 4, 1), 'Día del Trabajador');
      add(new Date(year, 4, 25), 'Día de la Revolución de Mayo');
      add(new Date(year, 5, 17), 'Paso a la Inmortalidad del Gral. Güemes');
      add(new Date(year, 5, 20), 'Paso a la Inmortalidad del Gral. Belgrano');
      add(new Date(year, 6, 9), 'Día de la Independencia');
      add(new Date(year, 7, 17), 'Paso a la Inmortalidad del Gral. San Martín');
      add(new Date(year, 9, 12), 'Día del Respeto a la Diversidad Cultural');
      add(new Date(year, 10, 20), 'Día de la Soberanía Nacional');
      add(new Date(year, 11, 8), 'Inmaculada Concepción');
      add(new Date(year, 11, 25), 'Navidad');
      break;
    }

    case 'PE': {
      // Perú
      add(new Date(year, 0, 1), 'Año Nuevo');
      add(addDaysToDate(easter, -3), 'Jueves Santo');
      add(addDaysToDate(easter, -2), 'Viernes Santo');
      add(new Date(year, 4, 1), 'Día del Trabajo');
      add(new Date(year, 5, 7), 'Batalla de Arica y Día de la Bandera');
      add(new Date(year, 5, 29), 'San Pedro y San Pablo');
      add(new Date(year, 6, 23), 'Día de la Fuerza Aérea');
      add(new Date(year, 6, 28), 'Fiestas Patrias (1)');
      add(new Date(year, 6, 29), 'Fiestas Patrias (2)');
      add(new Date(year, 7, 6), 'Batalla de Junín');
      add(new Date(year, 7, 30), 'Santa Rosa de Lima');
      add(new Date(year, 9, 8), 'Combate de Angamos');
      add(new Date(year, 10, 1), 'Día de Todos los Santos');
      add(new Date(year, 11, 8), 'Inmaculada Concepción');
      add(new Date(year, 11, 9), 'Batalla de Ayacucho');
      add(new Date(year, 11, 25), 'Navidad');
      break;
    }

    case 'US': {
      // Estados Unidos
      add(new Date(year, 0, 1), "New Year's Day");
      add(getNthWeekdayOfMonth(year, 0, 1, 3), 'Martin Luther King Jr. Day');
      add(getNthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day");
      // Last Monday of May (Memorial Day)
      const lastMonMay = getNthWeekdayOfMonth(year, 4, 1, 5);
      add(lastMonMay.getMonth() === 4 ? lastMonMay : getNthWeekdayOfMonth(year, 4, 1, 4), 'Memorial Day');
      add(new Date(year, 5, 19), 'Juneteenth');
      add(new Date(year, 6, 4), 'Independence Day');
      add(getNthWeekdayOfMonth(year, 8, 1, 1), 'Labor Day');
      add(getNthWeekdayOfMonth(year, 9, 1, 2), 'Columbus / Indigenous Peoples Day');
      add(new Date(year, 10, 11), 'Veterans Day');
      add(getNthWeekdayOfMonth(year, 10, 4, 4), 'Thanksgiving Day');
      add(new Date(year, 11, 25), 'Christmas Day');
      break;
    }
  }

  return holidays;
}
