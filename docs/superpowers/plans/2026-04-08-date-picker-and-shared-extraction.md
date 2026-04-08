# DateTimePicker + Shared Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract shared infrastructure from `DateTimePeriodPicker` into reusable modules and build a new single-date `DateTimePicker` component.

**Architecture:** Two-phase approach. Phase 1 restructures the existing code into `src/components/date/{shared,period-picker}` without logic changes, validated by 96 existing tests. Phase 2 builds the new `DateTimePicker` in `src/components/date/picker/` using shared modules, with ~30 new tests.

**Tech Stack:** React 19, TypeScript 5.9 (erasableSyntaxOnly), Vite 8, Vitest, react-imask 7.6.1, moment.js, SCSS

---

## File Structure

### Phase 1 — Extract + Move

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/date/shared/types.ts` | `Variant`, `CalendarCell`, `KeyboardEventLike` |
| Create | `src/components/date/shared/constants.ts` | All pure utility functions and locale constants |
| Create | `src/components/date/shared/dropdown.tsx` | Props-based dropdown (decoupled from context) |
| Create | `src/components/date/shared/date-input-utils.ts` | `buildMaskOptions()`, `mergeRefs()` |
| Create | `src/components/date/shared/use-keyboard-navigation.ts` | Params-based hook (decoupled from context) |
| Create | `src/components/date/shared/_variables.scss` | SCSS design tokens |
| Create | `src/components/date/shared/styles.scss` | `@mixin date-component-base` with generic styles |
| Move+Modify | `src/components/date/period-picker/types.ts` | Period-specific types, imports shared types |
| Move+Modify | `src/components/date/period-picker/context.tsx` | Unchanged logic, updated imports |
| Move+Modify | `src/components/date/period-picker/index.tsx` | Updated imports, passes isOpen/onClose to Dropdown |
| Move+Modify | `src/components/date/period-picker/date-input.tsx` | Imports `buildMaskOptions`/`mergeRefs` from shared |
| Move+Modify | `src/components/date/period-picker/calendar.tsx` | Updated imports |
| Move+Modify | `src/components/date/period-picker/time-selector.tsx` | Updated imports |
| Create | `src/components/date/period-picker/styles.scss` | `@include date-component-base` + period-specific styles |
| Move+Modify | `src/components/date/period-picker/__tests__/datetime-period-picker.test.tsx` | Updated imports |
| Move+Modify | `src/components/date/period-picker/__tests__/constants.test.ts` | Updated imports |
| Move+Modify | `src/components/date/period-picker/__tests__/time-selector.test.tsx` | Updated imports |
| Move+Modify | `src/components/date/period-picker/__tests__/use-keyboard-navigation.test.tsx` | Updated imports |
| Modify | `src/app.tsx` | Updated import paths |

### Phase 2 — DateTimePicker

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/date/picker/types.ts` | `DateTimePickerProps`, `DateChangeEvent`, `PickerContextValue` |
| Create | `src/components/date/picker/context.tsx` | Single-date PickerProvider |
| Create | `src/components/date/picker/date-input.tsx` | Single-date input with forwardRef |
| Create | `src/components/date/picker/calendar.tsx` | Calendar without range/hover logic |
| Create | `src/components/date/picker/time-selector.tsx` | TimeSelector without activeField |
| Create | `src/components/date/picker/styles.scss` | `@include date-component-base` + selected style |
| Create | `src/components/date/picker/index.tsx` | forwardRef shell component |
| Create | `src/components/date/picker/__tests__/datetime-picker.test.tsx` | ~30 tests |
| Modify | `src/app.tsx` | Add DateTimePicker demos |

---

## Phase 1: Shared Extraction + Move

### Task 1: Create folder structure and shared/types.ts

**Files:**
- Create: `src/components/date/shared/types.ts`

- [ ] **Step 1: Create the directory structure**

Run: `mkdir -p src/components/date/shared src/components/date/period-picker/__tests__ src/components/date/picker/__tests__`

- [ ] **Step 2: Create shared/types.ts**

```typescript
// src/components/date/shared/types.ts
export type Variant = 'date' | 'datetime';

export type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
};

export type KeyboardEventLike = {
  key: string;
  preventDefault: () => void;
  stopPropagation: () => void;
};
```

- [ ] **Step 3: Verify file was created**

Run: `ls src/components/date/shared/types.ts`
Expected: File exists.

---

### Task 2: Create shared/constants.ts

**Files:**
- Create: `src/components/date/shared/constants.ts`

- [ ] **Step 1: Create shared/constants.ts**

This is the entire content of the current `datetime-period-picker/constants.ts`, with import path changed to point to `./types`:

```typescript
// src/components/date/shared/constants.ts
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
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`
Expected: No errors related to shared/constants.ts (pre-existing LSP errors on other files are fine).

---

### Task 3: Create shared/date-input-utils.ts

**Files:**
- Create: `src/components/date/shared/date-input-utils.ts`

- [ ] **Step 1: Create shared/date-input-utils.ts**

Extract `buildMaskOptions` and `mergeRefs` from `datetime-period-picker/date-input.tsx`:

```typescript
// src/components/date/shared/date-input-utils.ts
import type React from 'react';
import IMask from 'imask';
import type { FactoryOpts } from 'imask';
import moment from 'moment';

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && typeof ref === 'object') {
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };
}

export function buildMaskOptions(variant: 'date' | 'datetime') {
  const blocks: Record<string, unknown> = {
    d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
    m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
    Y: { mask: IMask.MaskedRange, from: 1900, to: 2099, maxLength: 4 },
  };

  if (variant === 'datetime') {
    blocks.H = { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 };
    blocks.M = { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 };
  }

  const pattern = variant === 'datetime' ? '`d/`m/`Y `H:`M' : '`d/`m/`Y';
  const fmt = variant === 'datetime' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';

  return {
    mask: Date,
    pattern,
    lazy: false,
    placeholderChar: '_',
    overwrite: true,
    autofix: false,
    blocks,
    format: (date: Date) => moment(date).format(fmt),
    parse: (str: string) => moment(str, fmt).toDate(),
  // Cast needed: iMask's FactoryOpts type doesn't cover MaskedDate-specific
  // options (blocks, format, parse). The runtime config is correct.
  } as unknown as FactoryOpts;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 4: Create shared/dropdown.tsx (decoupled from context)

**Files:**
- Create: `src/components/date/shared/dropdown.tsx`

- [ ] **Step 1: Create shared/dropdown.tsx**

Refactored from `datetime-period-picker/dropdown.tsx`. Receives `isOpen`/`onClose` via props instead of consuming `usePicker()`:

```typescript
// src/components/date/shared/dropdown.tsx
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

type DropdownProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
};

type Position = {
  above: boolean;
  alignRight: boolean;
};

export function Dropdown({ anchorRef, isOpen, onClose, ariaLabel = 'Selecionar data', children }: DropdownProps) {
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
    if (!isOpen) return;

    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="dropdown"
      data-state-above={position.above || undefined}
      data-state-align-right={position.alignRight || undefined}
      role="dialog"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 5: Create shared/use-keyboard-navigation.ts (decoupled from context)

**Files:**
- Create: `src/components/date/shared/use-keyboard-navigation.ts`

- [ ] **Step 1: Create shared/use-keyboard-navigation.ts**

Refactored from `datetime-period-picker/use-keyboard-navigation.ts`. Receives dependencies via `KeyboardNavDeps` param instead of consuming `usePicker()`:

```typescript
// src/components/date/shared/use-keyboard-navigation.ts
import { useCallback } from 'react';
import moment from 'moment';
import type { KeyboardEventLike } from './types';

export type KeyboardNavDeps = {
  isOpen: boolean;
  focusedDate: Date | null;
  viewDate: Date;
  min: Date | null;
  max: Date | null;
  setFocusedDate: (date: Date | null) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (dir: 1 | -1) => void;
  selectDate: (date: Date) => void;
};

export function useKeyboardNavigation(deps: KeyboardNavDeps) {
  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (deps.min && moment(date).isBefore(deps.min)) return false;
      if (deps.max && moment(date).isAfter(deps.max)) return false;
      return true;
    },
    [deps.min, deps.max],
  );

  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      deps.setFocusedDate(newDate);
      if (!moment(newDate).isSame(deps.viewDate, 'month')) {
        deps.setViewDate(moment(newDate).startOf('month').toDate());
      }
    },
    [isWithinBounds, deps.setFocusedDate, deps.viewDate, deps.setViewDate],
  );

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!deps.isOpen || !deps.focusedDate) return;

      const date = deps.focusedDate;
      let newDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          newDate = moment(date).subtract(1, 'days').toDate();
          break;
        case 'ArrowRight':
          newDate = moment(date).add(1, 'days').toDate();
          break;
        case 'ArrowUp':
          newDate = moment(date).subtract(1, 'weeks').toDate();
          break;
        case 'ArrowDown':
          newDate = moment(date).add(1, 'weeks').toDate();
          break;
        case 'PageUp':
          newDate = moment(date).subtract(1, 'months').toDate();
          break;
        case 'PageDown':
          newDate = moment(date).add(1, 'months').toDate();
          break;
        case 'Home':
          newDate = moment(deps.viewDate).startOf('month').toDate();
          break;
        case 'End':
          newDate = moment(deps.viewDate).endOf('month').toDate();
          break;
        default:
          return; // Don't preventDefault for unhandled keys
      }

      e.preventDefault();
      if (newDate) {
        moveFocus(newDate);
      }
    },
    [deps.isOpen, deps.focusedDate, deps.viewDate, moveFocus],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEventLike) => {
      if (!deps.isOpen || !deps.focusedDate) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        deps.selectDate(deps.focusedDate);
      }
    },
    [deps.isOpen, deps.focusedDate, deps.selectDate],
  );

  return { handleContainerKeyDown, handleInputKeyDown };
}
```

Note: The `_field` parameter is removed from `handleInputKeyDown` — it was unused in the body.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 6: Create shared SCSS files

**Files:**
- Create: `src/components/date/shared/_variables.scss`
- Create: `src/components/date/shared/styles.scss`

- [ ] **Step 1: Create shared/_variables.scss**

Exact copy of `datetime-period-picker/_variables.scss`:

```scss
// src/components/date/shared/_variables.scss

// Typography
$font-sans: system-ui, -apple-system, sans-serif;
$font-mono: 'SF Mono', 'Fira Code', monospace;

// Colors
$text: #1a1a2e;
$text-heading: #0f0f23;
$text-muted: #6b7280;
$bg: #ffffff;
$bg-subtle: #f8f9fa;
$border: #e2e8f0;
$accent: #2563eb;
$accent-bg: #eff6ff;
$accent-border: #bfdbfe;
$shadow: 0 4px 24px rgba(0, 0, 0, 0.08);

// Sizing
$dropdown-max-height: 380px;
$input-height: 2.25rem;
$day-cell-size: 2rem;
```

- [ ] **Step 2: Create shared/styles.scss**

Contains everything from `datetime-period-picker/styles.scss` EXCEPT:
- The `.datetime-period-picker` wrapper class (each component defines its own)
- `.input-group` (period-specific: two inputs side by side)
- `.separator` (period-specific: dash between inputs)
- `.day[data-state-selected-start]`, `.day[data-state-selected-end]` (period-specific)
- `.day[data-state-in-range]` with directional border-radius (period-specific)
- `.day[data-state-hover-preview]` (period-specific)

```scss
// src/components/date/shared/styles.scss
@use 'variables' as *;

@mixin date-component-base {
  // --- Wrapper ---
  position: relative;
  display: inline-flex;
  flex-direction: column;
  font-family: $font-sans;

  .label {
    font-size: 14px;
    font-weight: 500;
    color: $text-heading;
    margin-bottom: 4px;

    &[data-state-label-uppercase='true'] {
      text-transform: uppercase;
    }
  }

  .input {
    padding: 8px 12px;
    border: 1px solid $border;
    border-radius: 6px;
    background: $bg;
    color: $text-heading;
    font-family: $font-mono;
    font-size: 14px;
    outline: none;
    transition: border-color 0.15s;
    width: 140px;

    &:focus,
    &[data-state-active='true'] {
      border-color: $accent;
      box-shadow: 0 0 0 2px $accent-bg;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &[data-state-read-only='true'] {
      cursor: default;
    }

    &[data-state-undigitable='true'] {
      cursor: pointer;
    }
  }

  // --- Dropdown ---
  .dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 1000;
    margin-top: 4px;
    background: $bg;
    border: 1px solid $border;
    border-radius: 10px;
    box-shadow: $shadow;
    padding: 12px;
    width: 300px;

    &[data-state-above='true'] {
      top: auto;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: 4px;
    }

    &[data-state-align-right='true'] {
      right: 0;
    }
  }

  // --- Calendar ---
  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .calendar-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 6px;
    cursor: pointer;
    color: $text;
    font-size: 16px;

    &:hover {
      background: $accent-bg;
      color: $accent;
    }
  }

  .calendar-title {
    font-size: 14px;
    font-weight: 500;
    color: $text-heading;
    cursor: default;
  }

  .weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
  }

  .weekday {
    text-align: center;
    font-size: 11px;
    font-weight: 500;
    color: $text;
    padding: 4px 0;
    user-select: none;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  // --- Day cells (base) ---
  .day {
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
    color: $text-heading;
    padding: 0;
    transition: background 0.1s, color 0.1s;

    &:hover:not([data-state-disabled='true']) {
      background: $accent-bg;
    }

    &[data-state-outside='true'] {
      color: $text;
      opacity: 0.4;
    }

    &[data-state-disabled='true'] {
      color: $text;
      opacity: 0.25;
      cursor: not-allowed;
    }

    &[data-state-today='true'] {
      border: 1px solid $accent-border;
    }

    // focus-visible is not used — buttons don't receive real focus in dual-focus mode
    &[data-state-focused='true'] {
      outline: 2px solid $accent;
      outline-offset: -2px;
      background-color: color-mix(in srgb, $accent 10%, transparent);
    }
  }

  // --- Time Selector ---
  .time-selector {
    display: flex;
    gap: 12px;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px solid $border;
    justify-content: center;

    &[data-state-disabled='true'] {
      opacity: 0.35;
      pointer-events: none;
    }
  }

  .time-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .time-label {
    font-size: 11px;
    font-weight: 500;
    color: $text;
    text-transform: uppercase;
  }

  .time-column {
    height: 160px;
    width: 48px;
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    border: 1px solid $border;
    border-radius: 8px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .time-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    font-size: 13px;
    font-family: $font-mono;
    color: $text;
    cursor: pointer;
    scroll-snap-align: center;
    transition: background 0.1s, color 0.1s;
    user-select: none;

    &:hover {
      background: $accent-bg;
    }

    &[data-state-active='true'] {
      background: $accent;
      color: #fff;
      font-weight: 600;
    }
  }
}
```

Note: The `.day:hover` selector in shared no longer excludes `data-state-selected-start` / `data-state-selected-end` — those are period-specific. Each component's own styles will handle their selection-specific hover exclusions.

- [ ] **Step 3: Verify SCSS files were created**

Run: `ls src/components/date/shared/`
Expected: `_variables.scss  constants.ts  date-input-utils.ts  dropdown.tsx  styles.scss  types.ts  use-keyboard-navigation.ts`

---

### Task 7: Move period-picker types

**Files:**
- Create: `src/components/date/period-picker/types.ts`

- [ ] **Step 1: Create period-picker/types.ts**

Import shared types and keep period-specific types:

```typescript
// src/components/date/period-picker/types.ts
import type { Variant, CalendarCell, KeyboardEventLike } from '../shared/types';

// Re-export shared types for convenience within this module
export type { Variant, CalendarCell, KeyboardEventLike };

export type DatePeriod<
  I extends string = 'initial',
  F extends string = 'final'
> = Record<I, string> & Record<F, string>;

export type DatePeriodChangeEvent<
  I extends string = 'initial',
  F extends string = 'final'
> = {
  target: {
    name: string;
    value: DatePeriod<I, F>;
  };
};

export type ActiveField = "initial" | "final" | null;

export type DateTimePeriodPickerProps<
  I extends string = 'initial',
  F extends string = 'final'
> = {
  variant?: Variant;
  value: DatePeriod<I, F>;
  onChange: (event: DatePeriodChangeEvent<I, F>) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  name?: string;
  label?: string;
  labelUppercase?: boolean;
  initialName?: I;
  finalName?: F;
  initialRef?: React.RefObject<HTMLInputElement | null>;
  finalRef?: React.RefObject<HTMLInputElement | null>;
};

export type InputKeyDownHandler = (e: KeyboardEventLike, field: 'initial' | 'final') => void;

export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  readOnly: boolean;
  undigitable: boolean;
  componentName: string;
  initialName: string;
  finalName: string;
  initial: Date | null;
  final: Date | null;
  viewDate: Date;
  activeField: ActiveField;
  isOpen: boolean;
  hoveredDate: Date | null;
  focusedDate: Date | null;
  setFocusedDate: (date: Date | null) => void;
  onInputKeyDown: InputKeyDownHandler;
  setOnInputKeyDown: (fn: InputKeyDownHandler) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (field: ActiveField, hours: number, minutes: number) => void;
  setActiveField: (field: ActiveField) => void;
  updateFromInput: (field: ActiveField, raw: string) => void;
  clearField: (field: ActiveField) => void;
  setHoveredDate: (date: Date | null) => void;
  open: () => void;
  close: () => void;
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 8: Move period-picker context.tsx

**Files:**
- Create: `src/components/date/period-picker/context.tsx`

- [ ] **Step 1: Create period-picker/context.tsx**

Same logic as `datetime-period-picker/context.tsx`, only imports updated:

```typescript
// src/components/date/period-picker/context.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import moment from "moment";
import { formatToIso, parseDatePtBr, sortPeriod } from "../shared/constants";
import type {
  DateTimePeriodPickerProps,
  DatePeriodChangeEvent,
  PickerContextValue,
  ActiveField,
  Variant,
  InputKeyDownHandler,
} from "./types";

const PickerContext = createContext<PickerContextValue | null>(null);

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx;
}

type PickerProviderProps = DateTimePeriodPickerProps & { children: ReactNode };

export function PickerProvider({ children, ...props }: PickerProviderProps) {
  const variant: Variant = props.variant ?? "date";
  const disabled = props.disabled ?? false;
  const readOnly = props.readOnly ?? false;
  const undigitable = props.undigitable ?? false;
  const iName = props.initialName ?? 'initial';
  const fName = props.finalName ?? 'final';
  const componentName = props.name ?? '';

  // Parse props.value ISO strings to Date | null (memoized to preserve referential equality)
  const initialIso = (props.value as Record<string, string>)[iName] ?? '';
  const finalIso = (props.value as Record<string, string>)[fName] ?? '';
  const initial = useMemo(
    () => (initialIso ? moment(initialIso).toDate() : null),
    [initialIso],
  );
  const final = useMemo(
    () => (finalIso ? moment(finalIso).toDate() : null),
    [finalIso],
  );
  const min = useMemo(() => (props.min ? moment(props.min).toDate() : null), [props.min]);
  const max = useMemo(() => (props.max ? moment(props.max).toDate() : null), [props.max]);

  // Internal ephemeral state
  const [viewDate, setViewDate] = useState<Date>(() => initial ?? new Date());
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [onInputKeyDown, setOnInputKeyDownState] = useState<InputKeyDownHandler>(() => () => {});
  const setOnInputKeyDown = useCallback((fn: InputKeyDownHandler) => {
    setOnInputKeyDownState(() => fn);
  }, []);

  const fireChange = useCallback(
    (newInitial: Date | null, newFinal: Date | null) => {
      let i = newInitial;
      let f = newFinal;
      if (i && f) {
        [i, f] = sortPeriod(i, f);
      }
      props.onChange({
        target: {
          name: componentName,
          value: {
            [iName]: i ? formatToIso(i, variant) : '',
            [fName]: f ? formatToIso(f, variant) : '',
          },
        },
      } as DatePeriodChangeEvent); // Cast needed: computed property keys lose generic inference
    },
    [props.onChange, componentName, variant, iName, fName],
  );

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'months').toDate());
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'years').toDate());
  }, []);

  const selectDate = useCallback(
    (date: Date) => {
      if (disabled) return;

      if (activeField === "initial") {
        // Preserve existing time if datetime variant
        let newDate = date;
        if (variant === "datetime" && initial) {
          newDate = moment(date)
            .hours(initial.getHours())
            .minutes(initial.getMinutes())
            .toDate();
        }
        fireChange(newDate, final);
        setActiveField("final");
      } else if (activeField === "final") {
        let newDate = date;
        if (variant === "datetime" && final) {
          newDate = moment(date)
            .hours(final.getHours())
            .minutes(final.getMinutes())
            .toDate();
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

      const base = field === "initial" ? initial : final;
      if (!base) return;

      const updated = moment(base).hours(hours).minutes(minutes).toDate();
      if (field === "initial") {
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

      if (field === "initial") {
        fireChange(parsed, final);
      } else {
        fireChange(initial, parsed);
      }
    },
    [variant, min, max, initial, final, fireChange],
  );

  const clearField = useCallback(
    (field: ActiveField) => {
      if (!field) return;

      if (field === 'initial') {
        fireChange(null, final);
      } else {
        fireChange(initial, null);
      }

      setViewDate(new Date());
      setFocusedDate(new Date());
    },
    [initial, final, fireChange],
  );

  const open = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen(true);
      if (initial) setViewDate(initial);
      const fieldDate = initial ?? new Date();
      setFocusedDate(fieldDate);
    }
  }, [disabled, readOnly, initial]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveField(null);
    setHoveredDate(null);
    setFocusedDate(null);
  }, []);

  // Sync focusedDate and viewDate when activeField changes (e.g. user tabs between inputs)

  useEffect(() => {
    if (!isOpen || !activeField) return;
    const date = activeField === 'initial' ? initial : final;
    setFocusedDate(date ?? new Date());
    setViewDate(date ?? new Date());
  }, [isOpen, activeField]);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      initialName: iName,
      finalName: fName,
      initial,
      final,
      viewDate,
      activeField,
      isOpen,
      hoveredDate,
      focusedDate,
      setFocusedDate,
      onInputKeyDown,
      setOnInputKeyDown,
      setViewDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime: setTimeAction,
      setActiveField,
      updateFromInput,
      clearField,
      setHoveredDate,
      open,
      close,
    }),
    [
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      iName,
      fName,
      initial,
      final,
      viewDate,
      activeField,
      isOpen,
      hoveredDate,
      focusedDate,
      onInputKeyDown,
      setOnInputKeyDown,
      navigateMonth,
      navigateYear,
      selectDate,
      setTimeAction,
      updateFromInput,
      clearField,
      open,
      close,
    ],
  );

  return (
    <PickerContext.Provider value={value}>{children}</PickerContext.Provider>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 9: Move period-picker date-input.tsx

**Files:**
- Create: `src/components/date/period-picker/date-input.tsx`

- [ ] **Step 1: Create period-picker/date-input.tsx**

Same logic, imports `buildMaskOptions` and `mergeRefs` from shared, removes their local definitions:

```typescript
// src/components/date/period-picker/date-input.tsx
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useIMask } from 'react-imask';
import { usePicker } from './context';
import { formatDatePtBr } from '../shared/constants';
import { buildMaskOptions, mergeRefs } from '../shared/date-input-utils';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
  externalRef?: React.RefObject<HTMLInputElement | null>;
};

export function DateInput({ field, externalRef }: DateInputProps) {
  const picker = usePicker();
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const isExternalUpdate = useRef(false);
  const unmaskedRef = useRef('');
  const dateOnFocusRef = useRef<Date | null>(null);
  const dateValueRef = useRef(dateValue);
  dateValueRef.current = dateValue;

  const fieldInputName = field === 'initial' ? picker.initialName : picker.finalName;
  const inputName = picker.componentName ? `${picker.componentName}.${fieldInputName}` : fieldInputName;

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  // inputRef gives direct DOM access (for .focus()); maskRef is the callback
  // ref that useIMask uses to bind its event listeners to the <input>.
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string, mask) => {
      if (isExternalUpdate.current) return;

      if (mask.unmaskedValue === '') {
        picker.clearField(field as ActiveField);
        return;
      }

      picker.updateFromInput(field as ActiveField, value);
    },
  });

  // Keep ref in sync so handleBlur reads latest value without re-creating
  unmaskedRef.current = unmaskedValue;

  // Sync iMask value when the controlled date value changes externally
  // (e.g., calendar selection, parent prop change)
  useEffect(() => {
    isExternalUpdate.current = true;
    setValue(formatDatePtBr(dateValue, picker.variant));
    // Use queueMicrotask to reset the guard after iMask processes the setValue
    queueMicrotask(() => {
      isExternalUpdate.current = false;
    });
  }, [dateValue, picker.variant, setValue]);

  // Auto-focus when activeField changes to this field
  useEffect(() => {
    if (isActive && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handleFocus = useCallback(() => {
    dateOnFocusRef.current = dateValueRef.current;
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    const len = unmaskedRef.current.length;

    if (len > 0 && len < expectedDigits) {
      const savedDate = dateOnFocusRef.current;
      if (savedDate) {
        // Restore the previous date — let onAccept propagate to parent
        setValue(formatDatePtBr(savedDate, picker.variant));
      } else {
        // No previous date: clear to placeholder, guard to avoid extra onChange
        isExternalUpdate.current = true;
        setValue('');
        queueMicrotask(() => {
          isExternalUpdate.current = false;
        });
      }
    }
  }, [picker.variant, setValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      picker.onInputKeyDown(e, field);
    },
    [picker, field],
  );

  const focusedDateId =
    picker.isOpen && isActive && picker.focusedDate
      ? `dtp-day-${picker.focusedDate.toISOString()}`
      : undefined;

  return (
    <input
      ref={mergeRefs(maskRef, externalRef)}
      type="text"
      className="input"
      name={inputName}
      data-state-active={isActive || undefined}
      data-state-read-only={picker.readOnly || undefined}
      data-state-undigitable={picker.undigitable || undefined}
      disabled={picker.disabled}
      readOnly={picker.readOnly || picker.undigitable}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={picker.isOpen && isActive}
      aria-activedescendant={focusedDateId}
      aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
      data-field={field}
    />
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 10: Move period-picker calendar.tsx and time-selector.tsx

**Files:**
- Create: `src/components/date/period-picker/calendar.tsx`
- Create: `src/components/date/period-picker/time-selector.tsx`

- [ ] **Step 1: Create period-picker/calendar.tsx**

Same logic, updated imports:

```typescript
// src/components/date/period-picker/calendar.tsx
import { useCallback } from 'react';
import moment from 'moment';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from '../shared/constants';

export function Calendar() {
  const picker = usePicker();
  const grid = buildCalendarGrid(picker.viewDate);
  const currentMonth = picker.viewDate.getMonth();
  const currentYear = picker.viewDate.getFullYear();
  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && moment(date).isBefore(picker.min)) return true;
      if (picker.max && moment(date).isAfter(picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );

  const isInRange = useCallback(
    (date: Date) => {
      const start = picker.initial;
      const end = picker.final ?? picker.hoveredDate ?? picker.focusedDate;
      if (!start || !end) return false;

      const [rangeStart, rangeEnd] = moment(start).isBefore(end) ? [start, end] : [end, start];
      return moment(date).isAfter(rangeStart) && moment(date).isBefore(rangeEnd);
    },
    [picker.initial, picker.final, picker.hoveredDate, picker.focusedDate],
  );

  const isHoverPreview = useCallback(
    (date: Date) =>
      picker.activeField === 'final' &&
      picker.initial &&
      !picker.final &&
      (picker.hoveredDate || picker.focusedDate) &&
      isInRange(date),
    [picker, isInRange],
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

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(-1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Mês anterior"
        >
          &#8249;
        </button>
        <span className="calendar-title">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Próximo mês"
        >
          &#8250;
        </button>
      </div>

      <div className="weekdays">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="grid" role="grid">
        {grid.map((cell) => (
          <button
            key={cell.date.toISOString()}
            id={`dtp-day-${cell.date.toISOString()}`}
            type="button"
            className="day"
            data-date={cell.date.toISOString()}
            data-state-outside={!cell.isCurrentMonth || undefined}
            data-state-disabled={isDisabled(cell.date) || undefined}
            data-state-today={moment(cell.date).isSame(moment(), 'day') || undefined}
            data-state-selected-start={(picker.initial && moment(cell.date).isSame(picker.initial, 'day')) || undefined}
            data-state-selected-end={(picker.final && moment(cell.date).isSame(picker.final, 'day')) || undefined}
            data-state-focused={(picker.focusedDate && moment(cell.date).isSame(picker.focusedDate, 'day')) || undefined}
            data-state-in-range={isInRange(cell.date) || undefined}
            data-state-hover-preview={isHoverPreview(cell.date) || undefined}
            onClick={() => handleDayClick(cell.date)}
            onMouseEnter={() => handleDayHover(cell.date)}
            onMouseLeave={handleDayLeave}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex={-1}
            disabled={isDisabled(cell.date)}
            aria-label={cell.date.toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            aria-selected={
              (picker.initial && moment(cell.date).isSame(picker.initial, 'day')) ||
              (picker.final && moment(cell.date).isSame(picker.final, 'day')) ||
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

- [ ] **Step 2: Create period-picker/time-selector.tsx**

Same logic, updated imports:

```typescript
// src/components/date/period-picker/time-selector.tsx
import { useEffect, useRef, useCallback } from 'react';
import { usePicker } from './context';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeSelector() {
  const { activeField, initial, final, setTime } = usePicker();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const activeDate = activeField === 'initial' ? initial : final;
  const currentHours = activeDate ? activeDate.getHours() : 0;
  const currentMinutes = activeDate ? activeDate.getMinutes() : 0;
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
      setTime(activeField, hour, currentMinutes);
    },
    [setTime, activeField, isDisabled, currentMinutes],
  );

  const handleSelectMinute = useCallback(
    (minute: number) => {
      if (isDisabled) return;
      setTime(activeField, currentHours, minute);
    },
    [setTime, activeField, isDisabled, currentHours],
  );

  // Prevent mousedown from stealing focus from the input fields.
  const preventFocusSteal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const noopKeyDown = useCallback((_e: React.KeyboardEvent) => {
    // Intentionally empty — these items never receive keyboard focus.
  }, []);

  return (
    <div className="time-selector" data-state-disabled={isDisabled || undefined}>
      <div className="time-group">
        <span className="time-label">Hora</span>
        <div
          ref={hoursRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar hora"
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="time-item"
              data-state-active={h === currentHours || undefined}
              role="option"
              aria-selected={h === currentHours}
              tabIndex={-1}
              onClick={() => handleSelectHour(h)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="time-group">
        <span className="time-label">Minuto</span>
        <div
          ref={minutesRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar minuto"
        >
          {MINUTES.map((m) => (
            <div
              key={m}
              className="time-item"
              data-state-active={m === currentMinutes || undefined}
              role="option"
              aria-selected={m === currentMinutes}
              tabIndex={-1}
              onClick={() => handleSelectMinute(m)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
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

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 11: Move period-picker index.tsx and styles

**Files:**
- Create: `src/components/date/period-picker/index.tsx`
- Create: `src/components/date/period-picker/styles.scss`

- [ ] **Step 1: Create period-picker/styles.scss**

Includes the shared mixin and adds period-specific styles:

```scss
// src/components/date/period-picker/styles.scss
@use '../shared/variables' as *;
@use '../shared/styles';

.datetime-period-picker {
  @include styles.date-component-base;

  // --- Period-specific: Inputs row ---
  .input-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .separator {
    color: $text;
    font-size: 14px;
    user-select: none;
  }

  // --- Period-specific: Day selection ---
  .day {
    &:hover:not([data-state-disabled='true']):not([data-state-selected-start='true']):not([data-state-selected-end='true']) {
      background: $accent-bg;
    }

    &[data-state-selected-start='true'],
    &[data-state-selected-end='true'] {
      background: $accent;
      color: #fff;
      font-weight: 600;
    }

    &[data-state-in-range='true'] {
      background: $accent-bg;
      border-radius: 0;

      &[data-state-selected-start='true'] {
        border-radius: 6px 0 0 6px;
      }

      &[data-state-selected-end='true'] {
        border-radius: 0 6px 6px 0;
      }
    }

    &[data-state-hover-preview='true'] {
      background: $accent-bg;
      opacity: 0.6;
    }
  }
}
```

Note: The period-picker has a more specific `.day:hover` selector that excludes `selected-start`/`selected-end`. This overrides the generic `.day:hover` from the mixin which only excludes `disabled`.

- [ ] **Step 2: Create period-picker/index.tsx**

Updated imports. The `Dropdown` now receives `isOpen`/`onClose` props, and the `useKeyboardNavigation` receives deps. The keyboard navigation bridge (`onInputKeyDown`/`setOnInputKeyDown`) is preserved because the PeriodPicker needs it to pass the `field` parameter to `handleInputKeyDown` at the `DateInput` level, and then the bridge calls into `useKeyboardNavigation.handleInputKeyDown` from the shell.

```typescript
// src/components/date/period-picker/index.tsx
import { useRef, useCallback, useEffect } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from '../shared/dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from '../shared/use-keyboard-navigation';
import type { DateTimePeriodPickerProps } from './types';
import './styles.scss';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

type PickerShellProps = {
  variant: 'date' | 'datetime';
  label?: string;
  labelUppercase?: boolean;
  initialRef?: React.RefObject<HTMLInputElement | null>;
  finalRef?: React.RefObject<HTMLInputElement | null>;
};

function PickerShell({ variant, label, labelUppercase, initialRef, finalRef }: PickerShellProps) {
  const picker = usePicker();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation({
    isOpen: picker.isOpen,
    focusedDate: picker.focusedDate,
    viewDate: picker.viewDate,
    min: picker.min,
    max: picker.max,
    setFocusedDate: picker.setFocusedDate,
    setViewDate: picker.setViewDate,
    navigateMonth: picker.navigateMonth,
    selectDate: picker.selectDate,
  });

  useEffect(() => {
    // Bridge: wrap the shared handleInputKeyDown (no field param) so the
    // period-picker's onInputKeyDown signature (with field param) is satisfied.
    picker.setOnInputKeyDown((_e, _field) => {
      handleInputKeyDown(_e);
    });
  }, [handleInputKeyDown, picker.setOnInputKeyDown]);

  // Close dropdown when focus leaves the entire component
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) return;
      picker.close();
    },
    [picker],
  );

  // Handle Escape scoped to this component, then delegate to keyboard navigation hook
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && picker.isOpen) {
        e.stopPropagation();
        picker.close();
        return;
      }
      handleContainerKeyDown(e);
    },
    [picker, handleContainerKeyDown],
  );

  return (
    <div ref={wrapperRef} className="datetime-period-picker" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      {label && (
        <label
          className="label"
          data-state-label-uppercase={labelUppercase || undefined}
        >
          {label}
        </label>
      )}
      <div ref={anchorRef} className="input-group">
        <DateInput field="initial" externalRef={initialRef} />
        <span className="separator">—</span>
        <DateInput field="final" externalRef={finalRef} />
      </div>

      <Dropdown anchorRef={anchorRef} isOpen={picker.isOpen} onClose={picker.close} ariaLabel="Selecionar período">
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export function DateTimePeriodPicker<
  I extends string = 'initial',
  F extends string = 'final'
>(props: DateTimePeriodPickerProps<I, F>) {
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...(props as unknown as DateTimePeriodPickerProps)}>
      <PickerShell
        variant={variant}
        label={props.label}
        labelUppercase={props.labelUppercase}
        initialRef={props.initialRef}
        finalRef={props.finalRef}
      />
    </PickerProvider>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 12: Move test files and update app.tsx

**Files:**
- Create: `src/components/date/period-picker/__tests__/datetime-period-picker.test.tsx`
- Create: `src/components/date/period-picker/__tests__/constants.test.ts`
- Create: `src/components/date/period-picker/__tests__/time-selector.test.tsx`
- Create: `src/components/date/period-picker/__tests__/use-keyboard-navigation.test.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Copy test files with updated imports**

For each test file, copy from `datetime-period-picker/__tests__/` to `date/period-picker/__tests__/` and update all imports from `'../index'`, `'../types'`, `'../constants'`, `'../context'`, `'../time-selector'` to the new paths.

**datetime-period-picker.test.tsx** — Change these import lines:
```typescript
// OLD:
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';

// NEW:
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';
```
These happen to be identical because the test uses relative `../` which already points to the parent. Copy the file as-is — the imports are already relative to the test directory.

**constants.test.ts** — Change imports:
```typescript
// OLD:
import { ... } from '../constants';

// NEW:
import { ... } from '../../shared/constants';
```

**time-selector.test.tsx** — Change imports:
```typescript
// OLD:
import { TimeSelector } from '../time-selector';
import { usePicker } from '../context';
import type { PickerContextValue } from '../types';

// NEW:
import { TimeSelector } from '../time-selector';
import { usePicker } from '../context';
import type { PickerContextValue } from '../types';
```
Again relative `../` — copy as-is.

**use-keyboard-navigation.test.tsx** — Change imports:
```typescript
// OLD:
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';

// NEW:
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';
```
Again relative `../` — copy as-is.

Summary: Copy all 4 test files. Only `constants.test.ts` needs an import path change (`'../constants'` → `'../../shared/constants'`).

- [ ] **Step 2: Update app.tsx**

Change import path:

```typescript
// src/app.tsx
import { useState } from 'react';
import moment from 'moment';
import { DateTimePeriodPicker } from './components/date/period-picker';
import type { DatePeriod } from './components/date/period-picker';

export function App() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [dateTimePeriod, setDateTimePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  moment.locale('pt-BR');

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

- [ ] **Step 3: Delete the old datetime-period-picker directory**

Run: `rm -rf src/components/datetime-period-picker`

- [ ] **Step 4: Run all 96 tests**

Run: `npx vitest run`
Expected: All 96 tests pass. This is the Phase 1 safety guarantee.

- [ ] **Step 5: Commit Phase 1**

```bash
git add src/components/date/ src/app.tsx
git add -u  # stages deletions of old datetime-period-picker/
git commit -m "refactor: extract shared modules and move period-picker to date/ directory"
```

---

## Phase 2: DateTimePicker Component

### Task 13: Create picker/types.ts

**Files:**
- Create: `src/components/date/picker/types.ts`

- [ ] **Step 1: Create picker/types.ts**

```typescript
// src/components/date/picker/types.ts
import type { Variant } from '../shared/types';

export type { Variant };

export type DateChangeEvent = {
  target: {
    name: string;
    value: string;
  };
};

export type DateTimePickerProps = {
  variant?: Variant;
  value: string;
  onChange: (event: DateChangeEvent) => void;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  label?: string;
  labelUppercase?: boolean;
  min?: string;
  max?: string;
};

export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  readOnly: boolean;
  undigitable: boolean;
  componentName: string;
  date: Date | null;
  viewDate: Date;
  isOpen: boolean;
  focusedDate: Date | null;
  setFocusedDate: (date: Date | null) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (hours: number, minutes: number) => void;
  updateFromInput: (raw: string) => void;
  clearField: () => void;
  open: () => void;
  close: () => void;
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 14: Create picker/context.tsx

**Files:**
- Create: `src/components/date/picker/context.tsx`

- [ ] **Step 1: Create picker/context.tsx**

Simplified single-date context. Key differences from PeriodPicker:
- `date` instead of `initial`/`final`
- No `activeField`, `hoveredDate`, `initialName`, `finalName`
- `selectDate` closes calendar when variant is `date`
- `setTime`, `updateFromInput`, `clearField` have no field parameter

```typescript
// src/components/date/picker/context.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import moment from "moment";
import { formatToIso, parseDatePtBr } from "../shared/constants";
import type { DateTimePickerProps, PickerContextValue, Variant, DateChangeEvent } from "./types";

const PickerContext = createContext<PickerContextValue | null>(null);

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx;
}

type PickerProviderProps = DateTimePickerProps & { children: ReactNode };

export function PickerProvider({ children, ...props }: PickerProviderProps) {
  const variant: Variant = props.variant ?? "date";
  const disabled = props.disabled ?? false;
  const readOnly = props.readOnly ?? false;
  const undigitable = props.undigitable ?? false;
  const componentName = props.name ?? '';

  // Parse props.value ISO string to Date | null
  const date = useMemo(
    () => (props.value ? moment(props.value).toDate() : null),
    [props.value],
  );
  const min = useMemo(() => (props.min ? moment(props.min).toDate() : null), [props.min]);
  const max = useMemo(() => (props.max ? moment(props.max).toDate() : null), [props.max]);

  // Internal ephemeral state
  const [viewDate, setViewDate] = useState<Date>(() => date ?? new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const fireChange = useCallback(
    (newDate: Date | null) => {
      props.onChange({
        target: {
          name: componentName,
          value: newDate ? formatToIso(newDate, variant) : '',
        },
      });
    },
    [props.onChange, componentName, variant],
  );

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'months').toDate());
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'years').toDate());
  }, []);

  const selectDate = useCallback(
    (selectedDate: Date) => {
      if (disabled) return;

      // Preserve existing time if datetime variant
      let newDate = selectedDate;
      if (variant === "datetime" && date) {
        newDate = moment(selectedDate)
          .hours(date.getHours())
          .minutes(date.getMinutes())
          .toDate();
      }
      fireChange(newDate);

      // date variant: close on select. datetime variant: stay open for time adjustment
      if (variant === 'date') {
        setIsOpen(false);
        setFocusedDate(null);
      }
    },
    [disabled, variant, date, fireChange],
  );

  const setTime = useCallback(
    (hours: number, minutes: number) => {
      if (disabled || !date) return;
      const updated = moment(date).hours(hours).minutes(minutes).toDate();
      fireChange(updated);
    },
    [disabled, date, fireChange],
  );

  const updateFromInput = useCallback(
    (raw: string) => {
      const parsed = parseDatePtBr(raw, variant);
      if (!parsed) return;

      if (min && parsed < min) return;
      if (max && parsed > max) return;

      fireChange(parsed);
    },
    [variant, min, max, fireChange],
  );

  const clearField = useCallback(() => {
    fireChange(null);
    setViewDate(new Date());
    setFocusedDate(new Date());
  }, [fireChange]);

  const open = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen(true);
      if (date) setViewDate(date);
      setFocusedDate(date ?? new Date());
    }
  }, [disabled, readOnly, date]);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedDate(null);
  }, []);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      date,
      viewDate,
      isOpen,
      focusedDate,
      setFocusedDate,
      setViewDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime,
      updateFromInput,
      clearField,
      open,
      close,
    }),
    [
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      date,
      viewDate,
      isOpen,
      focusedDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime,
      updateFromInput,
      clearField,
      open,
      close,
    ],
  );

  return (
    <PickerContext.Provider value={value}>{children}</PickerContext.Provider>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 15: Create picker/date-input.tsx

**Files:**
- Create: `src/components/date/picker/date-input.tsx`

- [ ] **Step 1: Create picker/date-input.tsx**

Simplified: no `field` prop, reads `picker.date` directly, uses `forwardRef`:

```typescript
// src/components/date/picker/date-input.tsx
import { useEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import { useIMask } from 'react-imask';
import { usePicker } from './context';
import { formatDatePtBr } from '../shared/constants';
import { buildMaskOptions, mergeRefs } from '../shared/date-input-utils';

export const DateInput = forwardRef<HTMLInputElement>(function DateInput(_props, externalRef) {
  const picker = usePicker();
  const dateValue = picker.date;

  const isExternalUpdate = useRef(false);
  const unmaskedRef = useRef('');
  const dateOnFocusRef = useRef<Date | null>(null);
  const dateValueRef = useRef(dateValue);
  dateValueRef.current = dateValue;

  const inputName = picker.componentName || undefined;

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string, mask) => {
      if (isExternalUpdate.current) return;

      if (mask.unmaskedValue === '') {
        picker.clearField();
        return;
      }

      picker.updateFromInput(value);
    },
  });

  unmaskedRef.current = unmaskedValue;

  // Sync iMask value when the controlled date value changes externally
  useEffect(() => {
    isExternalUpdate.current = true;
    setValue(formatDatePtBr(dateValue, picker.variant));
    queueMicrotask(() => {
      isExternalUpdate.current = false;
    });
  }, [dateValue, picker.variant, setValue]);

  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handleFocus = useCallback(() => {
    dateOnFocusRef.current = dateValueRef.current;
    picker.open();
  }, [picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    const len = unmaskedRef.current.length;

    if (len > 0 && len < expectedDigits) {
      const savedDate = dateOnFocusRef.current;
      if (savedDate) {
        setValue(formatDatePtBr(savedDate, picker.variant));
      } else {
        isExternalUpdate.current = true;
        setValue('');
        queueMicrotask(() => {
          isExternalUpdate.current = false;
        });
      }
    }
  }, [picker.variant, setValue]);

  const focusedDateId =
    picker.isOpen && picker.focusedDate
      ? `dp-day-${picker.focusedDate.toISOString()}`
      : undefined;

  return (
    <input
      ref={mergeRefs(maskRef, externalRef)}
      type="text"
      className="input"
      name={inputName}
      data-state-read-only={picker.readOnly || undefined}
      data-state-undigitable={picker.undigitable || undefined}
      disabled={picker.disabled}
      readOnly={picker.readOnly || picker.undigitable}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={picker.isOpen}
      aria-activedescendant={focusedDateId}
      aria-label="Data"
    />
  );
});
```

Note: The `DateInput` does not have an `onKeyDown` handler — keyboard navigation is handled at the wrapper level in `index.tsx` (the `handleKeyDown` on the wrapper div catches Enter/Escape/Arrow keys before they reach the input). This is simpler than the PeriodPicker's bridge pattern because there's no `field` parameter.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 16: Create picker/calendar.tsx

**Files:**
- Create: `src/components/date/picker/calendar.tsx`

- [ ] **Step 1: Create picker/calendar.tsx**

Simplified: no range logic, no hover preview, uses `data-state-selected` (not start/end):

```typescript
// src/components/date/picker/calendar.tsx
import { useCallback } from 'react';
import moment from 'moment';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from '../shared/constants';

export function Calendar() {
  const picker = usePicker();
  const grid = buildCalendarGrid(picker.viewDate);
  const currentMonth = picker.viewDate.getMonth();
  const currentYear = picker.viewDate.getFullYear();
  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && moment(date).isBefore(picker.min)) return true;
      if (picker.max && moment(date).isAfter(picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      if (isDisabled(date)) return;
      picker.selectDate(date);
    },
    [picker, isDisabled],
  );

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(-1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Mês anterior"
        >
          &#8249;
        </button>
        <span className="calendar-title">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Próximo mês"
        >
          &#8250;
        </button>
      </div>

      <div className="weekdays">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="grid" role="grid">
        {grid.map((cell) => {
          const isSelected = picker.date && moment(cell.date).isSame(picker.date, 'day');

          return (
            <button
              key={cell.date.toISOString()}
              id={`dp-day-${cell.date.toISOString()}`}
              type="button"
              className="day"
              data-date={cell.date.toISOString()}
              data-state-outside={!cell.isCurrentMonth || undefined}
              data-state-disabled={isDisabled(cell.date) || undefined}
              data-state-today={moment(cell.date).isSame(moment(), 'day') || undefined}
              data-state-selected={isSelected || undefined}
              data-state-focused={(picker.focusedDate && moment(cell.date).isSame(picker.focusedDate, 'day')) || undefined}
              onClick={() => handleDayClick(cell.date)}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              disabled={isDisabled(cell.date)}
              aria-label={cell.date.toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              aria-selected={isSelected || false}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 17: Create picker/time-selector.tsx

**Files:**
- Create: `src/components/date/picker/time-selector.tsx`

- [ ] **Step 1: Create picker/time-selector.tsx**

Simplified: reads `picker.date` directly, no `activeField`:

```typescript
// src/components/date/picker/time-selector.tsx
import { useEffect, useRef, useCallback } from 'react';
import { usePicker } from './context';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeSelector() {
  const { date, setTime } = usePicker();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const currentHours = date ? date.getHours() : 0;
  const currentMinutes = date ? date.getMinutes() : 0;
  const isDisabled = !date;

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
      setTime(hour, currentMinutes);
    },
    [setTime, isDisabled, currentMinutes],
  );

  const handleSelectMinute = useCallback(
    (minute: number) => {
      if (isDisabled) return;
      setTime(currentHours, minute);
    },
    [setTime, isDisabled, currentHours],
  );

  const preventFocusSteal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const noopKeyDown = useCallback((_e: React.KeyboardEvent) => {
    // Intentionally empty — these items never receive keyboard focus.
  }, []);

  return (
    <div className="time-selector" data-state-disabled={isDisabled || undefined}>
      <div className="time-group">
        <span className="time-label">Hora</span>
        <div
          ref={hoursRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar hora"
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="time-item"
              data-state-active={h === currentHours || undefined}
              role="option"
              aria-selected={h === currentHours}
              tabIndex={-1}
              onClick={() => handleSelectHour(h)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="time-group">
        <span className="time-label">Minuto</span>
        <div
          ref={minutesRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar minuto"
        >
          {MINUTES.map((m) => (
            <div
              key={m}
              className="time-item"
              data-state-active={m === currentMinutes || undefined}
              role="option"
              aria-selected={m === currentMinutes}
              tabIndex={-1}
              onClick={() => handleSelectMinute(m)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
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

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 18: Create picker/styles.scss

**Files:**
- Create: `src/components/date/picker/styles.scss`

- [ ] **Step 1: Create picker/styles.scss**

```scss
// src/components/date/picker/styles.scss
@use '../shared/variables' as *;
@use '../shared/styles';

.datetime-picker {
  @include styles.date-component-base;

  // --- Picker-specific: single input wrapper ---
  .input-group {
    display: flex;
    align-items: center;
  }

  // --- Picker-specific: single selected day ---
  .day {
    &[data-state-selected='true'] {
      background: $accent;
      color: #fff;
      font-weight: 600;
    }

    &:hover:not([data-state-disabled='true']):not([data-state-selected='true']) {
      background: $accent-bg;
    }
  }
}
```

- [ ] **Step 2: Verify SCSS compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

---

### Task 19: Create picker/index.tsx

**Files:**
- Create: `src/components/date/picker/index.tsx`

- [ ] **Step 1: Create picker/index.tsx**

The forwardRef shell. Handles Escape, delegates to keyboard navigation, manages blur:

```typescript
// src/components/date/picker/index.tsx
import { useRef, useCallback, forwardRef } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from '../shared/dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from '../shared/use-keyboard-navigation';
import type { DateTimePickerProps } from './types';
import './styles.scss';

export type { DateChangeEvent, DateTimePickerProps } from './types';

type PickerShellProps = {
  variant: 'date' | 'datetime';
  label?: string;
  labelUppercase?: boolean;
  inputRef: React.Ref<HTMLInputElement>;
};

function PickerShell({ variant, label, labelUppercase, inputRef }: PickerShellProps) {
  const picker = usePicker();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation({
    isOpen: picker.isOpen,
    focusedDate: picker.focusedDate,
    viewDate: picker.viewDate,
    min: picker.min,
    max: picker.max,
    setFocusedDate: picker.setFocusedDate,
    setViewDate: picker.setViewDate,
    navigateMonth: picker.navigateMonth,
    selectDate: picker.selectDate,
  });

  // Close dropdown when focus leaves the entire component
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) return;
      picker.close();
    },
    [picker],
  );

  // Handle Escape, Enter (for selecting focused date), and arrow keys
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && picker.isOpen) {
        e.stopPropagation();
        picker.close();
        return;
      }
      // Enter on input selects the focused date
      if (e.key === 'Enter') {
        handleInputKeyDown(e);
        return;
      }
      handleContainerKeyDown(e);
    },
    [picker, handleContainerKeyDown, handleInputKeyDown],
  );

  return (
    <div ref={wrapperRef} className="datetime-picker" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      {label && (
        <label
          className="label"
          data-state-label-uppercase={labelUppercase || undefined}
        >
          {label}
        </label>
      )}
      <div ref={anchorRef} className="input-group">
        <DateInput ref={inputRef} />
      </div>

      <Dropdown anchorRef={anchorRef} isOpen={picker.isOpen} onClose={picker.close}>
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  function DateTimePicker(props, ref) {
    const variant = props.variant ?? 'date';

    return (
      <PickerProvider {...props}>
        <PickerShell
          variant={variant}
          label={props.label}
          labelUppercase={props.labelUppercase}
          inputRef={ref}
        />
      </PickerProvider>
    );
  },
);
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

- [ ] **Step 3: Run all existing tests to ensure no regressions**

Run: `npx vitest run`
Expected: All 96 tests pass.

- [ ] **Step 4: Commit Phase 2 structure**

```bash
git add src/components/date/picker/
git commit -m "feat: add DateTimePicker component structure (no tests yet)"
```

---

### Task 20: Create picker tests

**Files:**
- Create: `src/components/date/picker/__tests__/datetime-picker.test.tsx`

- [ ] **Step 1: Create the test file**

```typescript
// src/components/date/picker/__tests__/datetime-picker.test.tsx
import React, { useState, useRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from '../index';
import type { DateTimePickerProps, DateChangeEvent } from '../types';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPicker(overrides: Partial<DateTimePickerProps> = {}) {
  const onChange = vi.fn();
  const defaultProps: DateTimePickerProps = {
    value: '',
    onChange,
    name: 'date',
    ...overrides,
  };

  const result = render(<DateTimePicker {...defaultProps} />);
  return { ...result, onChange };
}

function ControlledPicker(props: Partial<DateTimePickerProps> & { spy: (e: DateChangeEvent) => void }) {
  const { spy, ...rest } = props;
  const [value, setValue] = useState(rest.value ?? '');

  const handleChange = (e: DateChangeEvent) => {
    setValue(e.target.value);
    spy(e);
  };

  return (
    <DateTimePicker
      name="date"
      {...rest}
      value={value}
      onChange={handleChange}
    />
  );
}

function renderControlled(overrides: Partial<DateTimePickerProps> = {}) {
  const spy = vi.fn();
  const result = render(<ControlledPicker spy={spy} {...overrides} />);
  return { ...result, onChange: spy };
}

async function clearInput(input: HTMLElement) {
  await userEvent.tripleClick(input);
  await userEvent.keyboard('{Backspace}');
}

describe('DateTimePicker', () => {
  // --- Basic rendering ---
  describe('rendering', () => {
    it('renders a single input', () => {
      renderPicker();
      expect(screen.getByLabelText('Data')).toBeInTheDocument();
    });

    it('renders with iMask placeholder pattern for date variant', () => {
      renderPicker({ variant: 'date' });
      expect(screen.getByLabelText('Data')).toHaveValue('__/__/____');
    });

    it('renders with iMask placeholder pattern for datetime variant', () => {
      renderPicker({ variant: 'datetime' });
      expect(screen.getByLabelText('Data')).toHaveValue('__/__/____ __:__');
    });

    it('disables input when disabled prop is true', () => {
      renderPicker({ disabled: true });
      expect(screen.getByLabelText('Data')).toBeDisabled();
    });
  });

  // --- Calendar selection ---
  describe('calendar selection', () => {
    it('calls onChange with ISO date on day click', async () => {
      const { onChange } = renderControlled();
      await userEvent.click(screen.getByLabelText('Data'));

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.name).toBe('date');
      expect(event.target.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('date variant closes calendar on select', async () => {
      renderControlled({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('datetime variant keeps calendar open on select', async () => {
      renderControlled({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // --- Typing with iMask ---
  describe('input typing', () => {
    it('applies mask while typing', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');
    });

    it('calls onChange when valid date is typed', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(onChange).toHaveBeenCalled();
    });

    it('does not call onChange for partial date', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '250');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --- Blur rollback ---
  describe('blur rollback', () => {
    it('restores previous date when blur with partial input', async () => {
      renderControlled({ value: '2026-03-25' });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      expect(input).toHaveValue('25/03/2026');

      await clearInput(input);
      await userEvent.type(input, '01');
      await userEvent.click(document.body);

      expect(input).toHaveValue('25/03/2026');
    });

    it('clears to placeholder when blur with partial input and no previous date', async () => {
      renderControlled();

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '15');
      await userEvent.click(document.body);

      expect(input).toHaveValue('__/__/____');
    });

    it('does nothing on blur when input has complete date', async () => {
      renderControlled();

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');

      await userEvent.click(document.body);
      expect(input).toHaveValue('25/03/2026');
    });
  });

  // --- Keyboard navigation ---
  describe('keyboard navigation', () => {
    it('ArrowRight moves focused day forward by 1', async () => {
      renderControlled({ value: '2026-03-15' });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);

      const findDay = (n: number) => {
        const buttons = screen.getAllByText(String(n));
        return buttons.find((btn) => btn.classList.contains('day') && !btn.hasAttribute('data-state-outside'));
      };

      expect(findDay(15)).toHaveAttribute('data-state-focused');

      fireEvent.keyDown(input, { key: 'ArrowRight' });
      expect(findDay(16)).toHaveAttribute('data-state-focused');
    });

    it('Enter selects the focused date', async () => {
      const { onChange } = renderControlled({ value: '2026-03-15' });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowRight' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.value).toBe('2026-03-16');
    });

    it('Escape closes the calendar', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Time selector (datetime) ---
  describe('time selector', () => {
    it('renders time columns for datetime variant', async () => {
      renderPicker({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.getByLabelText('Selecionar hora')).toBeInTheDocument();
      expect(screen.getByLabelText('Selecionar minuto')).toBeInTheDocument();
    });

    it('does not render time columns for date variant', async () => {
      renderPicker({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.queryByLabelText('Selecionar hora')).not.toBeInTheDocument();
    });
  });

  // --- Clear on empty ---
  describe('clear on empty', () => {
    it('emits onChange with empty string when input is fully cleared', async () => {
      const { onChange } = renderControlled({ value: '2026-03-25' });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await clearInput(input);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value).toBe('');
    });

    it('datetime variant: emits onChange with empty when input is fully cleared', async () => {
      const { onChange } = renderControlled({
        variant: 'datetime',
        value: '2026-03-25T14:30',
      });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await clearInput(input);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value).toBe('');
    });
  });

  // --- Props: label ---
  describe('label', () => {
    it('renders label when prop is provided', () => {
      renderPicker({ label: 'Data de nascimento' });
      const label = screen.getByText('Data de nascimento');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
    });

    it('applies uppercase data attribute when labelUppercase is true', () => {
      renderPicker({ label: 'Data', labelUppercase: true });
      const label = screen.getByText('Data');
      expect(label).toHaveAttribute('data-state-label-uppercase', 'true');
    });
  });

  // --- Props: readOnly ---
  describe('readOnly', () => {
    it('input has readOnly attribute', () => {
      renderPicker({ readOnly: true });
      expect(screen.getByLabelText('Data')).toHaveAttribute('readonly');
    });

    it('prevents dropdown from opening', async () => {
      renderPicker({ readOnly: true, value: '2026-03-25' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Props: undigitable ---
  describe('undigitable', () => {
    it('blocks typing in input', async () => {
      const { onChange } = renderPicker({ undigitable: true });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('__/__/____');
    });

    it('allows calendar selection', async () => {
      const { onChange } = renderControlled({ undigitable: true });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0].target.value).not.toBe('');
    });
  });

  // --- Props: disabled ---
  describe('disabled', () => {
    it('does not open dropdown when disabled', async () => {
      renderPicker({ disabled: true });
      fireEvent.focus(screen.getByLabelText('Data'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Props: min/max ---
  describe('min/max', () => {
    it('disables days before min date', async () => {
      renderPicker({ min: '2026-03-15', value: '2026-03-20' });
      await userEvent.click(screen.getByLabelText('Data'));

      const day10Buttons = screen.getAllByText('10');
      const day10 = day10Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day10Buttons[0];
      expect(day10).toBeDisabled();
    });

    it('disables days after max date', async () => {
      renderPicker({ max: '2026-03-20', value: '2026-03-15' });
      await userEvent.click(screen.getByLabelText('Data'));

      const day25Buttons = screen.getAllByText('25');
      const day25 = day25Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day25Buttons[0];
      expect(day25).toBeDisabled();
    });
  });

  // --- forwardRef ---
  describe('forwardRef', () => {
    it('ref receives the input element', () => {
      const ref = React.createRef<HTMLInputElement>();

      render(
        <DateTimePicker
          value=""
          onChange={() => {}}
          ref={ref}
        />,
      );

      const input = screen.getByLabelText('Data');
      expect(ref.current).toBe(input);
    });
  });

  // --- Dropdown ---
  describe('dropdown', () => {
    it('opens dropdown on input focus', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Async value ---
  describe('async value', () => {
    it('updates input when value changes externally', () => {
      const { rerender, onChange } = renderPicker();

      rerender(
        <DateTimePicker
          name="date"
          value="2026-03-25"
          onChange={onChange}
        />,
      );

      expect(screen.getByLabelText('Data')).toHaveValue('25/03/2026');
    });
  });
});
```

- [ ] **Step 2: Run the new tests**

Run: `npx vitest run src/components/date/picker/__tests__/datetime-picker.test.tsx`
Expected: All ~30 tests pass.

- [ ] **Step 3: Run ALL tests to ensure no regressions**

Run: `npx vitest run`
Expected: All 96 + ~30 = ~126 tests pass.

- [ ] **Step 4: Commit tests**

```bash
git add src/components/date/picker/__tests__/
git commit -m "test: add DateTimePicker test suite (~30 tests)"
```

---

### Task 21: Update app.tsx with DateTimePicker demos

**Files:**
- Modify: `src/app.tsx`

- [ ] **Step 1: Add DateTimePicker demos to app.tsx**

```typescript
// src/app.tsx
import { useState } from 'react';
import moment from 'moment';
import { DateTimePeriodPicker } from './components/date/period-picker';
import type { DatePeriod } from './components/date/period-picker';
import { DateTimePicker } from './components/date/picker';

export function App() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [dateTimePeriod, setDateTimePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [singleDate, setSingleDate] = useState('');
  const [singleDateTime, setSingleDateTime] = useState('');

  moment.locale('pt-BR');

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

      <h2>DateTime Picker</h2>

      <div className="components">
        <section>
          <h3>Variante: date</h3>
          <DateTimePicker
            name="singleDate"
            variant="date"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            label="Data"
          />
          <pre>{JSON.stringify(singleDate)}</pre>
        </section>

        <section>
          <h3>Variante: datetime</h3>
          <DateTimePicker
            name="singleDateTime"
            variant="datetime"
            value={singleDateTime}
            onChange={(e) => setSingleDateTime(e.target.value)}
            label="Data e hora"
          />
          <pre>{JSON.stringify(singleDateTime)}</pre>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | head -20`

- [ ] **Step 3: Run all tests one final time**

Run: `npx vitest run`
Expected: All ~126 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app.tsx
git commit -m "feat: add DateTimePicker demos to app.tsx"
```

---

## Summary

| Phase | Tasks | Commits |
|-------|-------|---------|
| Phase 1: Extract + Move | Tasks 1-12 | 1 commit |
| Phase 2: Build DateTimePicker | Tasks 13-21 | 3 commits |
| **Total** | **21 tasks** | **4 commits** |
