import {
  format,
  parse,
  isValid,
  startOfWeek,
  addDays,
  startOfMonth,
  isBefore,
} from "date-fns";
import type { Variant, CalendarCell } from "./types";

export const DAYS_OF_WEEK = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "Sáb",
] as const;

export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export const DATE_FORMAT_DISPLAY = "dd/MM/yyyy";
export const DATETIME_FORMAT_DISPLAY = "dd/MM/yyyy HH:mm";
export const DATE_FORMAT_ISO = "yyyy-MM-dd";
export const DATETIME_FORMAT_ISO = "yyyy-MM-dd'T'HH:mm";

export function formatDatePtBr(date: Date | null, variant: Variant): string {
  if (!date) return "";
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  return format(date, fmt);
}

export function parseDatePtBr(raw: string, variant: Variant): Date | null {
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  const expectedLength = variant === "datetime" ? 16 : 10;
  if (raw.length !== expectedLength) return null;

  const parsed = parse(raw, fmt, new Date());
  if (!isValid(parsed)) return null;

  // Round-trip check to reject dates like 30/02 (date-fns parses them as valid but shifts the date)
  const roundTrip = format(parsed, fmt);
  if (roundTrip !== raw) return null;

  return parsed;
}

export function formatToIso(date: Date, variant: Variant): string {
  const fmt = variant === "datetime" ? DATETIME_FORMAT_ISO : DATE_FORMAT_ISO;
  return format(date, fmt);
}

export function isValidDate(date: Date): boolean {
  return isValid(date);
}

export function buildCalendarGrid(viewDate: Date): CalendarCell[] {
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const currentMonth = viewDate.getMonth();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    cells.push({
      date,
      isCurrentMonth: date.getMonth() === currentMonth,
    });
  }
  return cells;
}

export function sortPeriod(a: Date, b: Date): [Date, Date] {
  return isBefore(a, b) ? [a, b] : [b, a];
}

export function applyMask(raw: string, variant: Variant): string {
  const digits = raw.replace(/\D/g, "");
  const maxDigits = variant === "datetime" ? 12 : 8;
  const trimmed = digits.slice(0, maxDigits);

  let result = "";
  for (let i = 0; i < trimmed.length; i++) {
    if (i === 2 || i === 4) result += "/";
    if (i === 8) result += " ";
    if (i === 10) result += ":";
    result += trimmed[i];
  }
  return result;
}
