import { describe, it, expect } from 'vitest';
import {
  DAYS_OF_WEEK,
  MONTHS,
  DATE_FORMAT_DISPLAY,
  DATETIME_FORMAT_DISPLAY,
  DATE_FORMAT_ISO,
  DATETIME_FORMAT_ISO,
  formatDatePtBr,
  formatToIso,
  parseDatePtBr,
  isValidDate,
  buildCalendarGrid,
  sortPeriod,
  applyMask,
} from '../constants';

describe('constants', () => {
  it('DAYS_OF_WEEK has 7 pt-BR day labels', () => {
    expect(DAYS_OF_WEEK).toHaveLength(7);
    expect(DAYS_OF_WEEK[0]).toBe('Dom');
  });

  it('MONTHS has 12 pt-BR month names', () => {
    expect(MONTHS).toHaveLength(12);
    expect(MONTHS[0]).toBe('Janeiro');
    expect(MONTHS[11]).toBe('Dezembro');
  });

  it('format string constants have expected values', () => {
    expect(DATE_FORMAT_DISPLAY).toBe('dd/MM/yyyy');
    expect(DATETIME_FORMAT_DISPLAY).toBe('dd/MM/yyyy HH:mm');
    expect(DATE_FORMAT_ISO).toBe('yyyy-MM-dd');
    expect(DATETIME_FORMAT_ISO).toBe("yyyy-MM-dd'T'HH:mm");
  });
});

describe('formatDatePtBr', () => {
  it('formats date variant as DD/MM/YYYY', () => {
    const date = new Date(2026, 2, 25);
    expect(formatDatePtBr(date, 'date')).toBe('25/03/2026');
  });

  it('formats datetime variant as DD/MM/YYYY HH:mm', () => {
    const date = new Date(2026, 2, 25, 14, 30);
    expect(formatDatePtBr(date, 'datetime')).toBe('25/03/2026 14:30');
  });

  it('returns empty string for null', () => {
    expect(formatDatePtBr(null, 'date')).toBe('');
  });
});

describe('formatToIso', () => {
  it('formats date variant as YYYY-MM-DD', () => {
    expect(formatToIso(new Date(2026, 2, 25), 'date')).toBe('2026-03-25');
  });

  it('formats datetime variant as YYYY-MM-DDTHH:mm', () => {
    expect(formatToIso(new Date(2026, 2, 25, 14, 30), 'datetime')).toBe('2026-03-25T14:30');
  });
});

describe('parseDatePtBr', () => {
  it('parses DD/MM/YYYY string to Date', () => {
    const result = parseDatePtBr('25/03/2026', 'date');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(2);
    expect(result!.getDate()).toBe(25);
  });

  it('parses DD/MM/YYYY HH:mm string to Date', () => {
    const result = parseDatePtBr('25/03/2026 14:30', 'datetime');
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(14);
    expect(result!.getMinutes()).toBe(30);
  });

  it('returns null for invalid date like 30/02/2026', () => {
    expect(parseDatePtBr('30/02/2026', 'date')).toBeNull();
  });

  it('returns null for invalid date like 31/04/2026', () => {
    expect(parseDatePtBr('31/04/2026', 'date')).toBeNull();
  });

  it('returns null for incomplete string', () => {
    expect(parseDatePtBr('25/03', 'date')).toBeNull();
  });
});

describe('isValidDate', () => {
  it('returns true for valid date', () => {
    expect(isValidDate(new Date(2026, 2, 25))).toBe(true);
  });

  it('returns false for Invalid Date', () => {
    expect(isValidDate(new Date('invalid'))).toBe(false);
  });
});

describe('buildCalendarGrid', () => {
  it('generates 42 cells (6 rows x 7 cols)', () => {
    const grid = buildCalendarGrid(new Date(2026, 2, 1));
    expect(grid).toHaveLength(42);
  });

  it('marks days outside current month', () => {
    const grid = buildCalendarGrid(new Date(2026, 2, 1));
    expect(grid[0].isCurrentMonth).toBe(true);
    const lastCell = grid[41];
    expect(lastCell.isCurrentMonth).toBe(false);
  });

  it('starts on Sunday', () => {
    const grid = buildCalendarGrid(new Date(2026, 2, 1));
    expect(grid[0].date.getDay()).toBe(0);
  });

  it('handles month starting on non-Sunday', () => {
    // April 2026 starts on Wednesday
    const grid = buildCalendarGrid(new Date(2026, 3, 1));
    expect(grid).toHaveLength(42);
    // First cell should be a Sunday from March
    expect(grid[0].date.getDay()).toBe(0);
    expect(grid[0].isCurrentMonth).toBe(false);
  });
});

describe('sortPeriod', () => {
  it('returns same order if initial < final', () => {
    const a = new Date(2026, 2, 20);
    const b = new Date(2026, 2, 25);
    const [start, end] = sortPeriod(a, b);
    expect(start).toBe(a);
    expect(end).toBe(b);
  });

  it('swaps if initial > final', () => {
    const a = new Date(2026, 2, 25);
    const b = new Date(2026, 2, 20);
    const [start, end] = sortPeriod(a, b);
    expect(start).toBe(b);
    expect(end).toBe(a);
  });
});

describe('applyMask', () => {
  it('inserts slashes for date format', () => {
    expect(applyMask('25032026', 'date')).toBe('25/03/2026');
  });

  it('inserts slashes, space and colon for datetime format', () => {
    expect(applyMask('250320261430', 'datetime')).toBe('25/03/2026 14:30');
  });

  it('strips non-numeric characters', () => {
    expect(applyMask('25/03/2026', 'date')).toBe('25/03/2026');
  });

  it('handles partial input', () => {
    expect(applyMask('250', 'date')).toBe('25/0');
  });

  it('truncates excess digits', () => {
    expect(applyMask('250320261234', 'date')).toBe('25/03/2026');
  });
});
