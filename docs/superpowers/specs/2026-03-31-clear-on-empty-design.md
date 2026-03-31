# Clear Input to Empty Value — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Branch:** `release/with_imask`

## Problem

When a user clears all text from a date input (backspaces all characters), the input visually appears empty (shows iMask placeholder `__/__/____`), but the date value remains selected internally. The `updateFromInput` function in `context.tsx` calls `parseDatePtBr(raw, variant)` which returns `null` for empty strings, and then `if (!parsed) return;` silently discards the clear action. The value is never reset to empty.

This is a required feature for parity with the legacy component.

## Requirements

1. **Trigger:** Clearing must happen immediately when the input becomes completely empty (all digits removed), not on blur. This supports form submission via Enter without leaving the field.
2. **Empty detection:** Only when the input is 100% empty (`unmaskedValue === ""`). Partially cleared inputs (e.g., `25/__/____`) do NOT trigger a clear — the previous value is preserved.
3. **Field independence:** Clearing one field does not affect the other. Clearing `initial` leaves `final` unchanged, and vice versa.
4. **Calendar visual:** When a field is cleared, the calendar removes the selection highlight for that field and the `viewDate` resets to the current month (today).
5. **onChange format:** The cleared field emits an empty string via the standard onChange pattern: `onChange({ target: { name, value: { initial: "", final: "existing-value" } } })`.

## Approach

**Approach A — Detect in `onAccept`, call new `clearField` function.**

Detection happens in the `onAccept` callback of `date-input.tsx` using `mask.unmaskedValue === ""`. A new `clearField(field)` function in `context.tsx` handles the state reset and onChange emission.

### Why this approach

- `unmaskedValue` from the iMask callback parameter is the most reliable way to detect a fully empty input (raw digits only, no separators or placeholders).
- A dedicated `clearField` function separates the "clear" operation from the "update from typed input" operation, keeping each function single-purpose.
- `fireChange` already converts `null` to `""` in its output, so `clearField` simply passes `null` for the cleared field.

## Design

### 1. New `clearField` function in `context.tsx`

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

Exposed via the context provider value and added to `PickerContextValue` in `types.ts`.

### 2. Type addition in `types.ts`

Add to `PickerContextValue`:

```typescript
clearField: (field: ActiveField) => void;
```

### 3. Detection in `date-input.tsx` `onAccept`

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

`mask.unmaskedValue` is used instead of the hook's `unmaskedValue` because the callback parameter reflects the value at the exact moment of the event, avoiding potential stale-ref issues within the same render cycle.

### 4. What does NOT change

- `updateFromInput` — remains unchanged.
- `fireChange` — remains unchanged (already converts `null` → `""`).
- No CSS/SCSS changes.
- No changes to existing tests.

## Test Plan

Six new tests in `datetime-period-picker.test.tsx`:

| # | Test | Description |
|---|------|-------------|
| 1 | Clear initial emits empty | Select a date in initial, clear all characters, verify onChange has `initial: ""` |
| 2 | Clear final emits empty | Select a date in final, clear all characters, verify onChange has `final: ""` |
| 3 | Clearing one field does not affect the other | Select dates in both fields, clear initial, verify final is unchanged in onChange |
| 4 | Calendar removes highlight on clear | After clearing a field, verify no day has `data-state-selected` for that field |
| 5 | Partial clear does NOT emit empty | Delete some digits but not all, verify onChange is NOT called with empty string |
| 6 | Datetime variant: clear emits empty | Same as test 1 but with `variant="datetime"` to cover the different mask |

## Files Changed

| File | Change |
|------|--------|
| `src/components/datetime-period-picker/types.ts` | Add `clearField` to `PickerContextValue` |
| `src/components/datetime-period-picker/context.tsx` | Add `clearField` function, expose in provider value |
| `src/components/datetime-period-picker/date-input.tsx` | Add empty detection in `onAccept` callback |
| `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` | Add 6 new tests |
