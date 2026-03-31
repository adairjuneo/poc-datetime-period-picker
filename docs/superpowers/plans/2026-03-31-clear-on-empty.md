# Clear Input to Empty Value — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user clears all digits from a date input, emit onChange with empty string for that field and reset calendar visual state.

**Architecture:** Detection in `date-input.tsx` `onAccept` callback using `mask.unmaskedValue === ""`. New `clearField` function in `context.tsx` emits `fireChange(null, ...)` and resets `viewDate`/`focusedDate`. Type added to `PickerContextValue`.

**Tech Stack:** React 19, TypeScript 5.9, react-imask 7.6.1, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-31-clear-on-empty-design.md`

---

### Task 1: Add `clearField` to types and context

**Files:**
- Modify: `src/components/datetime-period-picker/types.ts:40-65` (add `clearField` to `PickerContextValue`)
- Modify: `src/components/datetime-period-picker/context.tsx:134-151` (add `clearField` function after `updateFromInput`)
- Modify: `src/components/datetime-period-picker/context.tsx:179-228` (expose `clearField` in context value)

- [ ] **Step 1: Add `clearField` to `PickerContextValue` type**

In `src/components/datetime-period-picker/types.ts`, add after line 61 (`updateFromInput`):

```typescript
clearField: (field: ActiveField) => void;
```

- [ ] **Step 2: Add `clearField` function in `context.tsx`**

In `src/components/datetime-period-picker/context.tsx`, add after `updateFromInput` (after line 151):

```typescript
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
```

- [ ] **Step 3: Expose `clearField` in context provider value**

In the `value` useMemo object (around line 180), add `clearField` to both the object and the dependency array:

Object (after `updateFromInput`):
```typescript
clearField,
```

Dependency array (after `updateFromInput`):
```typescript
clearField,
```

- [ ] **Step 4: Run type check to verify no errors**

Run: `npx tsc --noEmit`
Expected: No new errors (pre-existing LSP errors are known and unrelated).

- [ ] **Step 5: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All 71 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/datetime-period-picker/types.ts src/components/datetime-period-picker/context.tsx
git commit -m "feat: add clearField function to context for clearing date values"
```

---

### Task 2: Wire `clearField` detection in `date-input.tsx`

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx:61-68` (update `onAccept` callback)

- [ ] **Step 1: Update `onAccept` to detect empty input and call `clearField`**

In `src/components/datetime-period-picker/date-input.tsx`, replace the `onAccept` callback (lines 63-67):

Before:
```typescript
onAccept: (value: string) => {
  if (isExternalUpdate.current) return;
  setHasError(false);
  picker.updateFromInput(field as ActiveField, value);
},
```

After:
```typescript
onAccept: (value: string, mask) => {
  if (isExternalUpdate.current) return;
  setHasError(false);

  if (mask.unmaskedValue === '') {
    picker.clearField(field as ActiveField);
    return;
  }

  picker.updateFromInput(field as ActiveField, value);
},
```

The second parameter `mask` is the iMask `InputMask` instance. Using `mask.unmaskedValue` instead of the hook's `unmaskedValue` gives the value at the exact moment of the event.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All 71 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx
git commit -m "feat: detect empty input in onAccept and call clearField"
```

---

### Task 3: Write tests for clear-on-empty behavior

**Files:**
- Modify: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` (add new `describe` block)

- [ ] **Step 1: Add `clear-on-empty` describe block with 6 tests**

Add the following at the end of the main `describe('DateTimePeriodPicker', ...)` block, before the final closing `});`:

```typescript
// --- Clear on empty ---
describe('clear on empty', () => {
  it('emits onChange with empty initial when input is fully cleared', async () => {
    const { onChange } = renderControlled({
      value: { initial: '2026-03-25', final: '2026-03-28' },
    });
    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);

    // Select all text and delete to clear the input completely
    await userEvent.clear(input);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.target.value.initial).toBe('');
  });

  it('emits onChange with empty final when input is fully cleared', async () => {
    const { onChange } = renderControlled({
      value: { initial: '2026-03-25', final: '2026-03-28' },
    });
    const input = screen.getByLabelText('Data final');
    await userEvent.click(input);

    await userEvent.clear(input);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.target.value.final).toBe('');
  });

  it('clearing one field does not affect the other', async () => {
    const { onChange } = renderControlled({
      value: { initial: '2026-03-25', final: '2026-03-28' },
    });
    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);

    await userEvent.clear(input);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.target.value.initial).toBe('');
    expect(lastCall.target.value.final).not.toBe('');
  });

  it('calendar removes selection highlight after clearing field', async () => {
    const { onChange } = renderControlled({
      value: { initial: '2026-03-25', final: '' },
    });
    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);

    // Before clearing, there should be a selected day
    expect(screen.getByText('25').closest('[data-state-selected]')).toBeTruthy();

    await userEvent.clear(input);

    // After clearing, the value is empty so no day should be selected for initial
    // Re-query since DOM may have updated
    const day25Elements = screen.getAllByText('25');
    const selectedDay = day25Elements.find(
      (el) => el.closest('[data-state-selected]'),
    );
    expect(selectedDay).toBeUndefined();
  });

  it('partial clear does NOT emit empty value', async () => {
    const { onChange } = renderControlled({
      value: { initial: '2026-03-25', final: '' },
    });
    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);

    // Type backspace once to partially clear (not all digits removed)
    await userEvent.type(input, '{Backspace}');

    // onChange may or may not have been called, but if called,
    // the initial value should NOT be empty string
    const calls = onChange.mock.calls;
    if (calls.length > 0) {
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.target.value.initial).not.toBe('');
    }
  });

  it('datetime variant: emits onChange with empty when input is fully cleared', async () => {
    const { onChange } = renderControlled({
      variant: 'datetime',
      value: { initial: '2026-03-25T14:30', final: '' },
    });
    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);

    await userEvent.clear(input);

    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.target.value.initial).toBe('');
  });
});
```

- [ ] **Step 2: Run only the new tests to verify they pass**

Run: `npx vitest run --reporter=verbose src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`
Expected: All tests pass, including the 6 new ones (total ~30 tests in this file).

- [ ] **Step 3: Run the full test suite to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass (71 existing + 6 new = 77 total).

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "test: add clear-on-empty behavior tests"
```

---

### Task 4: Final verification

- [ ] **Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All 77 tests pass.

- [ ] **Step 3: Verify no untracked files or uncommitted changes**

Run: `git status`
Expected: Clean working directory on `release/with_imask` branch.
