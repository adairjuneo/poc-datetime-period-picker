# Dual-Focus Keyboard Navigation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace real DOM focus on calendar buttons with a "dual focus" pattern where focus stays on the input and calendar navigation is simulated via state + CSS.

**Architecture:** A new `useKeyboardNavigation` hook encapsulates all keyboard navigation logic. The `PickerContext` gains `focusedDate` state and an `onInputKeyDown` callback. Calendar buttons become non-focusable (`tabIndex={-1}`) and show simulated focus via a `data-focused` attribute and CSS class. ARIA attributes (`role="combobox"`, `aria-activedescendant`, `aria-expanded`, `aria-haspopup`) are added to inputs.

**Tech Stack:** React 19, TypeScript 5.9, date-fns v4, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-26-dual-focus-keyboard-navigation-design.md`

---

### Task 1: Add `focusedDate` state and `onInputKeyDown` to context

**Files:**
- Modify: `src/components/datetime-period-picker/types.ts`
- Modify: `src/components/datetime-period-picker/context.tsx`

- [ ] **Step 1: Update types**

In `types.ts`, add to `PickerContextValue`:

```ts
focusedDate: Date | null;
setFocusedDate: (date: Date | null) => void;
onInputKeyDown: (e: React.KeyboardEvent, field: 'initial' | 'final') => void;
```

The `onInputKeyDown` field needs `React.KeyboardEvent`, so add the import:

```ts
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
```

And use `ReactKeyboardEvent` in the type definition. Alternatively, keep it inline since types.ts currently has no React import — use a generic approach:

```ts
onInputKeyDown: (e: { preventDefault: () => void; key: string; stopPropagation: () => void }, field: 'initial' | 'final') => void;
```

Actually, the simplest approach: use `React.KeyboardEvent` directly since the consumer (date-input.tsx) already imports React. But types.ts doesn't import React. So define a minimal type:

```ts
type KeyboardEventLike = {
  key: string;
  preventDefault: () => void;
  stopPropagation: () => void;
};
```

Add it above `PickerContextValue` and use it:

```ts
onInputKeyDown: (e: KeyboardEventLike, field: 'initial' | 'final') => void;
```

- [ ] **Step 2: Add state and no-op to context.tsx**

In `context.tsx`, add:

```ts
const [focusedDate, setFocusedDate] = useState<Date | null>(null);
```

After the existing `hoveredDate` state (line 48).

Add a no-op for `onInputKeyDown` that will be overridden by PickerShell:

```ts
const onInputKeyDownRef = useRef<(e: KeyboardEventLike, field: 'initial' | 'final') => void>(() => {});
```

Import `useRef` (already imported? No — current imports: `createContext, useContext, useState, useCallback, useMemo, type ReactNode`). Add `useRef`.

Update the `open` callback to initialize `focusedDate`:

```ts
const open = useCallback(() => {
  if (!disabled) {
    setIsOpen(true);
    if (initial) setViewDate(initial);
    // Initialize focusedDate based on active field value or today
    const fieldDate = initial ?? new Date();
    setFocusedDate(fieldDate);
  }
}, [disabled, initial]);
```

Note: `open()` is called from `handleFocus` in DateInput which also sets `activeField`. Since `activeField` may not yet be updated when `open` runs, we use `initial` (the field that triggers open is always the one being focused — and for the first interaction it's always `initial`). The `focusedDate` sync when `activeField` changes will handle subsequent transitions.

Update the `close` callback:

```ts
const close = useCallback(() => {
  setIsOpen(false);
  setActiveField(null);
  setHoveredDate(null);
  setFocusedDate(null);
}, []);
```

Add `focusedDate`, `setFocusedDate`, and `onInputKeyDown` to the value useMemo:

```ts
const value = useMemo<PickerContextValue>(
  () => ({
    // ... existing fields ...
    focusedDate,
    setFocusedDate,
    onInputKeyDown: onInputKeyDownRef.current,
    // ... rest ...
  }),
  [/* ... existing deps ..., focusedDate */],
);
```

Expose `onInputKeyDownRef` via context so PickerShell can override it. Actually, a simpler pattern: add a `setOnInputKeyDown` to context that updates the ref. But this gets complex. 

**Better approach:** Don't use a ref. Just add `onInputKeyDown` as a regular field in the context value. It starts as a no-op in `PickerProvider` and gets overridden to the hook's handler in `PickerShell` by passing it as a prop to `PickerProvider`.

Wait — `PickerProvider` wraps `PickerShell`, so `PickerShell` can't pass props up. Instead:

**Simplest approach:** The `onInputKeyDown` no-op lives in context. `PickerShell` calls the hook and the hook calls `usePicker()` internally. The hook's `handleInputKeyDown` calls `picker.selectDate(picker.focusedDate)` directly. `PickerShell` wires `handleInputKeyDown` into the wrapper's `onKeyDown` for container-level keys. For input-level keys (Enter), `DateInput` needs access to `handleInputKeyDown`. 

**Final decision:** Add `onInputKeyDown` as a stable ref-based callback in context. `PickerShell` sets it via a `useEffect`:

In `context.tsx`:

```ts
const onInputKeyDownRef = useRef<PickerContextValue['onInputKeyDown']>(() => {});
const setOnInputKeyDown = useCallback((fn: PickerContextValue['onInputKeyDown']) => {
  onInputKeyDownRef.current = fn;
}, []);
```

And expose a getter in the context value:

```ts
onInputKeyDown: (...args) => onInputKeyDownRef.current(...args),
setOnInputKeyDown,
```

Actually this is overcomplicating it. Let's keep it simple:

**Final final approach:** Add `onInputKeyDown` to `PickerContextValue` as is. In `PickerProvider`, use a state for it:

```ts
const [onInputKeyDown, setOnInputKeyDownState] = useState<PickerContextValue['onInputKeyDown']>(() => () => {});
const setOnInputKeyDown = useCallback((fn: PickerContextValue['onInputKeyDown']) => {
  setOnInputKeyDownState(() => fn);
}, []);
```

Expose both in context. `PickerShell` calls `picker.setOnInputKeyDown(handleInputKeyDown)` in a `useEffect`. `DateInput` calls `picker.onInputKeyDown(e, field)`.

But setState with a function has the `(prev) => next` pitfall. Using `() => fn` wrapping handles it.

This adds `setOnInputKeyDown` to the type too. Let's just do it. Update `PickerContextValue`:

```ts
setOnInputKeyDown: (fn: PickerContextValue['onInputKeyDown']) => void;
```

Wait, this is circular. Define the callback type separately:

```ts
type InputKeyDownHandler = (e: KeyboardEventLike, field: 'initial' | 'final') => void;
```

Then in `PickerContextValue`:

```ts
onInputKeyDown: InputKeyDownHandler;
setOnInputKeyDown: (fn: InputKeyDownHandler) => void;
```

- [ ] **Step 3: Add `focusedDate` sync on `activeField` change**

When `activeField` changes while `isOpen`, update `focusedDate` to the new field's date. Add a `useEffect`:

```ts
useEffect(() => {
  if (!isOpen || !activeField) return;
  const date = activeField === 'initial' ? initial : final;
  setFocusedDate(date ?? new Date());
}, [isOpen, activeField]); // intentionally excluding initial/final to avoid re-syncing when values change
```

Note: we exclude `initial` and `final` from deps intentionally — we only want to sync when `activeField` changes (i.e., user tabs between inputs), not when the date values themselves change (which happens on selection).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: Clean (no errors related to our changes). Pre-existing JSONC errors are ok.

- [ ] **Step 5: Run existing tests (they should still pass)**

Run: `npx vitest run`
Expected: All 61 tests pass. The `time-selector.test.tsx` mock may need `focusedDate`, `setFocusedDate`, `onInputKeyDown`, `setOnInputKeyDown` added to `createMockPicker` to avoid missing property errors.

If the time-selector mock fails, update `createMockPicker` in `__tests__/time-selector.test.tsx` to include:

```ts
focusedDate: null,
setFocusedDate: vi.fn(),
onInputKeyDown: vi.fn(),
setOnInputKeyDown: vi.fn(),
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add focusedDate state and onInputKeyDown to picker context"
```

---

### Task 2: Create `useKeyboardNavigation` hook

**Files:**
- Create: `src/components/datetime-period-picker/use-keyboard-navigation.ts`

- [ ] **Step 1: Create the hook file**

```ts
import { useCallback } from 'react';
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
import { usePicker } from './context';

export function useKeyboardNavigation() {
  const picker = usePicker();

  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (picker.min && isBefore(date, picker.min)) return false;
      if (picker.max && isAfter(date, picker.max)) return false;
      return true;
    },
    [picker.min, picker.max],
  );

  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      picker.setFocusedDate(newDate);
      if (!isSameMonth(newDate, picker.viewDate)) {
        picker.setViewDate(startOfMonth(newDate));
      }
    },
    [isWithinBounds, picker],
  );

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!picker.isOpen || !picker.focusedDate) return;

      const date = picker.focusedDate;
      let newDate: Date | null = null;

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
          return; // Don't preventDefault for unhandled keys
      }

      e.preventDefault();
      if (newDate) {
        moveFocus(newDate);
      }
    },
    [picker.isOpen, picker.focusedDate, picker.viewDate, moveFocus],
  );

  const handleInputKeyDown = useCallback(
    (e: { key: string; preventDefault: () => void; stopPropagation: () => void }, field: 'initial' | 'final') => {
      if (!picker.isOpen || !picker.focusedDate) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        picker.selectDate(picker.focusedDate);
        // Auto-advance is handled by selectDate → setActiveField('final') → DateInput useEffect
      }
    },
    [picker.isOpen, picker.focusedDate, picker.selectDate],
  );

  return { handleContainerKeyDown, handleInputKeyDown };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: Clean.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: create useKeyboardNavigation hook for dual-focus navigation"
```

---

### Task 3: Wire hook into PickerShell and update Calendar

**Files:**
- Modify: `src/components/datetime-period-picker/index.tsx`
- Modify: `src/components/datetime-period-picker/calendar.tsx`
- Modify: `src/components/datetime-period-picker/date-input.tsx`

- [ ] **Step 1: Update PickerShell to use the hook**

In `index.tsx`, import and wire the hook:

```ts
import { useRef, useCallback, useEffect } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from './dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from './use-keyboard-navigation';
import type { DateTimePeriodPickerProps } from './types';
import './styles.css';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

function PickerShell({ variant, placeholder }: { variant: 'date' | 'datetime'; placeholder?: string }) {
  const picker = usePicker();
  const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Register the hook's input keydown handler in context so DateInput can access it
  useEffect(() => {
    picker.setOnInputKeyDown(handleInputKeyDown);
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

  // Compose keyboard handlers: Escape (scoped) + navigation (from hook)
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
    <div ref={wrapperRef} className="dtp-wrapper" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div ref={anchorRef} className="dtp-inputs">
        <DateInput field="initial" placeholder={placeholder} />
        <span className="dtp-inputs-separator">—</span>
        <DateInput field="final" placeholder={placeholder} />
      </div>

      <Dropdown anchorRef={anchorRef}>
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export function DateTimePeriodPicker(props: DateTimePeriodPickerProps) {
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...props}>
      <PickerShell variant={variant} placeholder={props.placeholder} />
    </PickerProvider>
  );
}
```

- [ ] **Step 2: Update Calendar — remove keyboard handlers, add dual-focus rendering**

In `calendar.tsx`, make these changes:

1. Remove `useRef` import and `gridRef` usage
2. Remove the entire `handleKeyDown` callback (lines 106-163)
3. Remove the comment block about pendingFocusDate (lines 101-105)
4. Remove `onKeyDown` from day buttons
5. Change all day `tabIndex` to `{-1}`
6. Add `data-focused` attribute to day buttons
7. Add `dtp-day--focused` class
8. Add `onMouseDown={(e) => e.preventDefault()}` to day buttons and nav buttons
9. Add `tabIndex={-1}` to nav buttons
10. Add `id` to day buttons for `aria-activedescendant`: `id={\`dtp-day-${cell.date.toISOString()}\`}`
11. Update `isInRange` to consider `focusedDate` for keyboard-based range preview
12. Update hover-preview logic to consider `focusedDate`

The updated `getDayClassName` should include `dtp-day--focused`:

```ts
if (picker.focusedDate && isSameDay(cell.date, picker.focusedDate)) {
  classes.push('dtp-day--focused');
}
```

The `isInRange` callback update:

```ts
const isInRange = useCallback(
  (date: Date) => {
    const start = picker.initial;
    const end = picker.final ?? picker.hoveredDate ?? picker.focusedDate;
    if (!start || !end) return false;

    const [rangeStart, rangeEnd] = isBefore(start, end) ? [start, end] : [end, start];
    return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
  },
  [picker.initial, picker.final, picker.hoveredDate, picker.focusedDate],
);
```

The hover-preview class condition update:

```ts
if (
  picker.activeField === 'final' &&
  picker.initial &&
  !picker.final &&
  (picker.hoveredDate || picker.focusedDate) &&
  isInRange(cell.date)
) {
  classes.push('dtp-day--hover-preview');
}
```

Full updated calendar button:

```tsx
<button
  key={cell.date.toISOString()}
  id={`dtp-day-${cell.date.toISOString()}`}
  type="button"
  className={getDayClassName(cell)}
  data-date={cell.date.toISOString()}
  data-focused={picker.focusedDate && isSameDay(cell.date, picker.focusedDate) ? true : undefined}
  onClick={() => handleDayClick(cell.date)}
  onMouseDown={(e) => e.preventDefault()}
  onMouseEnter={() => handleDayHover(cell.date)}
  onMouseLeave={handleDayLeave}
  tabIndex={-1}
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
```

Nav buttons update:

```tsx
<button
  type="button"
  className="dtp-calendar-nav"
  onClick={() => picker.navigateMonth(-1)}
  onMouseDown={(e) => e.preventDefault()}
  tabIndex={-1}
  aria-label="Mês anterior"
>
  &#8249;
</button>
```

(Same for next month button.)

- [ ] **Step 3: Update DateInput — add ARIA attributes and onKeyDown**

In `date-input.tsx`, add:

1. `role="combobox"` on the input
2. `aria-haspopup="dialog"`
3. `aria-expanded={picker.isOpen && isActive}`
4. `aria-activedescendant` — when open and active and focusedDate exists, set to the ID of the focused day button
5. `onKeyDown` — delegate to `picker.onInputKeyDown(e, field)`

Compute the aria-activedescendant value:

```ts
const focusedDateId =
  picker.isOpen && isActive && picker.focusedDate
    ? `dtp-day-${picker.focusedDate.toISOString()}`
    : undefined;
```

Add the keydown handler:

```ts
const handleKeyDown = useCallback(
  (e: React.KeyboardEvent<HTMLInputElement>) => {
    picker.onInputKeyDown(e, field);
  },
  [picker, field],
);
```

Updated input JSX:

```tsx
<input
  ref={inputRef}
  type="text"
  role="combobox"
  className={className}
  value={displayValue}
  placeholder={placeholder ?? defaultPlaceholder}
  maxLength={maxLength}
  disabled={picker.disabled}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onChange={handleChange}
  onKeyDown={handleKeyDown}
  onPaste={handlePaste}
  aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
  aria-haspopup="dialog"
  aria-expanded={picker.isOpen && isActive}
  aria-activedescendant={focusedDateId}
  data-field={field}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: Clean.

- [ ] **Step 5: Run existing tests**

Run: `npx vitest run`
Expected: All 61 tests pass. Some tests may need minor adjustments if the removal of focusable day buttons changes behavior. Specifically:
- Calendar click tests should still work because `onClick` is preserved.
- The `mouseDown preventDefault` on day buttons shouldn't affect click tests in JSDOM.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: wire dual-focus navigation into PickerShell, Calendar, and DateInput"
```

---

### Task 4: Update CSS for simulated focus

**Files:**
- Modify: `src/components/datetime-period-picker/styles.css`

- [ ] **Step 1: Add `.dtp-day--focused` style and update `.dtp-day:focus-visible`**

Add after the existing `.dtp-day--hover-preview` block (line 191):

```css
.dtp-day--focused {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background-color: color-mix(in srgb, var(--accent) 10%, transparent);
}
```

Replace `.dtp-day:focus-visible` (lines 193-196) with a comment noting it's no longer needed:

```css
/* focus-visible is not used — buttons don't receive real focus in dual-focus mode */
```

- [ ] **Step 2: Verify visually**

Run: `npx vitest run` (ensure tests still pass)
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add CSS for simulated focus indicator (.dtp-day--focused)"
```

---

### Task 5: Write unit tests for `useKeyboardNavigation` hook

**Files:**
- Create: `src/components/datetime-period-picker/__tests__/use-keyboard-navigation.test.tsx`

- [ ] **Step 1: Write the test file**

This test renders a minimal component that uses the hook and the `PickerProvider`, then fires keyboard events on the wrapper to verify `focusedDate` changes. Use a test helper component that exposes the picker state.

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod } from '../types';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderForKeyNav(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const defaultProps = {
    value: { initial: '2026-03-15', final: '' } as DatePeriod,
    onChange,
    name: 'period',
    ...overrides,
  };

  const result = render(<DateTimePeriodPicker {...defaultProps} />);
  return { ...result, onChange };
}

describe('useKeyboardNavigation (dual-focus)', () => {
  describe('arrow key navigation', () => {
    it('ArrowRight moves focused day forward by 1', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // focusedDate starts at initial value (March 15, 2026)
      // After ArrowRight, focusedDate should be March 16
      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // The day 16 should have data-focused attribute
      const day16 = screen.getByText('16', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day16).toHaveAttribute('data-focused', 'true');
    });

    it('ArrowLeft moves focused day backward by 1', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowLeft' });

      const day14 = screen.getByText('14', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day14).toHaveAttribute('data-focused', 'true');
    });

    it('ArrowDown moves focused day forward by 7 (one week)', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const day22 = screen.getByText('22', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day22).toHaveAttribute('data-focused', 'true');
    });

    it('ArrowUp moves focused day backward by 7 (one week)', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowUp' });

      const day8 = screen.getByText('8', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day8).toHaveAttribute('data-focused', 'true');
    });
  });

  describe('month navigation', () => {
    it('PageDown moves focused day forward by 1 month', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'PageDown' });

      // March 15 + 1 month = April 15. Calendar should show April.
      expect(screen.getByText(/Abril 2026/)).toBeInTheDocument();
      const day15 = screen.getByText('15', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day15).toHaveAttribute('data-focused', 'true');
    });

    it('PageUp moves focused day backward by 1 month', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'PageUp' });

      // March 15 - 1 month = February 15. Calendar should show February.
      expect(screen.getByText(/Fevereiro 2026/)).toBeInTheDocument();
      const day15 = screen.getByText('15', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day15).toHaveAttribute('data-focused', 'true');
    });

    it('ArrowRight crossing month boundary updates calendar view', async () => {
      // Start at March 31
      renderForKeyNav({ value: { initial: '2026-03-31', final: '' } });
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // March 31 + 1 day = April 1
      expect(screen.getByText(/Abril 2026/)).toBeInTheDocument();
    });
  });

  describe('Home/End', () => {
    it('Home moves focus to start of displayed month', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'Home' });

      const day1 = screen.getByText('1', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day1).toHaveAttribute('data-focused', 'true');
    });

    it('End moves focus to end of displayed month', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'End' });

      const day31 = screen.getByText('31', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day31).toHaveAttribute('data-focused', 'true');
    });
  });

  describe('Enter key selection', () => {
    it('Enter selects the focused date', async () => {
      const { onChange } = renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Navigate to day 17 (ArrowRight x2 from 15)
      fireEvent.keyDown(input, { key: 'ArrowRight' });
      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // Confirm selection
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(event.target.value.initial).toContain('2026-03-17');
    });

    it('Enter on initial auto-advances focus to final input', async () => {
      const { onChange } = renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'Enter' });

      // After selecting initial, focus should move to final input
      const finalInput = screen.getByLabelText('Data final');
      // Need to wait for the useEffect auto-focus
      await vi.waitFor(() => {
        expect(document.activeElement).toBe(finalInput);
      });
    });
  });

  describe('min/max bounds', () => {
    it('blocks navigation past min date', async () => {
      renderForKeyNav({
        min: '2026-03-14',
        value: { initial: '2026-03-15', final: '' },
      });
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Try to go to March 14 (allowed) then March 13 (blocked)
      fireEvent.keyDown(input, { key: 'ArrowLeft' }); // -> 14 (ok)
      fireEvent.keyDown(input, { key: 'ArrowLeft' }); // -> 13 (blocked)

      const day14 = screen.getByText('14', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day14).toHaveAttribute('data-focused', 'true');
    });

    it('blocks navigation past max date', async () => {
      renderForKeyNav({
        max: '2026-03-16',
        value: { initial: '2026-03-15', final: '' },
      });
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowRight' }); // -> 16 (ok)
      fireEvent.keyDown(input, { key: 'ArrowRight' }); // -> 17 (blocked)

      const day16 = screen.getByText('16', { selector: '.dtp-day:not(.dtp-day--outside)' });
      expect(day16).toHaveAttribute('data-focused', 'true');
    });
  });

  describe('guard conditions', () => {
    it('does not handle keys when dropdown is closed', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');

      // Don't click to open — just fire a key on the input
      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // No dialog should be open
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('preventDefault is called on navigation keys', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
      const preventSpy = vi.spyOn(event, 'preventDefault');
      input.dispatchEvent(event);

      expect(preventSpy).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/use-keyboard-navigation.test.tsx`
Expected: All tests pass.

- [ ] **Step 3: Fix any failures and iterate**

If tests fail, adjust assertions or implementation. Common issues:
- The `.dtp-day:not(.dtp-day--outside)` selector may need adjustment if multiple non-outside days have the same number (unlikely for days 8-28, but possible for days 1-7 and 29-31 at month edges).
- The `data-focused` attribute may not appear if the `focusedDate` initialization in `open()` doesn't match the expected date.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: add unit tests for useKeyboardNavigation dual-focus hook"
```

---

### Task 6: Update existing integration tests

**Files:**
- Modify: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

- [ ] **Step 1: Review and update tests**

The existing tests should mostly work since calendar clicks are preserved. Specific updates needed:

1. Tests that check calendar button focus (if any) should check `data-focused` instead
2. No tests currently fire keyboard events on calendar buttons directly (they were on `document` or inputs), so most should be fine
3. Add a test verifying Tab flow doesn't trap in calendar:

```ts
it('Tab from initial to final keeps calendar open', async () => {
  renderPicker();
  const initialInput = screen.getByLabelText('Data inicial');
  await userEvent.click(initialInput);
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // Tab to final input
  await userEvent.tab();
  const finalInput = screen.getByLabelText('Data final');
  expect(document.activeElement).toBe(finalInput);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('Tab past final input closes calendar', async () => {
  renderPicker();
  await userEvent.click(screen.getByLabelText('Data inicial'));
  await userEvent.tab(); // -> final
  await userEvent.tab(); // -> outside component

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

4. Verify ARIA attributes exist:

```ts
it('input has combobox role and ARIA attributes', async () => {
  renderPicker();
  const input = screen.getByLabelText('Data inicial');
  expect(input).toHaveAttribute('role', 'combobox');
  expect(input).toHaveAttribute('aria-haspopup', 'dialog');
  expect(input).toHaveAttribute('aria-expanded', 'false');

  await userEvent.click(input);
  expect(input).toHaveAttribute('aria-expanded', 'true');
});
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (old + new).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "test: update integration tests for dual-focus behavior and ARIA"
```

---

### Task 7: Verify in browser and final cleanup

**Files:**
- No new files. Manual browser verification.

- [ ] **Step 1: Run dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify these scenarios in browser**

1. Click input → calendar opens → use Arrow keys → visual indicator moves on calendar → Enter selects
2. Tab from initial → final → outside: calendar opens, stays open between inputs, closes on tab out
3. PageUp/PageDown change displayed month, focus indicator follows
4. Home/End jump to start/end of month
5. Enter on initial → auto-advances to final → Enter on final → calendar closes
6. Mouse click on day still works (focus stays on input)
7. Multiple pickers on page: Escape only closes the focused one
8. With min/max: arrow keys stop at bounds

- [ ] **Step 3: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit any final fixes (if needed)**

```bash
git add -A && git commit -m "fix: final adjustments from browser verification"
```
