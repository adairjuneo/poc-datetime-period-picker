# Design: Dual-Focus Keyboard Navigation for DateTimePeriodPicker

**Date:** 2026-03-26
**Status:** Approved
**Relates to:** `src/components/datetime-period-picker/`

## Problem

The current DateTimePeriodPicker moves real DOM focus into the calendar grid when the user interacts with it. Calendar day buttons use roving tabindex and receive keyboard events directly. This breaks the natural Tab flow in forms: a user who just wants to pass through the date fields (Tab, Tab) gets trapped navigating 42+ calendar buttons.

The legacy component (`src/components/__old/date/`) solves this with a "dual focus" pattern where DOM focus never leaves the input, and calendar navigation is simulated via state + CSS. This design ports that pattern to our new component.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| TimeSelector integration | Mouse/scroll only, no dual-focus | Legacy has no time selector; keeps scope manageable |
| Calendar opening trigger | Opens on input focus (like legacy) | Matches legacy behavior users expect |
| Enter key behavior | Confirms simulated-focus date in calendar | Enables full keyboard-only date selection |
| Tab between inputs | Calendar stays open | Avoids flicker; matches legacy |
| Auto-advance after Enter | Yes, from initial to final | Streamlines selection flow |
| Architecture | Dedicated `useKeyboardNavigation` hook | Separates complex navigation logic from components |

## Architecture Overview

### New State: `focusedDate`

Added to `PickerContext`:

- **`focusedDate: Date | null`** — the date with simulated focus in the calendar. `null` when dropdown is closed.
- **`setFocusedDate(date: Date | null)`** — exposed in context.

**Synchronization rules:**

| Event | `focusedDate` becomes |
|-------|-----------------------|
| Dropdown opens (`open()`) | Date of active field, or today if empty |
| Dropdown closes (`close()`) | `null` |
| `activeField` changes (Tab between inputs) | Date of new active field, or today |
| Arrow navigation crosses month boundary | Updated to new date; `viewDate` syncs to show correct month |

### New Hook: `useKeyboardNavigation`

**File:** `src/components/datetime-period-picker/use-keyboard-navigation.ts`

**Interface:**

```ts
function useKeyboardNavigation(): {
  handleContainerKeyDown: (e: React.KeyboardEvent) => void;
  handleInputKeyDown: (e: React.KeyboardEvent, field: 'initial' | 'final') => void;
}
```

#### `handleContainerKeyDown`

Attached to `div.dtp-wrapper`. Only acts when `isOpen === true`. Calls `e.preventDefault()` for all handled keys to prevent cursor movement in the masked input.

| Key | Action | date-fns function |
|-----|--------|-------------------|
| `ArrowLeft` | `focusedDate - 1 day` | `subDays(date, 1)` |
| `ArrowRight` | `focusedDate + 1 day` | `addDays(date, 1)` |
| `ArrowUp` | `focusedDate - 7 days` | `subWeeks(date, 1)` |
| `ArrowDown` | `focusedDate + 7 days` | `addWeeks(date, 1)` |
| `PageUp` | `focusedDate - 1 month` | `subMonths(date, 1)` |
| `PageDown` | `focusedDate + 1 month` | `addMonths(date, 1)` |
| `Home` | Start of current month | `startOfMonth(viewDate)` |
| `End` | End of current month | `endOfMonth(viewDate)` |

**After computing `newDate`:**

1. If `newDate` is outside `[min, max]` bounds, navigation is blocked (no state change).
2. `setFocusedDate(newDate)`
3. If `newDate`'s month differs from `viewDate`, call `setViewDate(startOfMonth(newDate))`.

#### `handleInputKeyDown`

Attached to each `<input>` via context (see PickerShell section).

| Key | Condition | Action |
|-----|-----------|--------|
| `Enter` | `isOpen && focusedDate != null` | Call `selectDate(focusedDate)`. Works for both `initial` and `final` fields. |

**Auto-advance:** When `field === 'initial'`, `selectDate` already calls `setActiveField('final')` internally, and `DateInput` has an existing `useEffect` that auto-focuses the input when `isActive` becomes true. No additional `requestAnimationFrame` or ref wiring is needed — the existing mechanism handles the focus transfer.

When `field === 'final'`, `selectDate` closes the dropdown (existing behavior). No special handling needed.

**Note:** Auto-advance only applies to calendar-based selection (Enter/click), NOT manual typing — the mask's `onComplete` handles typed dates separately and the existing `selectDate` flow manages the field transition.

### Changes to Calendar (`calendar.tsx`)

**Removals:**

- All `onKeyDown` handlers on day `<button>` elements
- Roving tabindex logic — all day buttons become `tabIndex={-1}`
- `gridRef` and the `querySelector('[data-date=...]').focus()` pattern
- The `pendingFocusDate` concern noted in the plan (no longer relevant)

**Additions:**

- `data-focused={isSameDay(cell.date, picker.focusedDate) || undefined}` on each day button
- CSS class `dtp-day--focused` when `focusedDate` matches
- `onMouseDown={(e) => e.preventDefault()}` on all day buttons (prevents focus theft)
- `onMouseDown={(e) => e.preventDefault()}` on prev/next month nav buttons
- Nav buttons get `tabIndex={-1}` (not reachable via Tab)

**Range preview update:**

The `dtp-day--hover-preview` class currently uses `hoveredDate` for mouse-based range preview. This must also consider `focusedDate` for keyboard-based preview. The effective hover date is: `hoveredDate ?? focusedDate` when `activeField === 'final'`.

### Changes to DateInput (`date-input.tsx`)

**Additions:**

- `role="combobox"` on the `<input>`
- `aria-haspopup="dialog"` on the `<input>`
- `aria-expanded={picker.isOpen && isActive}` on the `<input>`
- `aria-activedescendant={focusedDateId}` — where `focusedDateId` is the `id` attribute of the focused day button in the calendar (format: `dtp-day-YYYY-MM-DD`). Only set when `isOpen && isActive && focusedDate != null`.
- `onKeyDown` handler that delegates to `picker.onInputKeyDown(e, field)` from context

**No changes to:** mask logic, onChange, onComplete, onFocus, onBlur.

### Changes to PickerShell (`index.tsx`)

- Instantiates hook: `const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation()`
- Composes `onKeyDown` on wrapper: first handles Escape (existing), then delegates to `handleContainerKeyDown`
- Passes `handleInputKeyDown` via context (added to `PickerContextValue` as `onInputKeyDown`)

### Changes to Context (`context.tsx`)

**New fields in `PickerContextValue`:**

- `focusedDate: Date | null`
- `setFocusedDate: (date: Date | null) => void`
- `onInputKeyDown: (e: React.KeyboardEvent, field: 'initial' | 'final') => void`

**`focusedDate` initialization logic in `open()`:**

```
open() → setFocusedDate(value[activeField] ?? new Date())
```

**`focusedDate` reset in `close()`:**

```
close() → setFocusedDate(null)
```

**`focusedDate` sync on `activeField` change:**

When `activeField` changes (Tab between inputs while open), `focusedDate` updates to the date of the new active field, or today.

Note: `onInputKeyDown` is set to a no-op initially and overridden by `PickerShell` after the hook is instantiated.

### CSS Changes (`styles.css`)

**Addition:**

```css
.dtp-day--focused {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
  background-color: color-mix(in srgb, var(--accent) 10%, transparent);
}
```

**Modification:**

- Remove or neutralize `.dtp-day:focus-visible` (buttons no longer receive real focus)
- Keep `.dtp-day--selected-start`, `.dtp-day--selected-end`, `.dtp-day--in-range` as-is

### Calendar Button IDs

Each day button needs a stable, unique `id` for `aria-activedescendant` to reference:

```
id={`dtp-day-${formatISO(cell.date, { representation: 'date' })}`}
```

Example: `dtp-day-2026-03-15`

## Testing Strategy

### Modified Tests

**`datetime-period-picker.test.tsx` (integration):**

- Tests that fire keyboard events on calendar buttons must be rewritten to fire on the input
- Tests checking `:focus` on calendar days must check `data-focused` attribute or `.dtp-day--focused` class instead
- Tests for Tab flow should verify: Tab from initial → final → outside (no calendar trapping)

### New Tests

**`use-keyboard-navigation.test.ts`:**

| Test | What it verifies |
|------|-----------------|
| ArrowLeft/Right moves focusedDate by 1 day | Basic navigation |
| ArrowUp/Down moves focusedDate by 7 days | Week navigation |
| PageUp/Down moves focusedDate by 1 month | Month navigation |
| Home/End jumps to start/end of month | Month boundary |
| Arrow crossing month boundary updates viewDate | Month sync |
| Navigation blocked at min/max bounds | Constraint respect |
| Enter selects focusedDate | Selection |
| Enter on initial auto-advances to final | Auto-advance |
| Keys ignored when dropdown is closed | Guard condition |
| preventDefault called on navigation keys | Input protection |

## Files Changed

| File | Change Type | Summary |
|------|-------------|---------|
| `context.tsx` | Modified | Add `focusedDate`, `setFocusedDate`, `onInputKeyDown` to context |
| `use-keyboard-navigation.ts` | **New** | Hook with all dual-focus navigation logic |
| `calendar.tsx` | Modified | Remove keyboard handlers, add `data-focused`, `tabIndex={-1}`, mouseDown preventDefault |
| `date-input.tsx` | Modified | Add ARIA attributes, delegate onKeyDown to context |
| `index.tsx` | Modified | Instantiate hook, compose keyboard handlers, pass via context |
| `styles.css` | Modified | Add `.dtp-day--focused`, remove `.dtp-day:focus-visible` |
| `datetime-period-picker.test.tsx` | Modified | Update keyboard tests to fire on input, check data-focused |
| `use-keyboard-navigation.test.ts` | **New** | Unit tests for the hook |

## Out of Scope

- Dual-focus for TimeSelector (mouse/scroll only)
- Shift+PageUp/PageDown for year navigation (can be added later)
- Focus trapping inside dropdown (not needed — focus never enters the dropdown)
- `aria-current="date"` for today (enhancement, not blocking)
