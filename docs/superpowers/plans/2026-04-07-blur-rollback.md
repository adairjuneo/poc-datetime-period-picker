# Blur Rollback and Error State Removal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a user partially clears a date input and leaves the field (blur), restore the last valid date — or clear to placeholder if no date was selected. Remove the red error border entirely.

**Architecture:** Rewrite `handleBlur` in `date-input.tsx` to detect partial input and either restore the formatted date or clear. Remove all `hasError` state and `data-state-error` CSS. Four new tests cover the blur rollback behavior.

**Tech Stack:** React 19, TypeScript 5.9, react-imask 7.6.1, moment.js, Vitest, @testing-library/react, userEvent

---

## File Structure

No new files. Three files are modified:

| File | Responsibility | Change |
|------|---------------|--------|
| `src/components/datetime-period-picker/date-input.tsx` | Date input with iMask | Remove `hasError` state, rewrite `handleBlur` |
| `src/components/datetime-period-picker/styles.scss` | Component styles | Remove `[data-state-error]` CSS rule |
| `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` | Integration tests | Add 4 blur rollback tests |

---

### Task 1: Remove error state from date-input.tsx and styles.scss

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx:49,65,84,128`
- Modify: `src/components/datetime-period-picker/styles.scss:41-44`

- [ ] **Step 1: Remove `hasError` state declaration**

In `src/components/datetime-period-picker/date-input.tsx`, remove line 49:

```typescript
const [hasError, setHasError] = useState(false);
```

- [ ] **Step 2: Remove `setHasError(false)` from `onAccept` callback**

In `src/components/datetime-period-picker/date-input.tsx`, in the `onAccept` callback (line 63-73), remove line 65:

```typescript
setHasError(false);
```

The `onAccept` callback should become:

```typescript
onAccept: (value: string, mask) => {
  if (isExternalUpdate.current) return;

  if (mask.unmaskedValue === '') {
    picker.clearField(field as ActiveField);
    return;
  }

  picker.updateFromInput(field as ActiveField, value);
},
```

- [ ] **Step 3: Remove `setHasError(false)` from external sync `useEffect`**

In `src/components/datetime-period-picker/date-input.tsx`, in the `useEffect` at lines 81-89, remove line 84:

```typescript
setHasError(false);
```

The `useEffect` should become:

```typescript
useEffect(() => {
  isExternalUpdate.current = true;
  setValue(formatDatePtBr(dateValue, picker.variant));
  // Use queueMicrotask to reset the guard after iMask processes the setValue
  queueMicrotask(() => {
    isExternalUpdate.current = false;
  });
}, [dateValue, picker.variant, setValue]);
```

- [ ] **Step 4: Remove `data-state-error` from input JSX**

In `src/components/datetime-period-picker/date-input.tsx`, remove line 128:

```tsx
data-state-error={hasError || undefined}
```

- [ ] **Step 5: Remove `useState` from imports if no longer used**

After removing `hasError`, check if `useState` is still needed. Currently line 1 imports:

```typescript
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
```

Remove `useState` since it is no longer used anywhere in the file:

```typescript
import { useEffect, useRef, useCallback, useMemo } from 'react';
```

- [ ] **Step 6: Remove error CSS from styles.scss**

In `src/components/datetime-period-picker/styles.scss`, remove lines 41-44:

```scss
    &[data-state-error='true'] {
      border-color: #ef4444;
      box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
    }
```

- [ ] **Step 7: Run tests to verify nothing broke**

Run: `npx vitest run`
Expected: All 77 existing tests pass (no tests reference `hasError` or `data-state-error`).

- [ ] **Step 8: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx src/components/datetime-period-picker/styles.scss
git commit -m "refactor: remove hasError state and data-state-error CSS from date input"
```

---

### Task 2: Rewrite handleBlur with rollback logic

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx:103-108`

- [ ] **Step 1: Write the 4 failing tests**

In `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`, add a new `describe('blur rollback', ...)` block after the existing `describe('clear on empty', ...)` block (after line 477). Add a `clearInput` helper inside the block (same pattern as in the `clear on empty` block).

```typescript
  // --- Blur rollback ---
  describe('blur rollback', () => {
    /**
     * Helper: select-all + delete to clear a masked input.
     * userEvent.clear() may not reliably trigger iMask's onAccept,
     * so we use tripleClick (select all) + Backspace instead.
     */
    async function clearInput(input: HTMLElement) {
      await userEvent.tripleClick(input);
      await userEvent.keyboard('{Backspace}');
    }

    it('restores previous date when blur with partial input', async () => {
      renderControlled({
        value: { initial: '2026-03-25', final: '' },
      });

      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Input should show the formatted date
      expect(input).toHaveValue('25/03/2026');

      // Partially clear: select all, then type only a partial date
      await clearInput(input);
      await userEvent.type(input, '01');

      // Now input has partial content (e.g., "01/__/____")
      // Blur the input by clicking outside
      await userEvent.click(document.body);

      // After blur, input should be restored to the original date
      expect(input).toHaveValue('25/03/2026');
    });

    it('clears to placeholder when blur with partial input and no previous date', async () => {
      renderControlled({
        value: { initial: '', final: '' },
      });

      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Type a partial date (not complete)
      await userEvent.type(input, '15');

      // Blur the input
      await userEvent.click(document.body);

      // After blur, input should show the empty placeholder
      expect(input).toHaveValue('__/__/____');
    });

    it('does nothing on blur when input has complete date', async () => {
      renderControlled({
        value: { initial: '', final: '' },
      });

      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Type a complete date
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');

      // Blur the input
      await userEvent.click(document.body);

      // Input should still show the typed date
      expect(input).toHaveValue('25/03/2026');
    });

    it('does nothing on blur when input is empty', async () => {
      renderControlled({
        value: { initial: '', final: '' },
      });

      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);

      // Don't type anything, just blur
      await userEvent.click(document.body);

      // Input should still show the empty placeholder
      expect(input).toHaveValue('__/__/____');
    });
  });
```

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run --reporter=verbose 2>&1 | grep -E "(blur rollback|FAIL|PASS|restores|clears to|does nothing)"`
Expected: The 2 tests that check rollback/clear behavior FAIL (current `handleBlur` sets error instead of restoring). The 2 "does nothing" tests may PASS since current behavior also does nothing on complete/empty input.

- [ ] **Step 3: Rewrite `handleBlur` in date-input.tsx**

In `src/components/datetime-period-picker/date-input.tsx`, replace the current `handleBlur` (lines 103-108):

```typescript
  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    if (unmaskedRef.current.length > 0 && unmaskedRef.current.length < expectedDigits) {
      setHasError(true);
    }
  }, [picker.variant]);
```

With:

```typescript
  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    const len = unmaskedRef.current.length;

    if (len > 0 && len < expectedDigits) {
      isExternalUpdate.current = true;
      if (dateValue) {
        setValue(formatDatePtBr(dateValue, picker.variant));
      } else {
        setValue('');
      }
      queueMicrotask(() => {
        isExternalUpdate.current = false;
      });
    }
  }, [picker.variant, dateValue, setValue]);
```

Note: After Task 1, `setHasError` is already removed. The old `handleBlur` references `setHasError(true)` which will already be gone — so the replacement is straightforward.

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npx vitest run`
Expected: All tests pass (77 existing + 4 new = 81 total).

- [ ] **Step 5: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "feat: restore valid date or clear to placeholder on blur with partial input"
```
