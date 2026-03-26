# SCSS + data-state-* Migration Design

## Overview

Migrate the DateTimePeriodPicker component's styling methodology from plain CSS with BEM-like modifier classes to SCSS with `data-state-*` attributes. This aligns the component with the styling conventions of the production component package.

## Goals

1. Replace plain CSS with SCSS (nesting, variables, organization).
2. Replace all conditional CSS modifier classes (`--active`, `--error`, etc.) with `data-state-*` HTML attributes.
3. Remove the `dtp-` prefix from all CSS class names — SCSS nesting under a root class provides scoping.
4. Eliminate all class-toggling logic from TSX files (no more array + filter + join patterns).

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Preprocessor | SCSS | Matches production package |
| Data-attribute convention | `data-state-*` | Matches production package (`data-state-error="true"`, etc.) |
| Theming | SCSS variables (local) | Matches production; POC uses local `_variables.scss` |
| File organization | Single `styles.scss` + `_variables.scss` partial | Component is 266 lines of CSS; splitting further adds overhead without benefit |
| Class prefix | Remove `dtp-` | SCSS nesting under `.datetime-period-picker` scopes everything |
| Migration scope | Complete | All 16 modifier classes become data-state-* attributes or SCSS compound selectors |
| Attribute removal pattern | `value \|\| undefined` | When false, attribute is removed from DOM entirely (not set to `"false"`) |

## File Structure

```
src/components/datetime-period-picker/
├── _variables.scss          # NEW — SCSS variables
├── styles.scss              # NEW — replaces styles.css
├── styles.css               # DELETE
```

## SCSS Variables (`_variables.scss`)

Extracted from the CSS custom properties currently defined in `src/index.css`:

```scss
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
$shadow: rgba(0, 0, 0, 0.08);

// Sizing
$dropdown-max-height: 380px;
$input-height: 2.25rem;
$day-cell-size: 2rem;
```

## SCSS Structure (`styles.scss`)

Root class `.datetime-period-picker` wraps everything. All child selectors are nested inside it.

```scss
@use 'variables' as *;

.datetime-period-picker {
  // .wrapper styles (display, font, position)

  .input-group { /* flex row for inputs + separator */ }

  .input {
    // base input styles
    &[data-state-active="true"] { /* active border/ring */ }
    &[data-state-error="true"] { /* error border color */ }
  }

  .separator { /* "até" text between inputs */ }

  .dropdown {
    // base dropdown (position, shadow, etc.)
    &[data-state-above="true"] { /* flip to open upward */ }
    &[data-state-align-right="true"] { /* right-align */ }
  }

  .calendar { /* padding */ }
  .calendar-header { /* flex row for nav + title */ }
  .calendar-nav { /* prev/next buttons */ }
  .calendar-title { /* month/year display */ }
  .weekdays { /* grid header row */ }
  .weekday { /* individual weekday label */ }
  .grid { /* 7-column CSS grid */ }

  .day {
    // base day cell
    &:hover:not([data-state-disabled]):not([data-state-selected-start]):not([data-state-selected-end]) {
      /* hover highlight (excludes disabled/selected via attribute selectors) */
    }
    &[data-state-outside="true"] { /* muted color for other-month days */ }
    &[data-state-disabled="true"] { /* disabled state */ }
    &[data-state-today="true"] { /* today indicator */ }
    &[data-state-selected-start="true"] { /* start selection */ }
    &[data-state-selected-end="true"] { /* end selection */ }
    &[data-state-focused="true"] { /* keyboard focus indicator */ }
    &[data-state-in-range="true"] {
      /* range background */
      &[data-state-selected-start="true"] { border-radius: 6px 0 0 6px; }
      &[data-state-selected-end="true"] { border-radius: 0 6px 6px 0; }
    }
    &[data-state-hover-preview="true"] { /* preview of range being selected */ }
  }

  .time-selector {
    &[data-state-disabled="true"] { /* reduced opacity */ }
  }

  .time-group { /* column container for label + scrollable list */ }
  .time-label { /* "Hora" / "Minuto" heading */ }
  .time-column {
    /* scrollable list container */
    &::-webkit-scrollbar { /* custom scrollbar styling */ }
  }

  .time-item {
    &[data-state-active="true"] { /* highlighted active time */ }
  }
}
```

## Complete Modifier → data-state Mapping

| Component | Old class modifier | New attribute | Applied when |
|---|---|---|---|
| DateInput | `dtp-input--active` | `data-state-active` | Input's field matches `activeField` |
| DateInput | `dtp-input--error` | `data-state-error` | Incomplete value on blur |
| Dropdown | `dtp-dropdown--above` | `data-state-above` | Dropdown opens upward |
| Dropdown | `dtp-dropdown--align-right` | `data-state-align-right` | Dropdown aligns to right edge |
| Day cell | `dtp-day--outside` | `data-state-outside` | Day is not in current month |
| Day cell | `dtp-day--disabled` | `data-state-disabled` | Day is outside min/max range |
| Day cell | `dtp-day--today` | `data-state-today` | Day is today |
| Day cell | `dtp-day--selected-start` | `data-state-selected-start` | Day matches `initial` value |
| Day cell | `dtp-day--selected-end` | `data-state-selected-end` | Day matches `final` value |
| Day cell | `dtp-day--focused` | `data-state-focused` | Day matches `focusedDate` (keyboard nav) |
| Day cell | `dtp-day--in-range` | `data-state-in-range` | Day is between initial and final |
| Day cell | `dtp-day--range-start` | Compound: `[data-state-in-range][data-state-selected-start]` | Range start gets left border-radius (CSS-only, no TSX attr) |
| Day cell | `dtp-day--range-end` | Compound: `[data-state-in-range][data-state-selected-end]` | Range end gets right border-radius (CSS-only, no TSX attr) |
| Day cell | `dtp-day--hover-preview` | `data-state-hover-preview` | Previewing range while hovering/navigating |
| TimeSelector | `dtp-time-selector--disabled` | `data-state-disabled` | No active date selected |
| TimeItem | `dtp-time-item--active` | `data-state-active` | Item matches current hour/minute |

## Class Rename Mapping

All classes drop the `dtp-` prefix. SCSS nesting under `.datetime-period-picker` provides scoping.

| Old class | New class |
|---|---|
| `dtp-wrapper` | `datetime-period-picker` (root scoping class) |
| `dtp-inputs` | `input-group` |
| `dtp-input` | `input` |
| `dtp-inputs-separator` | `separator` |
| `dtp-dropdown` | `dropdown` |
| `dtp-calendar` | `calendar` |
| `dtp-calendar-header` | `calendar-header` |
| `dtp-calendar-nav` | `calendar-nav` |
| `dtp-calendar-title` | `calendar-title` |
| `dtp-calendar-weekdays` | `weekdays` |
| `dtp-calendar-weekday` | `weekday` |
| `dtp-calendar-grid` | `grid` |
| `dtp-day` | `day` |
| `dtp-time-selector` | `time-selector` |
| `dtp-time-group` | `time-group` |
| `dtp-time-label` | `time-label` |
| `dtp-time-column` | `time-column` |
| `dtp-time-item` | `time-item` |

## TSX Changes

### Pattern: Eliminate class-toggling logic

**Before:**
```tsx
const className = [
  'dtp-input',
  isActive ? 'dtp-input--active' : '',
  hasError ? 'dtp-input--error' : '',
].filter(Boolean).join(' ');

return <input className={className} />;
```

**After:**
```tsx
return (
  <input
    className="input"
    data-state-active={isActive || undefined}
    data-state-error={hasError || undefined}
  />
);
```

The `value || undefined` pattern ensures the attribute is removed from the DOM when the value is falsy, rather than being set to `"false"`.

### Calendar getDayClassName → inline data-state attributes

The `getDayClassName` function (most complex class builder, 8 conditional pushes) is eliminated entirely. Each state becomes a data-attribute directly on the JSX element:

```tsx
<div
  className="day"
  role="button"
  data-date={cell.date.toISOString()}
  data-state-outside={!cell.isCurrentMonth || undefined}
  data-state-disabled={isDisabled(cell.date) || undefined}
  data-state-today={isToday(cell.date) || undefined}
  data-state-selected-start={(picker.initial && isSameDay(cell.date, picker.initial)) || undefined}
  data-state-selected-end={(picker.final && isSameDay(cell.date, picker.final)) || undefined}
  data-state-focused={(picker.focusedDate && isSameDay(cell.date, picker.focusedDate)) || undefined}
  data-state-in-range={isInRange(cell.date) || undefined}
  data-state-hover-preview={isHoverPreview || undefined}
>
```

### Files that need TSX changes

| File | Changes |
|---|---|
| `index.tsx` | Import `styles.scss` instead of `styles.css`; rename `dtp-wrapper` class |
| `date-input.tsx` | Remove className builder; add `data-state-active`, `data-state-error`; rename class |
| `dropdown.tsx` | Remove className builder; add `data-state-above`, `data-state-align-right`; rename class |
| `calendar.tsx` | Remove `getDayClassName`; add data-state attrs inline; rename all classes |
| `time-selector.tsx` | Remove className builder; add `data-state-disabled`, `data-state-active`; rename classes |

## Test Updates

Tests that query by CSS class modifiers or check `toHaveClass` for modifiers need updating:

| Test file | Type of change |
|---|---|
| `datetime-period-picker.test.tsx` | Class selectors like `.dtp-day--selected-start` → `.day[data-state-selected-start]`; class name assertions → attribute assertions |
| `time-selector.test.tsx` | `toHaveClass('dtp-time-item--active')` → `toHaveAttribute('data-state-active')` |
| `use-keyboard-navigation.test.tsx` | `.dtp-day[data-focused]` → `.day[data-state-focused]`; element IDs `dtp-day-*` remain (those are IDs, not classes) |

**Note:** The `aria-activedescendant` IDs (`dtp-day-${iso}`) are HTML element IDs, not CSS classes. They remain unchanged since they serve an accessibility purpose and are not part of the styling methodology.

**Note:** The existing `data-focused` attribute on calendar day cells (used for test querying) is replaced by `data-state-focused` — there should not be both `data-focused` and `data-state-focused` on the same element after migration.

## Infrastructure

- **Install:** `sass` as devDependency (Vite auto-detects `.scss` files, no config needed)
- **Delete:** `styles.css` after `styles.scss` is complete and verified
- **No changes to:** `vite.config.ts`, `tsconfig.app.json`, or any other config

## Out of Scope

- Changing CSS custom properties in `src/index.css` (the demo page can keep its own theming)
- Refactoring component logic or behavior
- Changing the component's public API
- Adding CSS Modules or other CSS-in-JS solutions
