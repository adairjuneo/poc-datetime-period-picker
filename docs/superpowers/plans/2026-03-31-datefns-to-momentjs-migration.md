# date-fns → moment.js Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all date-fns usage with moment.js across 5 source files (46 call sites), keeping native `Date` objects as the internal representation.

**Architecture:** Direct inline substitution — each `dateFnsFunction(date, ...)` call becomes `moment(date).method().toDate()`. No adapter layer, no new files. The pattern `moment(nativeDate).operation().toDate()` eliminates mutability risks by creating/discarding temporary Moment objects.

**Tech Stack:** moment.js >= 2.29, React 19, TypeScript 5.9 (strict, erasableSyntaxOnly), Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-datefns-to-momentjs-migration-design.md`

---

### Task 1: Install moment.js and configure locale

**Files:**
- Modify: `package.json` — add `moment` dependency, remove `date-fns`
- Modify: `src/test-setup.ts` — add moment pt-BR locale import
- Modify: `src/app.tsx` — add moment pt-BR locale import (for dev server)

- [ ] **Step 1: Install moment and remove date-fns**

```bash
npm install moment && npm uninstall date-fns
```

- [ ] **Step 2: Add pt-BR locale import to test setup**

In `src/test-setup.ts`, add at the top:

```ts
import 'moment/locale/pt-br';
```

This ensures `moment.startOf('week')` uses Sunday (dow: 0) in all tests, matching the pt-BR locale behavior.

- [ ] **Step 3: Add pt-BR locale import to app.tsx**

In `src/app.tsx`, add at the top (after React import):

```ts
import 'moment/locale/pt-br';
```

This ensures the dev server demo also uses the correct locale.

- [ ] **Step 4: Run tests to confirm nothing breaks**

```bash
npx vitest run
```

Expected: All 77 tests pass (moment is installed but not yet used).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: swap date-fns for moment.js, configure pt-BR locale"
```

---

### Task 2: Migrate constants.ts

**Files:**
- Modify: `src/components/datetime-period-picker/constants.ts`

This is the foundation file — format tokens, formatting, parsing, validation, calendar grid, and period sorting all live here.

- [ ] **Step 1: Replace the import block**

Replace:
```ts
import {
  format,
  parse,
  isValid,
  startOfWeek,
  addDays,
  startOfMonth,
  isBefore,
} from "date-fns";
```

With:
```ts
import moment from "moment";
```

- [ ] **Step 2: Update format token constants**

Replace:
```ts
export const DATE_FORMAT_DISPLAY = "dd/MM/yyyy";
export const DATETIME_FORMAT_DISPLAY = "dd/MM/yyyy HH:mm";
export const DATE_FORMAT_ISO = "yyyy-MM-dd";
export const DATETIME_FORMAT_ISO = "yyyy-MM-dd'T'HH:mm";
```

With:
```ts
export const DATE_FORMAT_DISPLAY = "DD/MM/YYYY";
export const DATETIME_FORMAT_DISPLAY = "DD/MM/YYYY HH:mm";
export const DATE_FORMAT_ISO = "YYYY-MM-DD";
export const DATETIME_FORMAT_ISO = "YYYY-MM-DD[T]HH:mm";
```

- [ ] **Step 3: Update `formatDatePtBr`**

Replace:
```ts
export function formatDatePtBr(date: Date | null, variant: Variant): string {
  if (!date) return "";
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  return format(date, fmt);
}
```

With:
```ts
export function formatDatePtBr(date: Date | null, variant: Variant): string {
  if (!date) return "";
  const fmt =
    variant === "datetime" ? DATETIME_FORMAT_DISPLAY : DATE_FORMAT_DISPLAY;
  return moment(date).format(fmt);
}
```

- [ ] **Step 4: Update `parseDatePtBr`**

Replace:
```ts
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
```

With:
```ts
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
```

- [ ] **Step 5: Update `formatToIso`**

Replace:
```ts
export function formatToIso(date: Date, variant: Variant): string {
  const fmt = variant === "datetime" ? DATETIME_FORMAT_ISO : DATE_FORMAT_ISO;
  return format(date, fmt);
}
```

With:
```ts
export function formatToIso(date: Date, variant: Variant): string {
  const fmt = variant === "datetime" ? DATETIME_FORMAT_ISO : DATE_FORMAT_ISO;
  return moment(date).format(fmt);
}
```

- [ ] **Step 6: Update `isValidDate`**

Replace:
```ts
export function isValidDate(date: Date): boolean {
  return isValid(date);
}
```

With:
```ts
export function isValidDate(date: Date): boolean {
  return moment(date).isValid();
}
```

- [ ] **Step 7: Update `buildCalendarGrid`**

Replace:
```ts
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
```

With:
```ts
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
```

- [ ] **Step 8: Update `sortPeriod`**

Replace:
```ts
export function sortPeriod(a: Date, b: Date): [Date, Date] {
  return isBefore(a, b) ? [a, b] : [b, a];
}
```

With:
```ts
export function sortPeriod(a: Date, b: Date): [Date, Date] {
  return moment(a).isBefore(b) ? [a, b] : [b, a];
}
```

- [ ] **Step 9: Run tests**

```bash
npx vitest run
```

Expected: 73/77 pass, 4 fail (the format token assertion tests in constants.test.ts — these are updated in Task 7).

- [ ] **Step 10: Commit**

```bash
git add src/components/datetime-period-picker/constants.ts
git commit -m "refactor: migrate constants.ts from date-fns to moment.js"
```

---

### Task 3: Migrate context.tsx

**Files:**
- Modify: `src/components/datetime-period-picker/context.tsx`

- [ ] **Step 1: Replace the import**

Replace:
```ts
import { parseISO, addMonths, addYears, setHours, setMinutes } from "date-fns";
```

With:
```ts
import moment from "moment";
```

- [ ] **Step 2: Update `parseISO` calls in useMemo hooks**

Replace the 4 `parseISO` usages:

```ts
  const initial = useMemo(
    () => (props.value.initial ? parseISO(props.value.initial) : null),
    [props.value.initial],
  );
  const final = useMemo(
    () => (props.value.final ? parseISO(props.value.final) : null),
    [props.value.final],
  );
  const min = useMemo(() => (props.min ? parseISO(props.min) : null), [props.min]);
  const max = useMemo(() => (props.max ? parseISO(props.max) : null), [props.max]);
```

With:

```ts
  const initial = useMemo(
    () => (props.value.initial ? moment(props.value.initial).toDate() : null),
    [props.value.initial],
  );
  const final = useMemo(
    () => (props.value.final ? moment(props.value.final).toDate() : null),
    [props.value.final],
  );
  const min = useMemo(() => (props.min ? moment(props.min).toDate() : null), [props.min]);
  const max = useMemo(() => (props.max ? moment(props.max).toDate() : null), [props.max]);
```

- [ ] **Step 3: Update `navigateMonth`**

Replace:
```ts
  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => addMonths(prev, direction));
  }, []);
```

With:
```ts
  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'months').toDate());
  }, []);
```

- [ ] **Step 4: Update `navigateYear`**

Replace:
```ts
  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => addYears(prev, direction));
  }, []);
```

With:
```ts
  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'years').toDate());
  }, []);
```

- [ ] **Step 5: Update `selectDate` — setHours/setMinutes chains**

In the `selectDate` callback, replace the two blocks that use `setHours`/`setMinutes`:

Replace the initial field block:
```ts
        if (variant === "datetime" && initial) {
          newDate = setMinutes(
            setHours(date, initial.getHours()),
            initial.getMinutes(),
          );
        }
```

With:
```ts
        if (variant === "datetime" && initial) {
          newDate = moment(date)
            .hours(initial.getHours())
            .minutes(initial.getMinutes())
            .toDate();
        }
```

Replace the final field block:
```ts
        if (variant === "datetime" && final) {
          newDate = setMinutes(
            setHours(date, final.getHours()),
            final.getMinutes(),
          );
        }
```

With:
```ts
        if (variant === "datetime" && final) {
          newDate = moment(date)
            .hours(final.getHours())
            .minutes(final.getMinutes())
            .toDate();
        }
```

- [ ] **Step 6: Update `setTimeAction`**

Replace:
```ts
      const updated = setMinutes(setHours(base, hours), minutes);
```

With:
```ts
      const updated = moment(base).hours(hours).minutes(minutes).toDate();
```

- [ ] **Step 7: Run tests**

```bash
npx vitest run
```

Expected: Same as after Task 2 (73 pass, 4 fail on format token assertions).

- [ ] **Step 8: Commit**

```bash
git add src/components/datetime-period-picker/context.tsx
git commit -m "refactor: migrate context.tsx from date-fns to moment.js"
```

---

### Task 4: Migrate calendar.tsx

**Files:**
- Modify: `src/components/datetime-period-picker/calendar.tsx`

- [ ] **Step 1: Replace the import**

Replace:
```ts
import {
  isSameDay,
  isAfter,
  isBefore,
  isToday,
} from 'date-fns';
```

With:
```ts
import moment from 'moment';
```

- [ ] **Step 2: Update `isDisabled` callback**

Replace:
```ts
  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && isBefore(date, picker.min)) return true;
      if (picker.max && isAfter(date, picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );
```

With:
```ts
  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && moment(date).isBefore(picker.min)) return true;
      if (picker.max && moment(date).isAfter(picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );
```

- [ ] **Step 3: Update `isInRange` callback**

Replace:
```ts
      const [rangeStart, rangeEnd] = isBefore(start, end) ? [start, end] : [end, start];
      return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
```

With:
```ts
      const [rangeStart, rangeEnd] = moment(start).isBefore(end) ? [start, end] : [end, start];
      return moment(date).isAfter(rangeStart) && moment(date).isBefore(rangeEnd);
```

- [ ] **Step 4: Update day button data attributes and aria**

In the grid map JSX, replace all `isSameDay`, `isToday`, `isSameDay` calls:

Replace:
```ts
            data-state-today={isToday(cell.date) || undefined}
            data-state-selected-start={(picker.initial && isSameDay(cell.date, picker.initial)) || undefined}
            data-state-selected-end={(picker.final && isSameDay(cell.date, picker.final)) || undefined}
            data-state-focused={(picker.focusedDate && isSameDay(cell.date, picker.focusedDate)) || undefined}
```

With:
```ts
            data-state-today={moment(cell.date).isSame(moment(), 'day') || undefined}
            data-state-selected-start={(picker.initial && moment(cell.date).isSame(picker.initial, 'day')) || undefined}
            data-state-selected-end={(picker.final && moment(cell.date).isSame(picker.final, 'day')) || undefined}
            data-state-focused={(picker.focusedDate && moment(cell.date).isSame(picker.focusedDate, 'day')) || undefined}
```

Replace the `aria-selected` expression:
```ts
            aria-selected={
              (picker.initial && isSameDay(cell.date, picker.initial)) ||
              (picker.final && isSameDay(cell.date, picker.final)) ||
              false
            }
```

With:
```ts
            aria-selected={
              (picker.initial && moment(cell.date).isSame(picker.initial, 'day')) ||
              (picker.final && moment(cell.date).isSame(picker.final, 'day')) ||
              false
            }
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: Same as previous (73 pass, 4 fail on format tokens).

- [ ] **Step 6: Commit**

```bash
git add src/components/datetime-period-picker/calendar.tsx
git commit -m "refactor: migrate calendar.tsx from date-fns to moment.js"
```

---

### Task 5: Migrate time-selector.tsx (simplify to native JS)

**Files:**
- Modify: `src/components/datetime-period-picker/time-selector.tsx`

- [ ] **Step 1: Remove the date-fns import entirely**

Remove:
```ts
import { getHours, getMinutes } from 'date-fns';
```

No replacement import needed — using native `Date` methods instead.

- [ ] **Step 2: Replace `getHours`/`getMinutes` calls**

Replace:
```ts
  const currentHours = activeDate ? getHours(activeDate) : 0;
  const currentMinutes = activeDate ? getMinutes(activeDate) : 0;
```

With:
```ts
  const currentHours = activeDate ? activeDate.getHours() : 0;
  const currentMinutes = activeDate ? activeDate.getMinutes() : 0;
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: Same (73 pass, 4 fail on format tokens).

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/time-selector.tsx
git commit -m "refactor: replace date-fns getHours/getMinutes with native Date methods"
```

---

### Task 6: Migrate use-keyboard-navigation.ts

**Files:**
- Modify: `src/components/datetime-period-picker/use-keyboard-navigation.ts`

- [ ] **Step 1: Replace the import block**

Replace:
```ts
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isBefore,
  isAfter,
  isSameMonth,
} from 'date-fns';
```

With:
```ts
import moment from 'moment';
```

- [ ] **Step 2: Update `isWithinBounds`**

Replace:
```ts
  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (picker.min && isBefore(date, picker.min)) return false;
      if (picker.max && isAfter(date, picker.max)) return false;
      return true;
    },
    [picker.min, picker.max],
  );
```

With:
```ts
  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (picker.min && moment(date).isBefore(picker.min)) return false;
      if (picker.max && moment(date).isAfter(picker.max)) return false;
      return true;
    },
    [picker.min, picker.max],
  );
```

- [ ] **Step 3: Update `moveFocus`**

Replace:
```ts
  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      picker.setFocusedDate(newDate);
      if (!isSameMonth(newDate, picker.viewDate)) {
        picker.setViewDate(startOfMonth(newDate));
      }
    },
    [isWithinBounds, picker.setFocusedDate, picker.viewDate, picker.setViewDate],
  );
```

With:
```ts
  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      picker.setFocusedDate(newDate);
      if (!moment(newDate).isSame(picker.viewDate, 'month')) {
        picker.setViewDate(moment(newDate).startOf('month').toDate());
      }
    },
    [isWithinBounds, picker.setFocusedDate, picker.viewDate, picker.setViewDate],
  );
```

- [ ] **Step 4: Update the switch cases in `handleContainerKeyDown`**

Replace:
```ts
      switch (e.key) {
        case 'ArrowLeft':
          newDate = subDays(date, 1);
          break;
        case 'ArrowRight':
          newDate = addDays(date, 1);
          break;
        case 'ArrowUp':
          newDate = subWeeks(date, 1);
          break;
        case 'ArrowDown':
          newDate = addWeeks(date, 1);
          break;
        case 'PageUp':
          newDate = subMonths(date, 1);
          break;
        case 'PageDown':
          newDate = addMonths(date, 1);
          break;
        case 'Home':
          newDate = startOfMonth(picker.viewDate);
          break;
        case 'End':
          newDate = endOfMonth(picker.viewDate);
          break;
        default:
          return;
      }
```

With:
```ts
      switch (e.key) {
        case 'ArrowLeft':
          newDate = moment(date).subtract(1, 'day').toDate();
          break;
        case 'ArrowRight':
          newDate = moment(date).add(1, 'day').toDate();
          break;
        case 'ArrowUp':
          newDate = moment(date).subtract(1, 'week').toDate();
          break;
        case 'ArrowDown':
          newDate = moment(date).add(1, 'week').toDate();
          break;
        case 'PageUp':
          newDate = moment(date).subtract(1, 'month').toDate();
          break;
        case 'PageDown':
          newDate = moment(date).add(1, 'month').toDate();
          break;
        case 'Home':
          newDate = moment(picker.viewDate).startOf('month').toDate();
          break;
        case 'End':
          newDate = moment(picker.viewDate).endOf('month').toDate();
          break;
        default:
          return;
      }
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: Same (73 pass, 4 fail on format tokens).

- [ ] **Step 6: Commit**

```bash
git add src/components/datetime-period-picker/use-keyboard-navigation.ts
git commit -m "refactor: migrate use-keyboard-navigation.ts from date-fns to moment.js"
```

---

### Task 7: Update format token test assertions

**Files:**
- Modify: `src/components/datetime-period-picker/__tests__/constants.test.ts`

- [ ] **Step 1: Update the 4 format string assertions**

Replace:
```ts
    expect(DATE_FORMAT_DISPLAY).toBe('dd/MM/yyyy');
    expect(DATETIME_FORMAT_DISPLAY).toBe('dd/MM/yyyy HH:mm');
    expect(DATE_FORMAT_ISO).toBe('yyyy-MM-dd');
    expect(DATETIME_FORMAT_ISO).toBe("yyyy-MM-dd'T'HH:mm");
```

With:
```ts
    expect(DATE_FORMAT_DISPLAY).toBe('DD/MM/YYYY');
    expect(DATETIME_FORMAT_DISPLAY).toBe('DD/MM/YYYY HH:mm');
    expect(DATE_FORMAT_ISO).toBe('YYYY-MM-DD');
    expect(DATETIME_FORMAT_ISO).toBe('YYYY-MM-DD[T]HH:mm');
```

- [ ] **Step 2: Run the full test suite**

```bash
npx vitest run
```

Expected: **77/77 tests pass.** All format token assertions now match the moment.js tokens, and all behavioral tests pass unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/constants.test.ts
git commit -m "test: update format token assertions for moment.js tokens"
```

---

### Task 8: Final verification and cleanup

**Files:**
- Verify: All source files — no remaining date-fns imports
- Verify: `package.json` — no date-fns in dependencies
- Verify: `node_modules/date-fns` — should not exist

- [ ] **Step 1: Verify no date-fns imports remain**

```bash
grep -r "from ['\"]date-fns" src/components/datetime-period-picker/
```

Expected: No output (zero matches).

- [ ] **Step 2: Verify date-fns is not in package.json**

```bash
grep "date-fns" package.json
```

Expected: No output.

- [ ] **Step 3: Run the full test suite one final time**

```bash
npx vitest run
```

Expected: **77/77 tests pass.**

- [ ] **Step 4: Run the dev server to visually verify**

```bash
npx vite --open
```

Manually verify: both date and datetime pickers work — selecting dates, typing with mask, time selection, keyboard navigation, min/max constraints.

- [ ] **Step 5: Commit (if any cleanup was needed)**

Only if cleanup changes were made (e.g., removing unused imports):

```bash
git add -A
git commit -m "chore: final cleanup after date-fns to moment.js migration"
```
