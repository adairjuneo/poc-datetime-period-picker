# DateTimePicker Component + Shared Extraction — Design Spec

**Status:** Self-Reviewed
**Date:** 2026-04-08
**Branch:** `release/with_imask`

---

## Overview

Create a single-date `DateTimePicker` component and extract shared infrastructure from the existing `DateTimePeriodPicker` into a reusable `shared/` module. Both components will live under `src/components/date/` and share ~85% of their code.

The work is split into two sequential phases:
- **Phase 1:** Refactor — extract shared modules, move `DateTimePeriodPicker` to new location
- **Phase 2:** Build — create `DateTimePicker` using shared modules

---

## Decisions

| Decision | Result |
|---|---|
| Prop scope | Lean: variant, value, onChange, name, disabled, readOnly, undigitable, label, labelUppercase, min, max, ref |
| Folder structure | `src/components/date/{shared, period-picker, picker}` |
| Move DateTimePeriodPicker | Yes, from `datetime-period-picker/` to `date/period-picker/` |
| onChange (Picker) | Simple string value, native event-like `{ target: { name, value } }` |
| onChange (PeriodPicker) | Unchanged — value is an object |
| Export names | `DateTimePicker`, `DateTimePickerProps`, `DateChangeEvent` |
| Ref strategy (Picker) | `forwardRef` (idiomatic React for single-input component) |
| Calendar close behavior | `date` variant: close on select. `datetime` variant: stay open for time adjustment |
| Shared modules decouple from context | Dropdown and useKeyboardNavigation receive deps via props/params, not context |
| Advanced UI props | Not included (hints, tooltips, skeletonize, customClasses, triggers) — deferred to package migration |

---

## Folder Structure

```
src/components/
├── date/
│   ├── shared/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── dropdown.tsx
│   │   ├── date-input-utils.ts
│   │   ├── use-keyboard-navigation.ts
│   │   ├── _variables.scss
│   │   └── styles.scss
│   │
│   ├── period-picker/
│   │   ├── types.ts
│   │   ├── context.tsx
│   │   ├── index.tsx
│   │   ├── date-input.tsx
│   │   ├── calendar.tsx
│   │   ├── time-selector.tsx
│   │   ├── styles.scss
│   │   └── __tests__/
│   │       ├── constants.test.ts
│   │       ├── datetime-period-picker.test.tsx
│   │       ├── time-selector.test.tsx
│   │       └── use-keyboard-navigation.test.tsx
│   │
│   └── picker/
│       ├── types.ts
│       ├── context.tsx
│       ├── index.tsx
│       ├── date-input.tsx
│       ├── calendar.tsx
│       ├── time-selector.tsx
│       ├── styles.scss
│       └── __tests__/
│           └── datetime-picker.test.tsx
│
├── __legacy/           (read-only reference, not committed)
```

---

## Phase 1: Shared Extraction + Move

### Goal

Extract generic modules into `shared/`, move `DateTimePeriodPicker` to `date/period-picker/`, update all imports. Zero logic changes — 96 existing tests are the safety net.

### What goes into shared/

#### `shared/types.ts`

Generic types used by both components:

```typescript
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

#### `shared/constants.ts`

Entire content of current `datetime-period-picker/constants.ts`: `DAYS_OF_WEEK`, `MONTHS`, `formatDatePtBr`, `parseDatePtBr`, `formatToIso`, `isValidDate`, `buildCalendarGrid`, `sortPeriod`. All functions are pure utilities with no context dependency.

#### `shared/dropdown.tsx`

Refactored from `datetime-period-picker/dropdown.tsx`. Instead of consuming `usePicker()` directly, receives props:

```typescript
type DropdownProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;   // default: 'Selecionar data'
  children: React.ReactNode;
};
```

All positioning logic (viewport boundary detection, above/below, resize/scroll listeners) remains unchanged.

#### `shared/date-input-utils.ts`

Utility functions extracted from `datetime-period-picker/date-input.tsx`:

```typescript
export function buildMaskOptions(variant: 'date' | 'datetime'): FactoryOpts;
export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]): (instance: T | null) => void;
```

No context dependency — pure functions.

#### `shared/use-keyboard-navigation.ts`

Refactored from `datetime-period-picker/use-keyboard-navigation.ts`. Instead of consuming `usePicker()`, receives dependencies via parameter:

```typescript
type KeyboardNavDeps = {
  isOpen: boolean;
  focusedDate: Date | null;
  min: Date | null;
  max: Date | null;
  setFocusedDate: (date: Date | null) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (dir: 1 | -1) => void;
  selectDate: (date: Date) => void;
};

export function useKeyboardNavigation(deps: KeyboardNavDeps): {
  handleContainerKeyDown: (e: React.KeyboardEvent) => void;
  handleInputKeyDown: (e: KeyboardEventLike) => void;
};
```

The `_field` parameter from `handleInputKeyDown` is removed (it was unused in the body).

#### `shared/_variables.scss`

Entire content of current `datetime-period-picker/_variables.scss`. No changes.

#### `shared/styles.scss`

Base styles extracted from `datetime-period-picker/styles.scss`. Contains everything EXCEPT period-specific styles:

**Included (generic):**
- `.input` (all states: focus, disabled, read-only, undigitable)
- `.dropdown` (positioning, above/below, align-right)
- `.calendar-header`, `.calendar-nav`, `.calendar-title`
- `.weekdays`, `.weekday`
- `.grid`
- `.day` (base + today, outside, disabled, focused)
- `.time-selector`, `.time-group`, `.time-label`, `.time-column`, `.time-item`

**NOT included (period-specific, stays in period-picker/styles.scss):**
- `.input-group` (two inputs side by side)
- `.separator` (dash between inputs)
- `.day[data-state-selected-start]`, `.day[data-state-selected-end]`
- `.day[data-state-in-range]` with directional border-radius
- `.day[data-state-hover-preview]`

**NOT included (picker-specific, goes in picker/styles.scss):**
- `.day[data-state-selected]` (single selection highlight)

The shared styles use a SCSS mixin (`@mixin date-component-base`) that each component includes inside its own wrapper class. This keeps class names scoped per-component while sharing the actual CSS rules:

```scss
// shared/styles.scss
@mixin date-component-base { ... all generic styles ... }

// period-picker/styles.scss
.datetime-period-picker { @include date-component-base; ... period extras ... }

// picker/styles.scss
.datetime-picker { @include date-component-base; ... picker extras ... }
```

### What stays in period-picker/

| File | Content |
|---|---|
| `types.ts` | `DatePeriod<I,F>`, `DatePeriodChangeEvent<I,F>`, `ActiveField`, `DateTimePeriodPickerProps<I,F>`, `PickerContextValue`, `InputKeyDownHandler` — imports `Variant`, `CalendarCell`, `KeyboardEventLike` from shared |
| `context.tsx` | `PickerProvider` with two-date logic, `sortPeriod`, auto-advance initial→final — unchanged logic, updated imports |
| `index.tsx` | Shell with 2 `DateInput` + separator + Dropdown — passes `isOpen`/`onClose` to Dropdown |
| `date-input.tsx` | `DateInput` with `field: 'initial' \| 'final'` — imports `buildMaskOptions`/`mergeRefs` from shared |
| `calendar.tsx` | Calendar with `isInRange`, `isHoverPreview`, `selected-start`/`selected-end` — unchanged logic |
| `time-selector.tsx` | TimeSelector with `activeField` branching — unchanged logic |
| `styles.scss` | `@use '../shared/styles'` + period-specific styles (separator, input-group, range, hover-preview) |
| `__tests__/` | All 4 test files moved, imports updated |

### Phase 1 safety guarantee

After every step, run `npx vitest run`. All 96 tests must pass. If any test fails, the step is rolled back and fixed before proceeding.

---

## Phase 2: DateTimePicker Component

### Props

```typescript
export type DateTimePickerProps = {
  variant?: Variant;           // default: 'date'
  value: string;               // ISO string: '2026-04-08' or '2026-04-08T14:30'
  onChange: (event: DateChangeEvent) => void;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  label?: string;
  labelUppercase?: boolean;
  min?: string;                // ISO string
  max?: string;                // ISO string
};

export type DateChangeEvent = {
  target: {
    name: string;
    value: string;             // simple string, not object
  };
};
```

### Component signature

```typescript
export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  (props, ref) => { ... }
);
```

### Context (PickerContextValue — single date)

```typescript
export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  readOnly: boolean;
  undigitable: boolean;
  componentName: string;
  date: Date | null;               // single date (replaces initial/final)
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

Key differences from PeriodPicker context:
- `date` instead of `initial`/`final`
- No `activeField`, `hoveredDate`, `initialName`, `finalName`
- `setTime`, `updateFromInput`, `clearField` have no `field` parameter
- `selectDate` closes the calendar when variant is `date`

### Selection behavior

- **Variant `date`:** `selectDate(date)` → `fireChange(date)` → `close()`
- **Variant `datetime`:** `selectDate(date)` → `fireChange(date)` → calendar stays open for time adjustment. Each `setTime` call also fires `fireChange`. Close on click-outside or Escape.

### fireChange

```typescript
const fireChange = useCallback((newDate: Date | null) => {
  props.onChange({
    target: {
      name: componentName,
      value: newDate ? formatToIso(newDate, variant) : '',
    },
  });
}, [props.onChange, componentName, variant]);
```

### Calendar (simplified)

No range logic. Day cells have:
- `data-state-selected='true'` — when date matches `picker.date` (same day)
- `data-state-today`, `data-state-outside`, `data-state-disabled`, `data-state-focused` — same as PeriodPicker

No `isInRange`, no `isHoverPreview`, no `handleDayHover`.

### DateInput (simplified)

No `field` prop. Reads `picker.date` directly instead of branching on `picker.initial`/`picker.final`. Uses `forwardRef` ref merged with iMask ref via `mergeRefs`. Same mask options, same blur rollback logic.

### TimeSelector (simplified)

Reads `picker.date` directly instead of branching on `activeField`. Calls `picker.setTime(hours, minutes)` without field parameter.

### Blur rollback

Same behavior as PeriodPicker: `dateOnFocusRef` snapshots the date at focus time. On blur with partial input, restores the snapshot or clears to placeholder.

### Keyboard navigation

Uses `useKeyboardNavigation` from shared, passing deps from the Picker's own context.

### Styles

```scss
// picker/styles.scss
@use '../shared/variables' as *;
@use '../shared/styles';

.datetime-picker {
  // Inherits/includes base styles from shared
  // ...

  .day {
    &[data-state-selected='true'] {
      background: $accent;
      color: #fff;
      font-weight: 600;
    }
  }
}
```

### JSX structure

```
<PickerProvider {...props}>
  <div class="datetime-picker" onBlur={handleBlur} onKeyDown={handleKeyDown}>
    {label && <label class="label" data-state-label-uppercase>...</label>}
    <div ref={anchorRef} class="input-group">
      <DateInput ref={mergedRef} />
    </div>
    <Dropdown anchorRef={anchorRef} isOpen={isOpen} onClose={close}>
      <Calendar />
      {variant === 'datetime' && <TimeSelector />}
    </Dropdown>
  </div>
</PickerProvider>
```

---

## Testing Strategy

### Phase 1

No new tests. The 96 existing tests validate that the refactoring preserves all behavior. Run after every step.

### Phase 2

| Group | Tests | Description |
|---|---|---|
| Basic rendering | ~4 | Renders input, placeholder mask, aria attributes, date vs datetime variant |
| Calendar selection | ~3 | Click day → onChange with ISO, date variant closes, datetime variant stays open |
| Typing with iMask | ~3 | Complete date → onChange, partial does not emit, placeholder `__/__/____` |
| Blur rollback | ~3 | Restores previous date on partial, clears if no previous, no-op if complete |
| Keyboard navigation | ~3 | Arrows move focus, Enter selects, Escape closes |
| Time selector (datetime) | ~2 | Select hour/minute, onChange emits with time |
| Clear on empty | ~2 | Clear all → onChange with empty string |
| Props: label | ~2 | Renders label, labelUppercase |
| Props: readOnly | ~2 | Input readonly, calendar won't open |
| Props: undigitable | ~2 | Blocks typing, allows calendar selection |
| Props: disabled | ~1 | Input disabled |
| Props: min/max | ~2 | Days outside range are disabled |
| forwardRef | ~1 | Ref receives the input element |
| **Total estimated** | **~30** | |

---

## Out of Scope

- Advanced UI props (hints, tooltips, skeletonize, customClasses, trigger buttons) — deferred to package migration
- `shouldCloseOnSelect` prop — using fixed behavior for now (date closes, datetime stays open)
- `returnValueType` prop — always ISO format
- `openCalendarOnFocus` prop — always opens on focus (unless readOnly)
- Predefined periods — not applicable to single-date
- Permission system integration — deferred to package migration
