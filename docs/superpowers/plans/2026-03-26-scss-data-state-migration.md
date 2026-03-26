# SCSS + data-state-* Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate DateTimePeriodPicker styling from plain CSS with BEM modifier classes to SCSS with `data-state-*` attributes, matching the production component package conventions.

**Architecture:** Root class `.datetime-period-picker` scopes all styles via SCSS nesting. All conditional class toggling in TSX is replaced by `data-state-*` HTML attributes. SCSS variables replace CSS custom properties for theming.

**Tech Stack:** SCSS (sass), Vite (auto-detects .scss), React 19, Vitest

**Spec:** `docs/superpowers/specs/2026-03-26-scss-data-state-migration-design.md`

---

### Task 1: Install sass and create SCSS files

**Files:**
- Modify: `package.json` (add sass devDependency)
- Create: `src/components/datetime-period-picker/_variables.scss`
- Create: `src/components/datetime-period-picker/styles.scss`
- Delete: `src/components/datetime-period-picker/styles.css`
- Modify: `src/components/datetime-period-picker/index.tsx:9` (import path)

- [ ] **Step 1: Install sass**

Run: `npm install -D sass`

- [ ] **Step 2: Create `_variables.scss`**

Create `src/components/datetime-period-picker/_variables.scss`:

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

- [ ] **Step 3: Create `styles.scss`**

Migrate the entire `styles.css` into `styles.scss` using SCSS nesting under `.datetime-period-picker`, replacing CSS custom properties with SCSS variables from `_variables.scss`, renaming all classes (drop `dtp-` prefix), and converting all `--modifier` selectors to `[data-state-*="true"]` attribute selectors.

Key transformations:
- All selectors nested under `.datetime-period-picker { ... }`
- `var(--accent)` → `$accent`, `var(--bg)` → `$bg`, etc.
- `.dtp-wrapper` → root `.datetime-period-picker` styles directly
- `.dtp-input--active` → `.input { &[data-state-active="true"] { ... } }`
- `.dtp-day:hover:not(.dtp-day--disabled):not(...)` → `.day { &:hover:not([data-state-disabled]):not([data-state-selected-start]):not([data-state-selected-end]) { ... } }`
- `.dtp-day--range-start` → `.day { &[data-state-in-range="true"] { &[data-state-selected-start="true"] { border-radius: 6px 0 0 6px; } } }`
- `.dtp-day--range-end` → `.day { &[data-state-in-range="true"] { &[data-state-selected-end="true"] { border-radius: 0 6px 6px 0; } } }`
- `color-mix(in srgb, var(--accent) 10%, transparent)` → `color-mix(in srgb, $accent 10%, transparent)`
- `.dtp-time-column::-webkit-scrollbar` → `.time-column { &::-webkit-scrollbar { ... } }`

See spec for complete class rename and modifier mapping tables.

- [ ] **Step 4: Update import in `index.tsx`**

Change line 9 in `src/components/datetime-period-picker/index.tsx`:
- From: `import './styles.css';`
- To: `import './styles.scss';`

- [ ] **Step 5: Delete `styles.css`**

Delete `src/components/datetime-period-picker/styles.css`.

- [ ] **Step 6: Verify Vite compiles SCSS**

Run: `npx vite build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate CSS to SCSS with variables and data-state attribute selectors"
```

---

### Task 2: Migrate `index.tsx` classes

**Files:**
- Modify: `src/components/datetime-period-picker/index.tsx:47-50`

- [ ] **Step 1: Rename classes in JSX**

In `src/components/datetime-period-picker/index.tsx`, change:
- Line 47: `className="dtp-wrapper"` → `className="datetime-period-picker"`
- Line 48: `className="dtp-inputs"` → `className="input-group"`
- Line 50: `className="dtp-inputs-separator"` → `className="separator"`

Note: The wrapper class becomes `datetime-period-picker` — this is the root scoping class that the SCSS nests everything under.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 77 tests pass (tests don't query these base classes).

- [ ] **Step 3: Commit**

```bash
git add src/components/datetime-period-picker/index.tsx
git commit -m "refactor: rename index.tsx classes for SCSS scoping"
```

---

### Task 3: Migrate `date-input.tsx` — classes → data-state

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx:88-100`

- [ ] **Step 1: Replace class-toggling with data-state attributes**

In `src/components/datetime-period-picker/date-input.tsx`:

Remove the className builder (lines 88-94):
```tsx
const className = [
  'dtp-input',
  isActive ? 'dtp-input--active' : '',
  hasError ? 'dtp-input--error' : '',
]
  .filter(Boolean)
  .join(' ');
```

Update the `<input>` element (around line 97-116):
- Change `className={className}` → `className="input"`
- Add `data-state-active={isActive || undefined}`
- Add `data-state-error={hasError || undefined}`

The final `<input>` should look like:
```tsx
<input
  ref={inputRef}
  type="text"
  className="input"
  data-state-active={isActive || undefined}
  data-state-error={hasError || undefined}
  value={displayValue}
  placeholder={placeholder ?? defaultPlaceholder}
  maxLength={maxLength}
  disabled={picker.disabled}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onChange={handleChange}
  onPaste={handlePaste}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-haspopup="dialog"
  aria-expanded={picker.isOpen && isActive}
  aria-activedescendant={focusedDateId}
  aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
  data-field={field}
/>
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 77 tests pass (no tests check `dtp-input--active` or `dtp-input--error` classes directly).

- [ ] **Step 3: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx
git commit -m "refactor: replace date-input class toggles with data-state attributes"
```

---

### Task 4: Migrate `dropdown.tsx` — classes → data-state

**Files:**
- Modify: `src/components/datetime-period-picker/dropdown.tsx:75-84`

- [ ] **Step 1: Replace class-toggling with data-state attributes**

In `src/components/datetime-period-picker/dropdown.tsx`:

Remove the className builder (lines 75-81):
```tsx
const className = [
  'dtp-dropdown',
  position.above ? 'dtp-dropdown--above' : '',
  position.alignRight ? 'dtp-dropdown--align-right' : '',
]
  .filter(Boolean)
  .join(' ');
```

Update the `<div>` element (line 84):
- Change `className={className}` → `className="dropdown"`
- Add `data-state-above={position.above || undefined}`
- Add `data-state-align-right={position.alignRight || undefined}`

The final element:
```tsx
<div
  ref={dropdownRef}
  className="dropdown"
  data-state-above={position.above || undefined}
  data-state-align-right={position.alignRight || undefined}
  role="dialog"
  aria-label="Selecionar período"
>
  {children}
</div>
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 77 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/datetime-period-picker/dropdown.tsx
git commit -m "refactor: replace dropdown class toggles with data-state attributes"
```

---

### Task 5: Migrate `calendar.tsx` — classes → data-state

**Files:**
- Modify: `src/components/datetime-period-picker/calendar.tsx:39-141`

This is the most complex migration — the `getDayClassName` function (lines 39-76) with 8 conditional class pushes gets eliminated entirely.

- [ ] **Step 1: Remove `getDayClassName` and replace with inline data-state attributes**

In `src/components/datetime-period-picker/calendar.tsx`:

Delete the entire `getDayClassName` useCallback (lines 39-76).

Extract the hover-preview condition into a helper for readability (place near top of component):
```tsx
const isHoverPreview = useCallback(
  (date: Date) =>
    picker.activeField === 'final' &&
    picker.initial &&
    !picker.final &&
    (picker.hoveredDate || picker.focusedDate) &&
    isInRange(date),
  [picker, isInRange],
);
```

Update **only** the class/data-* attributes on the day `<button>` element (around lines 135-159). **Preserve all other props** (`type`, `disabled`, `aria-*`, `onMouseEnter`, `onMouseLeave`, `onMouseDown`, `onClick`, `tabIndex`). The changes are:
- `className={getDayClassName(cell)}` → `className="day"`
- `data-focused={...}` → removed (replaced by `data-state-focused`)
- Add all `data-state-*` attributes

The final `<button>` should look like:
```tsx
<button
  key={cell.date.toISOString()}
  id={`dtp-day-${cell.date.toISOString()}`}
  type="button"
  className="day"
  data-date={cell.date.toISOString()}
  data-state-outside={!cell.isCurrentMonth || undefined}
  data-state-disabled={isDisabled(cell.date) || undefined}
  data-state-today={isToday(cell.date) || undefined}
  data-state-selected-start={(picker.initial && isSameDay(cell.date, picker.initial)) || undefined}
  data-state-selected-end={(picker.final && isSameDay(cell.date, picker.final)) || undefined}
  data-state-focused={(picker.focusedDate && isSameDay(cell.date, picker.focusedDate)) || undefined}
  data-state-in-range={isInRange(cell.date) || undefined}
  data-state-hover-preview={isHoverPreview(cell.date) || undefined}
  onClick={() => handleDayClick(cell.date)}
  onMouseEnter={() => handleDayHover(cell.date)}
  onMouseLeave={handleDayLeave}
  onMouseDown={(e) => e.preventDefault()}
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

**Important:** Keep the existing `handleDayHover` and `handleDayLeave` callbacks unchanged — they contain hover guard logic. Do NOT inline them.

- [ ] **Step 2: Rename static classes**

In the same file, rename all remaining static className strings:
- `className="dtp-calendar"` → `className="calendar"`
- `className="dtp-calendar-header"` → `className="calendar-header"`
- `className="dtp-calendar-nav"` → `className="calendar-nav"` (2 occurrences)
- `className="dtp-calendar-title"` → `className="calendar-title"`
- `className="dtp-calendar-weekdays"` → `className="weekdays"`
- `className="dtp-calendar-weekday"` → `className="weekday"`
- `className="dtp-calendar-grid"` → `className="grid"`

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: Some tests may fail due to `classList.contains('dtp-day--outside')` and `data-focused` → `data-state-focused` changes. Note failures for Task 7.

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/calendar.tsx
git commit -m "refactor: replace calendar class toggles with data-state attributes"
```

---

### Task 6: Migrate `time-selector.tsx` — classes → data-state

**Files:**
- Modify: `src/components/datetime-period-picker/time-selector.tsx:61-106`

- [ ] **Step 1: Replace class-toggling with data-state attributes**

In `src/components/datetime-period-picker/time-selector.tsx`:

Remove the selectorClass builder (lines 61-64):
```tsx
const selectorClass = [
  'dtp-time-selector',
  isDisabled && 'dtp-time-selector--disabled',
].filter(Boolean).join(' ');
```

Update the root element:
- `className={selectorClass}` → `className="time-selector"`
- Add `data-state-disabled={isDisabled || undefined}`

Update hour items (line 80):
- `` className={`dtp-time-item ${h === currentHours ? 'dtp-time-item--active' : ''}`} `` → `className="time-item"`
- Add `data-state-active={h === currentHours || undefined}`

Update minute items (line 106):
- `` className={`dtp-time-item ${m === currentMinutes ? 'dtp-time-item--active' : ''}`} `` → `className="time-item"`
- Add `data-state-active={m === currentMinutes || undefined}`

Rename remaining static classes:
- `className="dtp-time-group"` → `className="time-group"` (2 occurrences)
- `className="dtp-time-label"` → `className="time-label"` (2 occurrences)
- `className="dtp-time-column"` → `className="time-column"` (2 occurrences)

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: time-selector tests will fail (they check `toHaveClass('dtp-time-item--active')` etc.). Note failures for Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/components/datetime-period-picker/time-selector.tsx
git commit -m "refactor: replace time-selector class toggles with data-state attributes"
```

---

### Task 7: Update all tests

**Files:**
- Modify: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`
- Modify: `src/components/datetime-period-picker/__tests__/time-selector.test.tsx`
- Modify: `src/components/datetime-period-picker/__tests__/use-keyboard-navigation.test.tsx`

- [ ] **Step 1: Update `datetime-period-picker.test.tsx`**

Replace all 7 occurrences of `btn.classList.contains('dtp-day--outside')` with `!btn.hasAttribute('data-state-outside')` (inverted — the test uses `!contains`, so the replacement is `!btn.hasAttribute`):

Lines 131, 149, 157, 179, 185, 245, 260:
- `!btn.classList.contains('dtp-day--outside')` → `!btn.hasAttribute('data-state-outside')`

- [ ] **Step 2: Update `time-selector.test.tsx`**

Lines 94, 110, 197, 202:
- `toHaveClass('dtp-time-item--active')` → `toHaveAttribute('data-state-active')`

Line 136:
- `toHaveClass('dtp-time-selector--disabled')` → `toHaveAttribute('data-state-disabled')`

- [ ] **Step 3: Update `use-keyboard-navigation.test.tsx`**

Line 74 (the `findCurrentMonthDay` helper function):
- `btn.classList.contains('dtp-day')` → `btn.classList.contains('day')`
- `btn.classList.contains('dtp-day--outside')` → `btn.hasAttribute('data-state-outside')`

Lines 88-278 (26 occurrences):
- `toHaveAttribute('data-focused')` → `toHaveAttribute('data-state-focused')` (replaceAll)

Line 293:
- `document.querySelector('.dtp-day[data-focused]')` → `document.querySelector('.day[data-state-focused]')`

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All 77 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/
git commit -m "test: update all test queries for data-state attributes and renamed classes"
```

---

### Task 8: Verify in browser and final cleanup

**Files:**
- Verify: `src/components/datetime-period-picker/styles.css` is deleted
- Verify: No remaining `dtp-` references in component source (excluding `dtp-day-` element IDs)

- [ ] **Step 1: Verify no stale references**

Run: `grep -r "dtp-" src/components/datetime-period-picker/ --include="*.tsx" --include="*.scss" | grep -v "dtp-day-"`

Expected: No matches (or only `dtp-day-${...}` ID patterns in `calendar.tsx` and `date-input.tsx`).

- [ ] **Step 2: Verify build**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 3: Verify dev server**

Run: `npx vite --open` (manual browser check)
Expected: Both picker variants render correctly, all states visible (hover, selection, range, focus, disabled, time picker).

- [ ] **Step 4: Run full test suite one final time**

Run: `npx vitest run`
Expected: All 77 tests pass.

- [ ] **Step 5: Commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final cleanup after SCSS + data-state migration"
```
