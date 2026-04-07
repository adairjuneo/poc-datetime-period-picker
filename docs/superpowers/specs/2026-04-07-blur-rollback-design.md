# Blur Rollback and Error State Removal — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Branch:** `release/with_imask`

## Problem

When a user partially clears a date input (e.g., erases the month and year, leaving `01/__/____`) and then leaves the field (blur), the component currently shows a red error border (`data-state-error`). This is incorrect behavior. The legacy component instead restores the input to its last valid state on blur.

## Requirements

1. **Rollback on blur with existing date:** If the input has a partially typed date AND the field has a previously selected valid date (`dateValue !== null`), restore the input display to the formatted date on blur.
2. **Clear on blur without existing date:** If the input has a partially typed date AND the field has NO previously selected date (value is empty), restore the input to the empty placeholder (`__/__/____`) on blur.
3. **No change on complete or empty:** If the input is fully completed (all digits present) or fully empty (no digits), blur does nothing special.
4. **Remove error state entirely:** Remove `hasError` state, `setHasError`, `data-state-error` attribute from `date-input.tsx`. Remove `[data-state-error]` CSS rules from `styles.scss`. The component no longer has its own internal error display — validation is the consumer's responsibility.

## Design

### 1. Rewrite `handleBlur` in `date-input.tsx`

Current behavior (remove):
```typescript
const handleBlur = useCallback(() => {
  const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
  if (unmaskedRef.current.length > 0 && unmaskedRef.current.length < expectedDigits) {
    setHasError(true);
  }
}, [picker.variant]);
```

New behavior:
```typescript
const handleBlur = useCallback(() => {
  const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
  const len = unmaskedRef.current.length;

  // Only act on partial input (some digits, but not all)
  if (len > 0 && len < expectedDigits) {
    if (dateValue) {
      // Restore to the last valid date
      setValue(formatDatePtBr(dateValue, picker.variant));
    } else {
      // No previous date — clear to empty placeholder
      setValue('');
    }
  }
}, [picker.variant, dateValue, setValue]);
```

The `isExternalUpdate` guard is NOT needed here because `setValue` in this case is an intentional user-facing restoration, not a programmatic sync that should be ignored by `onAccept`. The `onAccept` callback will fire but `parseDatePtBr` will handle it correctly — the restored date will parse back to the same value, and an empty string will have `unmaskedValue === ''` which triggers `clearField` (already implemented).

**Wait — important edge case:** When we restore a valid date via `setValue`, `onAccept` will fire and call `updateFromInput`, which will re-emit `fireChange` with the same date. This is harmless (same value) but unnecessary. When we `setValue('')` to clear, `onAccept` will fire with empty `unmaskedValue` and call `clearField`. This is also correct behavior — it ensures the value is properly cleared.

However, we DO need the `isExternalUpdate` guard to prevent the `onAccept` from re-emitting onChange when restoring a valid date. The restored date is the same as the current value, so re-emitting is unnecessary noise. Set `isExternalUpdate.current = true` before `setValue`, reset via `queueMicrotask` — same pattern used in the external sync `useEffect`.

Updated approach:
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

### 2. Remove `hasError` state from `date-input.tsx`

Remove:
- `const [hasError, setHasError] = useState(false);`
- `setHasError(false)` from `onAccept` callback
- `setHasError(false)` from external sync `useEffect`
- `data-state-error={hasError || undefined}` from the `<input>` JSX

### 3. Remove error CSS from `styles.scss`

Remove lines 41-44:
```scss
&[data-state-error='true'] {
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
}
```

## Test Plan

Four new tests in `datetime-period-picker.test.tsx`, in a new `describe('blur rollback', ...)` block:

| # | Test | Description |
|---|------|-------------|
| 1 | Blur with partial input restores previous date | Select date, focus input, partially clear, blur, verify input shows original date |
| 2 | Blur with partial input and no previous date clears to placeholder | Empty field, type partial date, blur, verify input shows placeholder |
| 3 | Blur with complete input does nothing | Type full date, blur, verify input unchanged |
| 4 | Blur with empty input does nothing | Empty field, focus and blur without typing, verify input still shows placeholder |

Existing error-related tests: None (grep confirmed no tests reference `data-state-error` or `hasError`).

## Files Changed

| File | Change |
|------|--------|
| `src/components/datetime-period-picker/date-input.tsx` | Remove `hasError` state, rewrite `handleBlur` with rollback logic |
| `src/components/datetime-period-picker/styles.scss` | Remove `[data-state-error]` CSS rule |
| `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` | Add 4 new blur rollback tests |
