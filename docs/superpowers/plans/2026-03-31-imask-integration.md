# iMask Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `applyMask` input masking in `DateInput` with `react-imask`'s `useIMask` hook, adding segment range validation (DD 1-31, MM 1-12, etc.) and proper cursor management.

**Architecture:** The `useIMask` hook replaces all manual mask logic in `date-input.tsx`. A `isExternalUpdate` guard ref prevents re-entrancy when syncing external values. The `applyMask` function is removed from `constants.ts` and its tests from `constants.test.ts`. Integration tests are adapted for iMask's event model.

**Tech Stack:** react-imask 7.x, imask (transitive), moment.js, React 19, TypeScript 5.9, Vitest

**Spec:** `docs/superpowers/specs/2026-03-31-imask-integration-design.md`

---

### Task 1: Install react-imask

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

Run: `npm install react-imask`

- [ ] **Step 2: Verify installation**

Run: `npm ls react-imask`
Expected: `react-imask@7.x.x` listed

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run`
Expected: 77/77 passing

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-imask dependency"
```

---

### Task 2: Rewrite DateInput with useIMask

This is the core task. Replace all manual masking logic with the `useIMask` hook.

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx`
- Modify: `src/components/datetime-period-picker/index.tsx` (remove `placeholder` prop from `<DateInput>` calls and `PickerShell`)
- Modify: `src/components/datetime-period-picker/types.ts` (remove `placeholder` from `DateTimePeriodPickerProps`) — **Note:** The spec lists `types.ts` as out-of-scope, but removing a now-dead prop is a necessary cleanup when removing `placeholder` from the component API.

**Current file structure to understand:**
- `date-input.tsx` currently uses `useState` for `localValue`, `isFocused`, `hasError`
- `handleChange` calls `applyMask` then `picker.updateFromInput`
- `handlePaste` manually intercepts paste events
- A `useEffect` syncs `localValue` when `dateValue` changes externally
- `displayValue` toggles between `localValue` (focused) and `formatDatePtBr` (blurred)

**What to replace with:**
- `useIMask` manages the input value via ref (no `value` prop on `<input>`)
- `onAccept` callback replaces `handleChange`
- iMask handles paste natively — remove `handlePaste`
- `setValue` from `useIMask` replaces `setLocalValue` for external sync
- `isExternalUpdate` ref guards against `onAccept` re-entrancy during `setValue`

- [ ] **Step 1: Rewrite date-input.tsx**

Replace the entire file content with the new implementation:

```tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIMask } from 'react-imask';
import IMask from 'imask';
import moment from 'moment';
import { usePicker } from './context';
import { formatDatePtBr } from './constants';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
};

function buildMaskOptions(variant: 'date' | 'datetime') {
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
  };
}

export function DateInput({ field }: DateInputProps) {
  const picker = usePicker();
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const [hasError, setHasError] = useState(false);
  const isExternalUpdate = useRef(false);

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string) => {
      if (isExternalUpdate.current) return;
      setHasError(false);
      picker.updateFromInput(field as ActiveField, value);
    },
  });

  // Sync iMask value when the controlled date value changes externally
  // (e.g., calendar selection, parent prop change)
  useEffect(() => {
    isExternalUpdate.current = true;
    setValue(formatDatePtBr(dateValue, picker.variant));
    setHasError(false);
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

  const handleFocus = useCallback(() => {
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    if (unmaskedValue.length > 0 && unmaskedValue.length < expectedDigits) {
      setHasError(true);
    }
  }, [unmaskedValue, picker.variant]);

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
      ref={maskRef}
      type="text"
      className="input"
      data-state-active={isActive || undefined}
      data-state-error={hasError || undefined}
      disabled={picker.disabled}
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

- [ ] **Step 2: Remove `placeholder` prop from index.tsx**

In `src/components/datetime-period-picker/index.tsx`:

1. Remove `placeholder` from `PickerShell` props: change `function PickerShell({ variant, placeholder }: { variant: 'date' | 'datetime'; placeholder?: string })` to `function PickerShell({ variant }: { variant: 'date' | 'datetime' })`
2. Remove `placeholder={placeholder}` from both `<DateInput>` JSX calls (lines 49, 51)
3. Remove `placeholder={props.placeholder}` from `<PickerShell>` call (line 67)

- [ ] **Step 3: Remove `placeholder` prop from types.ts**

In `src/components/datetime-period-picker/types.ts`:

Remove `placeholder?: string;` from `DateTimePeriodPickerProps` (line 24).

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "date-input|index|types"`
Expected: No errors

- [ ] **Step 5: Verify the component renders in the browser**

Run: `npx vite dev` and manually check that:
- Both inputs show `__/__/____` placeholder
- Typing digits inserts separators and validates ranges
- Cursor management works (backspace through `/`)
- Calendar selection updates the input

- [ ] **Step 6: Run tests to see which pass/fail**

Run: `npx vitest run`
Note: Some tests may fail due to iMask's event model. Record which tests fail — they will be fixed in Task 4.

- [ ] **Step 7: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx src/components/datetime-period-picker/index.tsx src/components/datetime-period-picker/types.ts
git commit -m "feat: replace manual masking with useIMask in DateInput, remove placeholder prop"
```

---

### Task 3: Remove applyMask from constants

**Files:**
- Modify: `src/components/datetime-period-picker/constants.ts`
- Modify: `src/components/datetime-period-picker/__tests__/constants.test.ts`

- [ ] **Step 1: Remove the applyMask function from constants.ts**

Remove the `applyMask` function (lines 86-99 of `constants.ts`).

- [ ] **Step 2: Remove the applyMask import and test block from constants.test.ts**

Remove `applyMask` from the import statement (line 15).
Remove the entire `describe('applyMask', ...)` block (lines 149-169).

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors (no other file imports `applyMask` since `date-input.tsx` was already rewritten in Task 2)

- [ ] **Step 4: Run constants tests**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/constants.test.ts`
Expected: All remaining tests pass (applyMask tests removed)

- [ ] **Step 5: Commit**

```bash
git add src/components/datetime-period-picker/constants.ts src/components/datetime-period-picker/__tests__/constants.test.ts
git commit -m "refactor: remove applyMask function and tests (replaced by iMask)"
```

---

### Task 4: Fix integration tests for iMask event model

**Files:**
- Modify: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

**Context:** iMask manages the input via DOM events internally. Tests using `fireEvent.change` may not trigger iMask's processing. Tests using `userEvent.type` should work since they simulate real keystrokes, but the input value will be masked by iMask (with placeholder chars from `lazy: false`).

**IMPORTANT — jsdom Compatibility Warning:** iMask relies on `InputEvent`, `beforeinput` events, and selection range APIs that jsdom doesn't fully implement. `userEvent.type` may not trigger iMask's internal processing pipeline in jsdom. If this happens, tests that type into inputs will not see masked values, and `onAccept` won't fire.

**Contingency — Mock `useIMask` if jsdom is incompatible:** If Step 1 reveals that `userEvent.type` doesn't produce masked values (i.e., iMask isn't processing keystrokes in jsdom), the implementer MUST mock `useIMask` at the module level for integration tests. The mock should:
1. Return a `ref` callback that attaches to the input
2. Track `setValue` calls
3. Call `onAccept` with the provided value when `setValue` is called (simulating external sync)
4. For simulated typing, intercept the input's `onChange` and call `onAccept` with the raw value

This mock approach ensures tests validate component logic (field switching, calendar sync, error states) without depending on iMask's DOM-level processing.

Key test changes expected:

1. **Placeholder tests** (lines 66-76): The inputs now show `__/__/____` via iMask's `lazy: false` instead of using the HTML `placeholder` attribute. These tests need to check for `toHaveValue('__/__/____')` instead of `getAllByPlaceholderText`. Note: `placeholder` prop has been removed from the component, so `getAllByPlaceholderText` queries will fail.

2. **Input typing tests** (lines 200-229): `userEvent.type` should work with iMask, but the expected value needs to account for iMask's behavior. After typing `25032026` into a `lazy: false` mask, the value should be `25/03/2026`.

3. **Paste test** (lines 216-229): iMask intercepts paste at a lower DOM level (`beforeinput` event with `inputType: 'insertFromPaste'`) than what jsdom/testing-library supports. `fireEvent.paste` and `userEvent.paste` will NOT trigger iMask's paste processing in jsdom. **This test should be DELETED** — paste behavior will be verified manually in the browser during Task 5 Step 4. If the implementer wants to keep a paste test, it must go through the `useIMask` mock (if the mock contingency is active) or be rewritten to call `setValue` directly, but deletion is the recommended approach.

4. **Async value test** (lines 280-299): The empty value test (line 282) expects `toHaveValue('')` but with `lazy: false` the empty input shows `__/__/____`.

- [ ] **Step 1: Run the full test suite and record failures**

Run: `npx vitest run`
Record which tests fail and the exact error messages. **Pay special attention to whether `userEvent.type` produces masked values in inputs** — this determines whether the jsdom mock contingency is needed.

- [ ] **Step 2: Fix each failing test (or apply mock contingency)**

**If `userEvent.type` works with iMask in jsdom:** For each failing test, adjust the test to match iMask's behavior. The component's external behavior (onChange events, date values) remains the same — only how the input displays values changes.

**If `userEvent.type` does NOT work with iMask in jsdom:** Create a `useIMask` mock (see contingency section above) and apply it via `vi.mock('react-imask', ...)` at the top of the test file. Then adjust tests to work with the mock.

General patterns (regardless of mock approach):
- `toHaveValue('')` → `toHaveValue('__/__/____')` (or `'__/__/____ __:__'` for datetime)
- `getAllByPlaceholderText('DD/MM/AAAA')` → query by `aria-label` instead, or check `toHaveValue('__/__/____')`
- **Delete the paste test** (see item 3 above) — paste is verified manually in Task 5

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "test: adapt integration tests for iMask event model"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Check no applyMask references remain**

Run: `grep -r "applyMask" src/ --include="*.ts" --include="*.tsx"`
Expected: No output

- [ ] **Step 4: Verify in browser**

Run: `npx vite dev` and manually verify:
- [ ] Typing day > 31 is rejected (try typing `39`)
- [ ] Typing month > 12 is rejected (try typing `18`)
- [ ] Cursor management works when clicking mid-input and backspacing through separators
- [ ] Calendar selection updates both inputs correctly
- [ ] Tab between initial/final works and calendar follows
- [ ] Paste works correctly
- [ ] Datetime variant shows hour/minute columns and mask `__/__/____ __:__`
- [ ] Disabled state works
- [ ] Min/max constraints work

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: final adjustments for iMask integration"
```
