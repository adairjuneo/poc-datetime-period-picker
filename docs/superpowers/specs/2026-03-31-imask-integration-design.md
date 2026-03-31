# iMask Integration for DateInput — Design Spec

## Problem

The `DateInput` component uses a manual `applyMask` function that:
1. Does not manage cursor position — editing in the middle of the input or backspacing through separators (`/`, `:`, ` `) produces incorrect cursor placement.
2. Does not validate segment ranges — users can type day `39`, month `18`, hour `25`, etc.
3. Does not show a persistent placeholder pattern — the HTML `placeholder` attribute disappears as soon as the user starts typing.

The production component package already depends on `react-imask`/`imask`. Integrating iMask solves all three issues with a mature, well-tested library.

## Scope

**In scope:**
- Replace manual masking in `date-input.tsx` with `useIMask` hook from `react-imask`
- Configure `MaskedRange` blocks for segment validation (DD 1-31, MM 1-12, YYYY 1900-2099, HH 0-23, mm 0-59)
- Remove `applyMask` function from `constants.ts`
- Update `constants.test.ts` to remove `applyMask` tests
- Install `react-imask` as a dependency

**Out of scope:**
- Changes to `context.tsx`, `calendar.tsx`, `dropdown.tsx`, `time-selector.tsx`, `use-keyboard-navigation.ts`
- Changes to `types.ts`
- Changes to the `updateFromInput` contract in context (signature stays `(field, rawString)`)

## Design

### iMask Configuration

Two mask configurations, one per variant:

**`date` variant:**
```typescript
{
  mask: Date,
  pattern: '`d/`m/`Y',
  lazy: false,
  placeholderChar: '_',
  overwrite: true,
  autofix: false,
  blocks: {
    d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
    m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
    Y: { mask: IMask.MaskedRange, from: 1900, to: 2099, maxLength: 4 },
  },
  format: (date: Date) => moment(date).format('DD/MM/YYYY'),
  parse: (str: string) => moment(str, 'DD/MM/YYYY').toDate(),
}
```

**`datetime` variant:**
```typescript
{
  mask: Date,
  pattern: '`d/`m/`Y `H:`M',
  lazy: false,
  placeholderChar: '_',
  overwrite: true,
  autofix: false,
  blocks: {
    d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
    m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
    Y: { mask: IMask.MaskedRange, from: 1900, to: 2099, maxLength: 4 },
    H: { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 },
    M: { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 },
  },
  format: (date: Date) => moment(date).format('DD/MM/YYYY HH:mm'),
  parse: (str: string) => moment(str, 'DD/MM/YYYY HH:mm').toDate(),
}
```

**Key option rationale:**
- `lazy: false` — always show `__/__/____` placeholder pattern in the input value
- `placeholderChar: '_'` — unfilled positions display as underscores
- `overwrite: true` — typing replaces the character at cursor position instead of inserting (natural behavior for a fixed-width mask)
- `autofix: false` — invalid digits are silently rejected rather than auto-corrected to the nearest valid value
- `mask: Date` — iMask's built-in Date mask type with `format`/`parse` for typed value conversion

### useIMask Hook Integration

Canonical hook call with all used return values:

```typescript
const inputRef = useRef<HTMLInputElement>(null);

const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
  ref: inputRef,
  onAccept: (value: string, maskRef: InputMask) => {
    if (isExternalUpdate.current) return;  // guard against re-entrancy (see below)
    picker.updateFromInput(field, value);
  },
});
```

Return values used:
- `ref` (aliased `maskRef`) — assigned to the `<input>` element; same reference as `inputRef`
- `setValue` — programmatic setter for syncing external changes (calendar selection, prop changes)
- `unmaskedValue` — raw digits without separators (for completeness checks on blur)

### Ref Sharing

The component needs a ref on the `<input>` for both iMask (mask controller) and our auto-focus logic (programmatic `.focus()` calls).

`useIMask` accepts a `ref` in its second argument. When provided, the hook attaches its mask controller to that ref instead of creating its own. This way both iMask and our auto-focus code share the same ref:

```typescript
const inputRef = useRef<HTMLInputElement>(null);
const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
  ref: inputRef,
  onAccept: (value: string, maskRef: InputMask) => { ... },
});
// maskRef === inputRef — same reference
// Assign maskRef to the <input> element
```

### Bidirectional Data Flow

**User types → picker state:**
1. User types a digit
2. iMask validates against the block ranges, accepts or rejects
3. If accepted, `onAccept` fires with the masked value (e.g., `"25/03/2026"`)
4. `onAccept` calls `picker.updateFromInput(field, maskedValue)`
5. `updateFromInput` in context parses via `parseDatePtBr` — if valid and complete, fires `onChange`

**Calendar/external → input (with re-entrancy guard):**
1. User clicks a day in the calendar, or parent component changes `props.value`
2. `dateValue` (derived from props) changes
3. `useEffect` sets `isExternalUpdate.current = true`
4. Calls `setValue(formatDatePtBr(dateValue, variant))`
5. iMask processes the value and fires `onAccept`
6. `onAccept` checks `isExternalUpdate.current` — since it's `true`, returns early (no redundant `updateFromInput` call)
7. `useEffect` resets `isExternalUpdate.current = false`

This guard ref (`isExternalUpdate = useRef(false)`) prevents a re-entrancy loop where external value changes would trigger `onAccept` → `updateFromInput` → `fireChange` → `onChange` → parent re-renders with same value. The guard is a simple boolean ref, not state, so it doesn't cause re-renders.

**Blur with incomplete input:**
1. User tabs away with partial input (e.g., `"25/03/____"`)
2. `handleBlur` detects `unmaskedValue.length < expectedDigits`
3. Sets `hasError` state for visual feedback
4. The partial value stays in the input (iMask manages it) — `lazy: false` keeps showing the placeholder chars

### Removed Code

- `applyMask` function from `constants.ts` — no longer needed
- `handleChange` in `date-input.tsx` — replaced by `onAccept`
- `handlePaste` in `date-input.tsx` — iMask handles paste natively
- `maxLength` attribute on `<input>` — iMask controls length via the mask pattern
- Manual `localValue` state — replaced by iMask's `value`

### Preserved Code

- `handleFocus` — unchanged (sets `activeField`, opens dropdown)
- `handleBlur` — simplified (uses `unmaskedValue.length` for validation)
- `handleKeyDown` — unchanged (keyboard navigation delegation)
- `useEffect` for auto-focus — unchanged (uses `inputRef`)
- `useEffect` for syncing external value — adapted to call `setValue` instead of `setLocalValue`
- All `aria-*` attributes — unchanged
- All `data-state-*` attributes — unchanged
- `data-field` attribute — unchanged
- `role="combobox"` — unchanged

### Input Element Changes

Before:
```tsx
<input
  ref={inputRef}
  value={displayValue}
  maxLength={maxLength}
  onChange={handleChange}
  onPaste={handlePaste}
  ...
/>
```

After:
```tsx
<input
  ref={maskRef}
  disabled={picker.disabled}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
  ...
/>
```

Note: `value` is controlled by iMask via the ref — we do NOT pass a `value` prop. The `placeholder` prop on `DateInput` becomes unused since `lazy: false` makes iMask show `__/__/____` directly in the input value. The `placeholder` prop will be removed from `DateInputProps`.

### Test Impact

**`constants.test.ts`:** Remove the `applyMask` test group (the function no longer exists).

**`datetime-period-picker.test.tsx`:** Integration tests that type into inputs via `fireEvent.change` or `userEvent.type` may need adjustment because iMask intercepts input events. The key consideration:
- `fireEvent.change(input, { target: { value: '25/03/2026' } })` may not trigger iMask's internal processing since iMask listens to `input` events, not `change`.
- Tests may need to use `userEvent.type` which simulates real keystrokes, or directly set the value via the mask controller.
- Alternatively, tests can use `fireEvent.input` events.
- We will assess during implementation and adjust the minimal set of tests needed.

**`time-selector.test.tsx` and `use-keyboard-navigation.test.tsx`:** No changes needed — these don't touch `DateInput`.

## Dependencies

- `react-imask` (npm package) — adds `imask` as a transitive dependency
- Already a dependency in the production component package

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Add `react-imask` dependency |
| `date-input.tsx` | Replace manual masking with `useIMask` hook |
| `constants.ts` | Remove `applyMask` function |
| `constants.test.ts` | Remove `applyMask` tests |
| `datetime-period-picker.test.tsx` | Adjust input interaction tests if needed for iMask event model |
