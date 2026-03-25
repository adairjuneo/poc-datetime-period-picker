# DateTimePeriodPicker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable DateTimePeriodPicker React component with calendar dropdown, time selection, input masking, and full keyboard accessibility.

**Architecture:** Context + internal sub-components. Single public export wrapping DateInput, Calendar, TimeSelector, and Dropdown via React Context.

**Tech Stack:** React 19, TypeScript 5.9, date-fns, CSS custom properties, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-25-datetime-period-picker-design.md`

---

## File Structure

```
src/
├── test-setup.ts                                    # (Create) Vitest setup with jest-dom
├── components/
│   └── datetime-period-picker/
│       ├── index.tsx                                # (Modify) Public component + Provider
│       ├── context.tsx                              # (Create) Context, Provider, usePicker hook
│       ├── calendar.tsx                             # (Create) Monthly calendar grid
│       ├── date-input.tsx                           # (Create) Masked pt-BR input
│       ├── time-selector.tsx                        # (Create) Scrollable HH/mm columns
│       ├── dropdown.tsx                             # (Create) Floating container with positioning
│       ├── types.ts                                 # (Create) All type definitions
│       ├── constants.ts                             # (Create) Constants, date helpers, formatting
│       ├── styles.css                               # (Create) Component styles
│       └── __tests__/
│           ├── constants.test.ts                    # (Create) Unit tests for pure helpers
│           └── datetime-period-picker.test.tsx       # (Create) Integration tests
├── app.tsx                                          # (Modify) Demo usage with controlled state
```

Also modified:
- `package.json` -- add dependencies and test scripts
- `vite.config.ts` -- add Vitest config

---

### Task 1: Project Setup & Dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test-setup.ts`

- [ ] **Step 1: Install runtime dependency**

```bash
npm install date-fns
```

- [ ] **Step 2: Install test dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest in vite.config.ts**

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `src/test-setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add test scripts to package.json**

Add to `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 6: Verify setup works**

Run: `npx vitest run`
Expected: "No test files found" or clean exit (no errors)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: add date-fns, vitest, and testing-library dependencies"
```

---

### Task 2: Types

**Files:**
- Create: `src/components/datetime-period-picker/types.ts`

- [ ] **Step 1: Create types.ts with all type definitions**

```typescript
export type Variant = "date" | "datetime";

export type DatePeriod = {
  initial: string;
  final: string;
};

export type DatePeriodChangeEvent = {
  target: {
    name: string;
    value: DatePeriod;
  };
};

export type ActiveField = "initial" | "final" | null;

export type DateTimePeriodPickerProps = {
  variant?: Variant;
  value: DatePeriod;
  onChange: (event: DatePeriodChangeEvent) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
};

export type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
};

export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  initial: Date | null;
  final: Date | null;
  viewDate: Date;
  activeField: ActiveField;
  isOpen: boolean;
  hoveredDate: Date | null;
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (field: ActiveField, hours: number, minutes: number) => void;
  setActiveField: (field: ActiveField) => void;
  updateFromInput: (field: ActiveField, raw: string) => void;
  setHoveredDate: (date: Date | null) => void;
  open: () => void;
  close: () => void;
};
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add type definitions for DateTimePeriodPicker"
```

---

### Task 3: Constants & Helpers

**Files:**
- Create: `src/components/datetime-period-picker/constants.ts`
- Create: `src/components/datetime-period-picker/__tests__/constants.test.ts`

- [ ] **Step 1: Write failing tests for pure helper functions**

Create `__tests__/constants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  DAYS_OF_WEEK,
  MONTHS,
  formatDatePtBr,
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/constants.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement constants.ts**

```typescript
import { format, parse, isValid, startOfWeek, addDays, startOfMonth, isBefore } from 'date-fns';
import type { Variant, CalendarCell } from './types';

export const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const DATE_FORMAT_DISPLAY = 'dd/MM/yyyy';
export const DATETIME_FORMAT_DISPLAY = 'dd/MM/yyyy HH:mm';
export const DATE_FORMAT_ISO = 'yyyy-MM-dd';
export const DATETIME_FORMAT_ISO = "yyyy-MM-dd'T'HH:mm";

export function formatDatePtBr(date: Date | null, variant: Variant): string {
  if (!date) return '';
  const fmt = variant === 'datetime' ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  return format(date, fmt);
}

export function parseDatePtBr(raw: string, variant: Variant): Date | null {
  const fmt = variant === 'datetime' ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  const expectedLength = variant === 'datetime' ? 16 : 10;
  if (raw.length !== expectedLength) return null;

  const parsed = parse(raw, fmt, new Date());
  if (!isValid(parsed)) return null;

  // Round-trip check to reject dates like 30/02 (date-fns parses them as valid but shifts the date)
  const roundTrip = format(parsed, fmt);
  if (roundTrip !== raw) return null;

  return parsed;
}

export function formatToIso(date: Date, variant: Variant): string {
  const fmt = variant === 'datetime' ? DATETIME_FORMAT_ISO : DATE_FORMAT_ISO;
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
  const digits = raw.replace(/\D/g, '');
  const maxDigits = variant === 'datetime' ? 12 : 8;
  const trimmed = digits.slice(0, maxDigits);

  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    if (i === 2 || i === 4) result += '/';
    if (i === 8) result += ' ';
    if (i === 10) result += ':';
    result += trimmed[i];
  }
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/constants.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add constants and helper functions with unit tests"
```

---

### Task 4: Styles

**Files:**
- Create: `src/components/datetime-period-picker/styles.css`

- [ ] **Step 1: Create styles.css with all component styles**

Key CSS rules (all scoped via `.dtp-*` prefix, using project CSS custom properties):

```css
/* --- Wrapper --- */
.dtp-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  font-family: var(--sans);
}

/* --- Inputs row --- */
.dtp-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dtp-inputs-separator {
  color: var(--text);
  font-size: 14px;
  user-select: none;
}

.dtp-input {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text-h);
  font-family: var(--mono);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
  width: 140px;
}

.dtp-input:focus,
.dtp-input--active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-bg);
}

.dtp-input--error {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}

.dtp-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- Dropdown --- */
.dtp-dropdown {
  position: absolute;
  z-index: 1000;
  margin-top: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 12px;
  width: 300px;
}

.dtp-dropdown--above {
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.dtp-dropdown--align-right {
  right: 0;
}

/* --- Calendar --- */
.dtp-calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dtp-calendar-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text);
  font-size: 16px;
}

.dtp-calendar-nav:hover {
  background: var(--accent-bg);
  color: var(--accent);
}

.dtp-calendar-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-h);
  cursor: default;
}

.dtp-calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 4px;
}

.dtp-calendar-weekday {
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  padding: 4px 0;
  user-select: none;
}

.dtp-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

/* --- Day cells --- */
.dtp-day {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-h);
  padding: 0;
  transition: background 0.1s, color 0.1s;
}

.dtp-day:hover:not(.dtp-day--disabled):not(.dtp-day--selected-start):not(.dtp-day--selected-end) {
  background: var(--accent-bg);
}

.dtp-day--outside {
  color: var(--text);
  opacity: 0.4;
}

.dtp-day--disabled {
  color: var(--text);
  opacity: 0.25;
  cursor: not-allowed;
}

.dtp-day--today {
  border: 1px solid var(--accent-border);
}

.dtp-day--selected-start,
.dtp-day--selected-end {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.dtp-day--in-range {
  background: var(--accent-bg);
  border-radius: 0;
}

.dtp-day--range-start {
  border-radius: 6px 0 0 6px;
}

.dtp-day--range-end {
  border-radius: 0 6px 6px 0;
}

.dtp-day--hover-preview {
  background: var(--accent-bg);
  opacity: 0.6;
}

.dtp-day:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* --- Time Selector --- */
.dtp-time-selector {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--border);
  justify-content: center;
}

.dtp-time-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dtp-time-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  text-transform: uppercase;
}

.dtp-time-column {
  height: 160px;
  width: 48px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  border: 1px solid var(--border);
  border-radius: 8px;
  scrollbar-width: none;
}

.dtp-time-column::-webkit-scrollbar {
  display: none;
}

.dtp-time-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  font-size: 13px;
  font-family: var(--mono);
  color: var(--text);
  cursor: pointer;
  scroll-snap-align: center;
  transition: background 0.1s, color 0.1s;
  user-select: none;
}

.dtp-time-item:hover {
  background: var(--accent-bg);
}

.dtp-time-item--active {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}

.dtp-time-selector--disabled {
  opacity: 0.35;
  pointer-events: none;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add DateTimePeriodPicker component styles"
```

---

### Task 5: Context

**Files:**
- Create: `src/components/datetime-period-picker/context.tsx`

- [ ] **Step 1: Implement context.tsx with full state management**

```typescript
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { parseISO, addMonths, addYears, setHours, setMinutes } from 'date-fns';
import { formatToIso, parseDatePtBr, sortPeriod } from './constants';
import type { DateTimePeriodPickerProps, PickerContextValue, ActiveField, Variant } from './types';

const PickerContext = createContext<PickerContextValue | null>(null);

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error('usePicker must be used within PickerProvider');
  return ctx;
}

type PickerProviderProps = DateTimePeriodPickerProps & { children: ReactNode };

export function PickerProvider({ children, ...props }: PickerProviderProps) {
  const variant: Variant = props.variant ?? 'date';
  const disabled = props.disabled ?? false;

  // Parse props.value ISO strings to Date | null
  const initial = props.value.initial ? parseISO(props.value.initial) : null;
  const final = props.value.final ? parseISO(props.value.final) : null;
  const min = props.min ? parseISO(props.min) : null;
  const max = props.max ? parseISO(props.max) : null;

  // Internal ephemeral state
  const [viewDate, setViewDate] = useState<Date>(() => initial ?? new Date());
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const fireChange = useCallback(
    (newInitial: Date | null, newFinal: Date | null) => {
      let i = newInitial;
      let f = newFinal;
      if (i && f) {
        [i, f] = sortPeriod(i, f);
      }
      props.onChange({
        target: {
          name: props.name ?? '',
          value: {
            initial: i ? formatToIso(i, variant) : '',
            final: f ? formatToIso(f, variant) : '',
          },
        },
      });
    },
    [props.onChange, props.name, variant],
  );

  const navigateMonth = useCallback(
    (direction: 1 | -1) => {
      setViewDate((prev) => addMonths(prev, direction));
    },
    [],
  );

  const navigateYear = useCallback(
    (direction: 1 | -1) => {
      setViewDate((prev) => addYears(prev, direction));
    },
    [],
  );

  const selectDate = useCallback(
    (date: Date) => {
      if (disabled) return;

      if (activeField === 'initial') {
        // Preserve existing time if datetime variant
        let newDate = date;
        if (variant === 'datetime' && initial) {
          newDate = setMinutes(setHours(date, initial.getHours()), initial.getMinutes());
        }
        fireChange(newDate, final);
        setActiveField('final');
      } else if (activeField === 'final') {
        let newDate = date;
        if (variant === 'datetime' && final) {
          newDate = setMinutes(setHours(date, final.getHours()), final.getMinutes());
        }
        fireChange(initial, newDate);
        setActiveField(null);
        setIsOpen(false);
        setHoveredDate(null);
      }
    },
    [activeField, disabled, variant, initial, final, fireChange],
  );

  const setTimeAction = useCallback(
    (field: ActiveField, hours: number, minutes: number) => {
      if (!field || disabled) return;

      const base = field === 'initial' ? initial : final;
      if (!base) return;

      const updated = setMinutes(setHours(base, hours), minutes);
      if (field === 'initial') {
        fireChange(updated, final);
      } else {
        fireChange(initial, updated);
      }
    },
    [disabled, initial, final, fireChange],
  );

  const updateFromInput = useCallback(
    (field: ActiveField, raw: string) => {
      if (!field) return;
      const parsed = parseDatePtBr(raw, variant);
      if (!parsed) return;

      // Check min/max
      if (min && parsed < min) return;
      if (max && parsed > max) return;

      if (field === 'initial') {
        fireChange(parsed, final);
      } else {
        fireChange(initial, parsed);
      }
    },
    [variant, min, max, initial, final, fireChange],
  );

  const open = useCallback(() => {
    if (!disabled) setIsOpen(true);
  }, [disabled]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveField(null);
    setHoveredDate(null);
  }, []);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
      initial,
      final,
      viewDate,
      activeField,
      isOpen,
      hoveredDate,
      setViewDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime: setTimeAction,
      setActiveField,
      updateFromInput,
      setHoveredDate,
      open,
      close,
    }),
    [
      variant, min, max, disabled, initial, final,
      viewDate, activeField, isOpen, hoveredDate,
      navigateMonth, navigateYear, selectDate, setTimeAction,
      updateFromInput, open, close,
    ],
  );

  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add PickerContext with state management and actions"
```

---

### Task 6: Date Input

**Files:**
- Create: `src/components/datetime-period-picker/date-input.tsx`

- [ ] **Step 1: Implement date-input.tsx**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePicker } from './context';
import { formatDatePtBr, applyMask } from './constants';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
  placeholder?: string;
};

export function DateInput({ field, placeholder }: DateInputProps) {
  const picker = usePicker();
  const inputRef = useRef<HTMLInputElement>(null);
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Sync external controlled value when not focused
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(formatDatePtBr(dateValue, picker.variant));
      setHasError(false);
    }
  }, [dateValue, picker.variant, isFocused]);

  // Auto-focus when activeField changes to this field
  useEffect(() => {
    if (isActive && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Validate on blur: if incomplete or invalid, show error
    const expectedLen = picker.variant === 'datetime' ? 16 : 10;
    if (localValue.length > 0 && localValue.length < expectedLen) {
      setHasError(true);
    }
  }, [localValue, picker.variant]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value, picker.variant);
      setLocalValue(masked);
      setHasError(false);
      picker.updateFromInput(field as ActiveField, masked);
    },
    [field, picker],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const masked = applyMask(pasted, picker.variant);
      setLocalValue(masked);
      picker.updateFromInput(field as ActiveField, masked);
    },
    [field, picker],
  );

  const displayValue = isFocused ? localValue : formatDatePtBr(dateValue, picker.variant);
  const defaultPlaceholder = picker.variant === 'datetime' ? 'DD/MM/AAAA HH:mm' : 'DD/MM/AAAA';
  const maxLength = picker.variant === 'datetime' ? 16 : 10;

  const className = [
    'dtp-input',
    isActive ? 'dtp-input--active' : '',
    hasError ? 'dtp-input--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={displayValue}
      placeholder={placeholder ?? defaultPlaceholder}
      maxLength={maxLength}
      disabled={picker.disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onPaste={handlePaste}
      aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
      data-field={field}
    />
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add DateInput component with pt-BR mask"
```

---

### Task 7: Dropdown

**Files:**
- Create: `src/components/datetime-period-picker/dropdown.tsx`

- [ ] **Step 1: Implement dropdown.tsx**

```typescript
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { usePicker } from './context';

type DropdownProps = {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

type Position = {
  above: boolean;
  alignRight: boolean;
};

export function Dropdown({ anchorRef, children }: DropdownProps) {
  const picker = usePicker();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ above: false, alignRight: false });

  // Calculate position relative to anchor
  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !dropdownRef.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - anchorRect.bottom;
    const spaceRight = viewportWidth - anchorRect.left;

    setPosition({
      above: spaceBelow < dropdownRect.height && anchorRect.top > dropdownRect.height,
      alignRight: spaceRight < dropdownRect.width,
    });
  }, [anchorRef]);

  // Recalculate on open, resize, scroll
  useEffect(() => {
    if (!picker.isOpen) return;

    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [picker.isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!picker.isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        picker.close();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [picker.isOpen, picker, anchorRef]);

  // Close on Escape
  useEffect(() => {
    if (!picker.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        picker.close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [picker.isOpen, picker]);

  if (!picker.isOpen) return null;

  const className = [
    'dtp-dropdown',
    position.above ? 'dtp-dropdown--above' : '',
    position.alignRight ? 'dtp-dropdown--align-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={dropdownRef} className={className} role="dialog" aria-label="Selecionar período">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Dropdown component with responsive positioning"
```

---

### Task 8: Calendar

**Files:**
- Create: `src/components/datetime-period-picker/calendar.tsx`

- [ ] **Step 1: Implement calendar.tsx**

```typescript
import { useCallback, useRef } from 'react';
import {
  isSameDay,
  isAfter,
  isBefore,
  isToday,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from './constants';

export function Calendar() {
  const picker = usePicker();
  const gridRef = useRef<HTMLDivElement>(null);
  const grid = buildCalendarGrid(picker.viewDate);
  const currentMonth = picker.viewDate.getMonth();
  const currentYear = picker.viewDate.getFullYear();
  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && isBefore(date, picker.min)) return true;
      if (picker.max && isAfter(date, picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );

  const isInRange = useCallback(
    (date: Date) => {
      const start = picker.initial;
      const end = picker.final ?? picker.hoveredDate;
      if (!start || !end) return false;

      const [rangeStart, rangeEnd] = isBefore(start, end) ? [start, end] : [end, start];
      return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
    },
    [picker.initial, picker.final, picker.hoveredDate],
  );

  const getDayClassName = useCallback(
    (cell: (typeof grid)[number]) => {
      const classes = ['dtp-day'];

      if (!cell.isCurrentMonth) classes.push('dtp-day--outside');
      if (isDisabled(cell.date)) classes.push('dtp-day--disabled');
      if (isToday(cell.date)) classes.push('dtp-day--today');

      if (picker.initial && isSameDay(cell.date, picker.initial)) {
        classes.push('dtp-day--selected-start');
      }
      if (picker.final && isSameDay(cell.date, picker.final)) {
        classes.push('dtp-day--selected-end');
      }
      if (isInRange(cell.date)) {
        classes.push('dtp-day--in-range');
      }

      // Hover preview when selecting final date
      if (
        picker.activeField === 'final' &&
        picker.initial &&
        !picker.final &&
        picker.hoveredDate &&
        isInRange(cell.date)
      ) {
        classes.push('dtp-day--hover-preview');
      }

      return classes.join(' ');
    },
    [picker, isDisabled, isInRange],
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      if (isDisabled(date)) return;
      picker.selectDate(date);
    },
    [picker, isDisabled],
  );

  const handleDayHover = useCallback(
    (date: Date) => {
      if (picker.activeField === 'final' && picker.initial && !picker.final) {
        picker.setHoveredDate(date);
      }
    },
    [picker],
  );

  const handleDayLeave = useCallback(() => {
    picker.setHoveredDate(null);
  }, [picker]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: Date) => {
      let nextDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          nextDate = subDays(date, 1);
          break;
        case 'ArrowRight':
          nextDate = addDays(date, 1);
          break;
        case 'ArrowUp':
          nextDate = subWeeks(date, 1);
          break;
        case 'ArrowDown':
          nextDate = addWeeks(date, 1);
          break;
        case 'Home':
          nextDate = startOfMonth(picker.viewDate);
          break;
        case 'End':
          nextDate = endOfMonth(picker.viewDate);
          break;
        case 'PageUp':
          e.preventDefault();
          picker.navigateMonth(-1);
          return;
        case 'PageDown':
          e.preventDefault();
          picker.navigateMonth(1);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleDayClick(date);
          return;
        case 'Escape':
          picker.close();
          return;
        default:
          return;
      }

      if (nextDate) {
        e.preventDefault();
        // Focus the button for nextDate in the grid
        const dayStr = nextDate.toISOString();
        const btn = gridRef.current?.querySelector(`[data-date="${dayStr}"]`) as HTMLButtonElement;
        if (btn) {
          btn.focus();
        } else {
          // Date is in another month, navigate first.
          // NOTE: After setViewDate triggers re-render, the target button won't exist yet.
          // The implementer should add a useEffect that focuses the correct day after
          // viewDate changes (e.g., store a pendingFocusDate ref and focus it post-render).
          if (nextDate.getMonth() !== picker.viewDate.getMonth()) {
            picker.setViewDate(nextDate);
          }
        }
      }
    },
    [picker, handleDayClick],
  );

  return (
    <div className="dtp-calendar">
      <div className="dtp-calendar-header">
        <button
          type="button"
          className="dtp-calendar-nav"
          onClick={() => picker.navigateMonth(-1)}
          aria-label="Mês anterior"
        >
          &#8249;
        </button>
        <span className="dtp-calendar-title">{monthLabel}</span>
        <button
          type="button"
          className="dtp-calendar-nav"
          onClick={() => picker.navigateMonth(1)}
          aria-label="Próximo mês"
        >
          &#8250;
        </button>
      </div>

      <div className="dtp-calendar-weekdays">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="dtp-calendar-weekday">
            {day}
          </span>
        ))}
      </div>

      <div ref={gridRef} className="dtp-calendar-grid" role="grid">
        {grid.map((cell) => (
          <button
            key={cell.date.toISOString()}
            type="button"
            className={getDayClassName(cell)}
            data-date={cell.date.toISOString()}
            onClick={() => handleDayClick(cell.date)}
            onMouseEnter={() => handleDayHover(cell.date)}
            onMouseLeave={handleDayLeave}
            onKeyDown={(e) => handleKeyDown(e, cell.date)}
            tabIndex={isSameDay(cell.date, picker.initial ?? picker.viewDate) ? 0 : -1}
            disabled={isDisabled(cell.date)}
            aria-label={cell.date.toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            aria-selected={
              (picker.initial && isSameDay(cell.date, picker.initial)) ||
              (picker.final && isSameDay(cell.date, picker.final)) ||
              false
            }
          >
            {cell.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Calendar component with grid, navigation, and keyboard support"
```

---

### Task 9: Time Selector

**Files:**
- Create: `src/components/datetime-period-picker/time-selector.tsx`

- [ ] **Step 1: Implement time-selector.tsx**

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { getHours, getMinutes } from 'date-fns';
import { usePicker } from './context';

export function TimeSelector() {
  const picker = usePicker();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const activeDate = picker.activeField === 'initial' ? picker.initial : picker.final;
  const currentHours = activeDate ? getHours(activeDate) : 0;
  const currentMinutes = activeDate ? getMinutes(activeDate) : 0;
  const isDisabled = !activeDate;

  // Scroll to active item on mount and when value changes
  const scrollToActive = useCallback((ref: React.RefObject<HTMLDivElement | null>, index: number) => {
    if (!ref.current) return;
    const item = ref.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!isDisabled) {
      scrollToActive(hoursRef, currentHours);
      scrollToActive(minutesRef, currentMinutes);
    }
  }, [isDisabled, currentHours, currentMinutes, scrollToActive]);

  const handleSelectHour = useCallback(
    (hour: number) => {
      if (isDisabled) return;
      picker.setTime(picker.activeField, hour, currentMinutes);
    },
    [picker, isDisabled, currentMinutes],
  );

  const handleSelectMinute = useCallback(
    (minute: number) => {
      if (isDisabled) return;
      picker.setTime(picker.activeField, currentHours, minute);
    },
    [picker, isDisabled, currentHours],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      type: 'hour' | 'minute',
      value: number,
    ) => {
      const max = type === 'hour' ? 23 : 59;
      let next = value;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          next = value > 0 ? value - 1 : max;
          break;
        case 'ArrowDown':
          e.preventDefault();
          next = value < max ? value + 1 : 0;
          break;
        case 'Enter':
          e.preventDefault();
          if (type === 'hour') handleSelectHour(value);
          else handleSelectMinute(value);
          return;
        default:
          return;
      }

      // Focus next item
      const ref = type === 'hour' ? hoursRef : minutesRef;
      const item = ref.current?.children[next] as HTMLElement;
      if (item) item.focus();
    },
    [handleSelectHour, handleSelectMinute],
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const selectorClass = `dtp-time-selector ${isDisabled ? 'dtp-time-selector--disabled' : ''}`;

  return (
    <div className={selectorClass}>
      <div className="dtp-time-group">
        <span className="dtp-time-label">Hora</span>
        <div
          ref={hoursRef}
          className="dtp-time-column"
          role="listbox"
          aria-label="Selecionar hora"
        >
          {hours.map((h) => (
            <div
              key={h}
              className={`dtp-time-item ${h === currentHours ? 'dtp-time-item--active' : ''}`}
              role="option"
              aria-selected={h === currentHours}
              tabIndex={h === currentHours ? 0 : -1}
              onClick={() => handleSelectHour(h)}
              onKeyDown={(e) => handleKeyDown(e, 'hour', h)}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="dtp-time-group">
        <span className="dtp-time-label">Minuto</span>
        <div
          ref={minutesRef}
          className="dtp-time-column"
          role="listbox"
          aria-label="Selecionar minuto"
        >
          {minutes.map((m) => (
            <div
              key={m}
              className={`dtp-time-item ${m === currentMinutes ? 'dtp-time-item--active' : ''}`}
              role="option"
              aria-selected={m === currentMinutes}
              tabIndex={m === currentMinutes ? 0 : -1}
              onClick={() => handleSelectMinute(m)}
              onKeyDown={(e) => handleKeyDown(e, 'minute', m)}
            >
              {String(m).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add TimeSelector component with scrollable columns"
```

---

### Task 10: Main Component (index.tsx)

**Files:**
- Modify: `src/components/datetime-period-picker/index.tsx`

- [ ] **Step 1: Rewrite index.tsx as the public component assembling all sub-components**

```typescript
import { useRef } from 'react';
import { PickerProvider } from './context';
import { DateInput } from './date-input';
import { Dropdown } from './dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import type { DateTimePeriodPickerProps } from './types';
import './styles.css';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

export function DateTimePeriodPicker(props: DateTimePeriodPickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...props}>
      <div className="dtp-wrapper">
        <div ref={anchorRef} className="dtp-inputs">
          <DateInput field="initial" placeholder={props.placeholder} />
          <span className="dtp-inputs-separator">—</span>
          <DateInput field="final" placeholder={props.placeholder} />
        </div>

        <Dropdown anchorRef={anchorRef}>
          <Calendar />
          {variant === 'datetime' && <TimeSelector />}
        </Dropdown>
      </div>
    </PickerProvider>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify dev server runs**

Run: `npm run dev` (manual check -- component should render two inputs)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: assemble DateTimePeriodPicker main component"
```

---

### Task 11: Integration Tests

**Files:**
- Create: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

- [ ] **Step 1: Write integration tests**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod } from '../types';

function renderPicker(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const defaultProps = {
    value: { initial: '', final: '' } as DatePeriod,
    onChange,
    name: 'period',
    ...overrides,
  };

  const result = render(<DateTimePeriodPicker {...defaultProps} />);
  return { ...result, onChange };
}

describe('DateTimePeriodPicker', () => {
  // --- Basic rendering ---
  describe('rendering', () => {
    it('renders two inputs', () => {
      renderPicker();
      expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
      expect(screen.getByLabelText('Data final')).toBeInTheDocument();
    });

    it('renders with DD/MM/AAAA placeholder for date variant', () => {
      renderPicker({ variant: 'date' });
      const inputs = screen.getAllByPlaceholderText('DD/MM/AAAA');
      expect(inputs).toHaveLength(2);
    });

    it('renders with DD/MM/AAAA HH:mm placeholder for datetime variant', () => {
      renderPicker({ variant: 'datetime' });
      const inputs = screen.getAllByPlaceholderText('DD/MM/AAAA HH:mm');
      expect(inputs).toHaveLength(2);
    });

    it('disables inputs when disabled prop is true', () => {
      renderPicker({ disabled: true });
      expect(screen.getByLabelText('Data inicial')).toBeDisabled();
      expect(screen.getByLabelText('Data final')).toBeDisabled();
    });
  });

  // --- Dropdown open/close ---
  describe('dropdown', () => {
    it('opens dropdown on input focus', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dropdown on Escape', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await userEvent.click(document.body);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not open dropdown when disabled', async () => {
      renderPicker({ disabled: true });
      // Can't click disabled input with userEvent, use fireEvent
      fireEvent.focus(screen.getByLabelText('Data inicial'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Period selection via calendar ---
  describe('calendar selection', () => {
    it('calls onChange with initial date on first day click', async () => {
      const { onChange } = renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Find and click day 15 in the calendar
      const day15 = screen.getByText('15');
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.name).toBe('period');
      expect(event.target.value.initial).not.toBe('');
    });

    it('calls onChange with both dates after selecting two days', async () => {
      const { onChange } = renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      const day10 = screen.getByText('10');
      await userEvent.click(day10);

      const day20 = screen.getByText('20');
      await userEvent.click(day20);

      // Should have been called twice (once for initial, once for final)
      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value.initial).not.toBe('');
      expect(lastCall.target.value.final).not.toBe('');
    });
  });

  // --- Auto-sort ---
  describe('auto-sort', () => {
    it('swaps dates if final < initial', async () => {
      const { onChange } = renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Select day 20 first (initial), then day 5 (final)
      await userEvent.click(screen.getByText('20'));
      await userEvent.click(screen.getByText('5'));

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const initial = lastCall.target.value.initial;
      const final = lastCall.target.value.final;

      // initial should be the earlier date (5th), final should be the later (20th)
      expect(new Date(initial).getTime()).toBeLessThan(new Date(final).getTime());
    });
  });

  // --- Input typing ---
  describe('input typing', () => {
    it('applies mask while typing', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');
    });

    it('calls onChange when valid date is typed', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(onChange).toHaveBeenCalled();
    });

    it('handles paste with formatted date', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.paste('25/03/2026');
      expect(input).toHaveValue('25/03/2026');
    });
  });

  // --- Min/max validation ---
  describe('min/max validation', () => {
    it('disables days before min date in calendar', async () => {
      renderPicker({
        min: '2026-03-15',
        value: { initial: '', final: '' },
      });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Day 10 should be disabled (before min of 15)
      const day10 = screen.getByText('10');
      expect(day10).toBeDisabled();
    });

    it('disables days after max date in calendar', async () => {
      renderPicker({
        max: '2026-03-20',
        value: { initial: '', final: '' },
      });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Day 25 should be disabled (after max of 20)
      const day25 = screen.getByText('25');
      expect(day25).toBeDisabled();
    });

    it('does not call onChange when typing a date before min', async () => {
      const { onChange } = renderPicker({
        min: '2026-03-15',
        value: { initial: '', final: '' },
      });
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '10032026');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --- Async value ---
  describe('async value', () => {
    it('renders with empty values without errors', () => {
      renderPicker({ value: { initial: '', final: '' } });
      expect(screen.getByLabelText('Data inicial')).toHaveValue('');
      expect(screen.getByLabelText('Data final')).toHaveValue('');
    });

    it('updates inputs when value changes externally', () => {
      const { rerender, onChange } = renderPicker();

      rerender(
        <DateTimePeriodPicker
          name="period"
          value={{ initial: '2026-03-25', final: '2026-03-28' }}
          onChange={onChange}
        />,
      );

      expect(screen.getByLabelText('Data inicial')).toHaveValue('25/03/2026');
      expect(screen.getByLabelText('Data final')).toHaveValue('28/03/2026');
    });
  });

  // --- Calendar navigation ---
  describe('calendar navigation', () => {
    it('navigates to next month', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      const nextBtn = screen.getByLabelText('Próximo mês');
      const title = screen.getByText(/\w+ \d{4}/);
      const initialMonth = title.textContent;

      await userEvent.click(nextBtn);

      expect(title.textContent).not.toBe(initialMonth);
    });
  });

  // --- Time selector (datetime) ---
  describe('time selector', () => {
    it('renders time columns for datetime variant', async () => {
      renderPicker({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      expect(screen.getByLabelText('Selecionar hora')).toBeInTheDocument();
      expect(screen.getByLabelText('Selecionar minuto')).toBeInTheDocument();
    });

    it('does not render time columns for date variant', async () => {
      renderPicker({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      expect(screen.queryByLabelText('Selecionar hora')).not.toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`
Expected: All tests PASS (fix any issues that arise from integration)

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (both constants.test.ts and integration tests)

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: add integration tests for DateTimePeriodPicker"
```

---

### Task 12: App Integration & Final Verification

**Files:**
- Modify: `src/app.tsx`

- [ ] **Step 1: Update app.tsx with demo usage**

```typescript
import { useState } from 'react';
import { DateTimePeriodPicker } from './components/datetime-period-picker';
import type { DatePeriod } from './components/datetime-period-picker';

export function App() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [dateTimePeriod, setDateTimePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  return (
    <main>
      <h2>DateTime Period Picker</h2>

      <div className="components">
        <section>
          <h3>Variante: date</h3>
          <DateTimePeriodPicker
            name="datePeriod"
            variant="date"
            value={datePeriod}
            onChange={(e) => setDatePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(datePeriod, null, 2)}</pre>
        </section>

        <section>
          <h3>Variante: datetime</h3>
          <DateTimePeriodPicker
            name="dateTimePeriod"
            variant="datetime"
            value={dateTimePeriod}
            onChange={(e) => setDateTimePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(dateTimePeriod, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: No errors (fix any that appear)

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: integrate DateTimePeriodPicker demo in App"
```

---

## Execution Checklist

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1 | Project Setup & Dependencies | None |
| 2 | Types | Task 1 |
| 3 | Constants & Helpers (with tests) | Task 1, 2 |
| 4 | Styles | Task 1 |
| 5 | Context | Task 2, 3 |
| 6 | Date Input | Task 2, 3, 5 |
| 7 | Dropdown | Task 5 |
| 8 | Calendar | Task 2, 3, 5 |
| 9 | Time Selector | Task 5 |
| 10 | Main Component (index.tsx) | Task 4-9 |
| 11 | Integration Tests | Task 10 |
| 12 | App Integration & Verification | Task 10 |

Tasks 4, 6, 7, 8, 9 can be parallelized after Task 5 is complete.
