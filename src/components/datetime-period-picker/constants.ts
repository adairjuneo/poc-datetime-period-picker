import moment from "moment";
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

export const DATE_FORMAT_DISPLAY = "DD/MM/YYYY";
export const DATETIME_FORMAT_DISPLAY = "DD/MM/YYYY HH:mm";
export const DATE_FORMAT_ISO = "YYYY-MM-DD";
export const DATETIME_FORMAT_ISO = "YYYY-MM-DD[T]HH:mm";

export function formatDatePtBr(date: Date | null, variant: Variant): string {
  if (!date) return "";
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  return moment(date).format(fmt);
}

export function parseDatePtBr(raw: string, variant: Variant): Date | null {
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  const expectedLength = variant === "datetime" ? 16 : 10;
  if (raw.length !== expectedLength) return null;

  const m = moment(raw, fmt, true);
  if (!m.isValid()) return null;

  // Round-trip check kept for behavioral parity with previous implementation
  const roundTrip = m.format(fmt);
  if (roundTrip !== raw) return null;

  return m.toDate();
}

export function formatToIso(date: Date, variant: Variant): string {
  const fmt = variant === "datetime" ? DATETIME_FORMAT_ISO : DATE_FORMAT_ISO;
  return moment(date).format(fmt);
}

export function isValidDate(date: Date): boolean {
  return moment(date).isValid();
}

export function buildCalendarGrid(viewDate: Date): CalendarCell[] {
  const monthStart = moment(viewDate).startOf('month').toDate();
  const gridStart = moment(monthStart).startOf('week').toDate();
  const currentMonth = viewDate.getMonth();

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = moment(gridStart).add(i, 'days').toDate();
    cells.push({
      date,
      isCurrentMonth: date.getMonth() === currentMonth,
    });
  }
  return cells;
}

export function sortPeriod(a: Date, b: Date): [Date, Date] {
  return moment(a).isBefore(b) ? [a, b] : [b, a];
}
