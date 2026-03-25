# DateTimePeriodPicker Component Design Spec

## Overview

A reusable, primitive React component for selecting a period (start/end) of dates with optional time selection. Built with React 19, TypeScript, date-fns, and native browser APIs. No external UI libraries.

**Architecture:** Context + internal sub-components pattern. A single public component (`DateTimePeriodPicker`) wraps internal sub-components that communicate via React Context. Sub-components are implementation details and are not exported.

**Tech Stack:** React 19, TypeScript 5.9 (strict), date-fns, CSS custom properties, Vitest + React Testing Library.

---

## 1. API Publica & Tipos

### Tipos

```typescript
type Variant = "date" | "datetime";

type DatePeriod = {
  initial: string; // ISO 8601: "2026-03-25" or "2026-03-25T14:30"
  final: string;   // ISO 8601: "2026-03-25" or "2026-03-25T18:00"
};

type DatePeriodChangeEvent = {
  target: {
    name: string;
    value: DatePeriod;
  };
};

type DateTimePeriodPickerProps = {
  variant?: Variant;          // default: "date"
  value: DatePeriod;          // Controlled value
  onChange: (event: DatePeriodChangeEvent) => void; // Native event pattern
  min?: string;               // Min selectable date (ISO 8601)
  max?: string;               // Max selectable date (ISO 8601)
  disabled?: boolean;
  placeholder?: string;       // e.g. "DD/MM/AAAA"
  name?: string;              // For form integration
};
```

### Usage

```tsx
function MyForm() {
  const [form, setForm] = useState({
    period: { initial: "", final: "" },
  });

  function handleChange(e: { target: { name: string; value: unknown } }) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <DateTimePeriodPicker
      name="period"
      variant="datetime"
      value={form.period}
      onChange={handleChange}
      min="2026-01-01"
      max="2026-12-31"
    />
  );
}
```

### Design notes

- Empty strings (`""`) in `value` represent "no date selected" -- handles async initial data gracefully.
- If user selects `final < initial`, the component auto-sorts before calling `onChange`. The consumer always receives a correctly ordered period.
- Internal format is ISO 8601. Display format is always pt-BR (`DD/MM/YYYY` or `DD/MM/YYYY HH:mm`).
- `min`/`max` are optional. Without them, any date is valid. With them, out-of-range dates are disabled in the calendar and rejected on input.

---

## 2. State Management & Context

### Context shape

```typescript
type ActiveField = "initial" | "final" | null;

type PickerContextValue = {
  // Props passed through
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;

  // Period state (parsed from props.value)
  initial: Date | null;
  final: Date | null;

  // Calendar UI state
  viewDate: Date;             // Month/year currently displayed
  activeField: ActiveField;   // Which input is being filled
  isOpen: boolean;            // Dropdown open/closed

  // Actions
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (field: ActiveField, hours: number, minutes: number) => void;
  setActiveField: (field: ActiveField) => void;
  updateFromInput: (field: ActiveField, raw: string) => void;
  open: () => void;
  close: () => void;
};
```

### Data flow

```
Props (value, onChange)
  |
  v
+------------------------------+
|   DateTimePeriodPicker        |  <-- Context Provider
|   (index.tsx)                 |
|                               |
|   Parses value ISO -> Date    |
|   Builds PickerContextValue   |
|                               |
|  +----------+  +-----------+  |
|  |DateInput  |  |DateInput  |  |  <-- Read from Context (initial/final)
|  |(start)    |  |(end)      |  |  <-- Call updateFromInput / setActiveField
|  +----------+  +-----------+  |
|                               |
|  +---------------------------+|
|  | Dropdown                  ||  <-- Controlled by isOpen
|  |  +---------------------+  ||
|  |  | Calendar            |  ||  <-- Reads viewDate, initial, final, min, max
|  |  |                     |  ||  <-- Calls selectDate, navigateMonth/Year
|  |  +---------------------+  ||
|  |  +---------------------+  ||
|  |  | TimeSelector        |  ||  <-- Only renders if variant="datetime"
|  |  | (HH / mm columns)   |  ||  <-- Calls setTime
|  |  +---------------------+  ||
|  +---------------------------+|
+------------------------------+
  |
  |  Any action that changes initial/final:
  |  -> Auto-sort (if final < initial, swap)
  |  -> Format to ISO
  |  -> Call props.onChange({ target: { name, value } })
  |
  v
Consumer receives event with DatePeriod
```

### State rules

- **Source of truth is `props.value`** -- as a controlled component, internal state (`initial`, `final` as `Date`) is derived from `props.value` on each render. No divergent internal copy.
- **Ephemeral state is internal** -- `viewDate`, `activeField`, `isOpen` are UI state that only exists inside the component. Not exposed to the consumer.
- **Sequential flow via `activeField`**:
  1. User focuses start input -> `activeField = "initial"`, dropdown opens
  2. Selects date in calendar -> `selectDate` fills `initial`, `activeField` auto-changes to `"final"`
  3. Selects second date -> `selectDate` fills `final`, dropdown closes, `activeField = null`
  4. If `final < initial` -> auto-swaps before calling `onChange`
- **`viewDate` smart initialization** -- if `initial` has a value, `viewDate` starts at `initial`'s month. Otherwise, starts at current month (`new Date()`).
- **Input typing triggers `updateFromInput`** -- receives raw string from input (e.g. `"25/03/2026"`), validates with `date-fns`, and if valid, calls `onChange`. If invalid, does not propagate.

### State location

| State | Where | Why |
|-------|-------|-----|
| `initial` / `final` (Date) | Derived from `props.value` | Controlled by consumer |
| `viewDate` | Internal `useState` | Calendar navigation is ephemeral |
| `activeField` | Internal `useState` | Focus/sequential flow control |
| `isOpen` | Internal `useState` | Dropdown visibility |

---

## 3. Sub-components & Responsibilities

### File structure

```
src/components/datetime-period-picker/
  index.tsx            # Public component + Provider
  context.tsx          # Context, Provider logic, usePicker hook
  calendar.tsx         # Monthly calendar grid
  date-input.tsx       # Masked pt-BR input
  time-selector.tsx    # Scrollable HH / mm columns
  dropdown.tsx         # Floating container with positioning
  types.ts             # All types
  constants.ts         # Constants, date helpers, formatting
  styles.css           # Component styles
  __tests__/
    datetime-period-picker.test.tsx
```

### File responsibilities

**`index.tsx`** -- Public entry point. Receives props, wraps everything in `PickerProvider`, composes the visual structure: two `DateInput` (start and end) + `Dropdown`. Only export of the component.

**`context.tsx`** -- All state logic. Creates the Context, the `PickerProvider` (containing `useState` hooks, handlers like `selectDate`, `navigateMonth`, `updateFromInput`, etc.), and the `usePicker()` hook for sub-components to consume. The brain of the component.

**`calendar.tsx`** -- Renders the monthly day grid. Header with month/year navigation, day-of-week labels (Dom, Seg, Ter...), 6x7 grid of days, visual highlight of selected range, disabled days (outside min/max), keyboard navigation between days.

**`date-input.tsx`** -- Text input with `DD/MM/AAAA` mask (or `DD/MM/AAAA HH:mm`). Auto-inserts separators as user types, validates in real-time, notifies Context on focus (`setActiveField`), formats `Date -> pt-BR string` for display, parses `pt-BR string -> Date` on typing.

**`time-selector.tsx`** -- Two scrollable columns (hours 00-23, minutes 00-59). Only renders when `variant="datetime"`. Appears below the calendar inside the dropdown. Auto-scrolls to center selected item, calls `setTime` on Context.

**`dropdown.tsx`** -- Floating container wrapping calendar + time selector. Controls visibility via `isOpen`, positions relative to input with viewport edge detection, closes on outside click and Escape key.

**`types.ts`** -- All public and internal types. No logic.

**`constants.ts`** -- Constants and pure utility functions: `DAYS_OF_WEEK`, `MONTHS` (pt-BR), format strings, `formatDatePtBr()`, `parseDatePtBr()`, `isValidDate()`, `buildCalendarGrid()`, `sortPeriod()`.

**`styles.css`** -- Component styles using project CSS custom properties (`--accent`, `--border`, `--bg`, etc.). Scoped via `.dtp-*` class prefix. Functional/minimal styling as specified in TASK.md.

---

## 4. Calendar Logic & Validation

### Grid generation

`buildCalendarGrid(viewDate)` generates a 42-cell matrix (6 rows x 7 columns):

1. Get first day of month (e.g. 01/03/2026 = Sunday)
2. Back up to the previous Sunday (or itself if already Sunday)
3. Fill 42 sequential slots from there
4. Each cell: `{ date: Date, isCurrentMonth: boolean }`

Days outside the current month are visible but visually muted. The grid always has 6 rows to prevent layout jumps when navigating between months. Week starts on **Sunday** (pt-BR standard).

### Month/year navigation

- `<` / `>` arrows in header -> `navigateMonth(-1 | 1)`
- Click on "Março 2026" label -> toggles to month/year selection mode (grid of 12 months or numeric year input)
- Keyboard: holding arrow while header is focused navigates quickly

### Day visual states

| State | Condition | Visual |
|-------|-----------|--------|
| `default` | Normal month day | Standard text |
| `outside` | Day from another month | Muted text |
| `disabled` | Outside min/max range | Muted text, not clickable |
| `today` | Today's date | Subtle highlight border |
| `selected-start` | Equals `initial` | Solid accent background |
| `selected-end` | Equals `final` | Solid accent background |
| `in-range` | Between initial and final | Soft accent background (accent-bg) |
| `hover` | Mouse over day | With `initial` selected, previews range to hovered day |

### Hover range preview

When `activeField = "final"` (start already selected), hovering over calendar days shows a visual preview of the range (initial -> hovered day) with `accent-bg` background. Provides immediate feedback before clicking.

### Date validation

**On input typing (date-input.tsx):**
- Mask accepts only digits, auto-inserts `/` and spaces
- On completing the string (10 chars for date, 16 for datetime), parses with `date-fns/parse`
- If date doesn't exist (30/02, 31/04, etc.), does not propagate to `onChange` -- input shows error state
- If date exists but is outside min/max, also does not propagate

**In calendar (calendar.tsx):**
- Days outside min/max render as `disabled` -- click is ignored
- Invalid dates simply don't exist in the grid (generated from real dates)

**On output (context.tsx):**
- Before calling `props.onChange`, validates one final time and auto-sorts (`sortPeriod`)

### Keyboard navigation in calendar

| Key | Action |
|-----|--------|
| `<-` `->` | Previous / next day |
| `up` `down` | Same position previous / next week |
| `Enter` / `Space` | Select focused day |
| `Tab` | Move focus to next element (time selector or close) |
| `Escape` | Close dropdown |
| `Page Up` / `Page Down` | Previous / next month |
| `Home` / `End` | First / last day of month |

Focus managed via `tabIndex` and `aria-activedescendant` for accessibility.

---

## 5. Time Selector (Scrollable Columns)

Only renders when `variant="datetime"`. Appears below the calendar inside the dropdown.

### Visual structure

```
+---------------------------+
|  Hora          Minuto     |
| +------+    +------+     |
| |  08  |    |  25  |     |
| |  09  |    |  26  |     |
| | [10] |    | [27] |     |  <- active item centered
| |  11  |    |  28  |     |
| |  12  |    |  29  |     |
| +------+    +------+     |
+---------------------------+
```

### Behavior

- Two independent columns: hours (00-23) and minutes (00-59).
- CSS `scroll-snap-type: y mandatory` for snap-to-center behavior.
- Click to select: clicking an item smooth-scrolls to center it and marks it as active.
- Active item: accent background, white text. Adjacent items have gradual opacity.
- Fixed height: column shows ~5 visible items, active one in center.
- Initialization: if field already has a time, column opens scrolled to current value. Otherwise, positions at `00:00`.

### Integration with flow

- Time selector operates on the field indicated by `activeField` ("initial" or "final").
- On changing hour/minute, calls `setTime(activeField, hours, minutes)` on Context.
- Context composes the full date (calendar day + time selector time) and fires `onChange`.
- If no day has been selected in the calendar, time selector is visually disabled.

### Accessibility

- Each column has `role="listbox"`, each item `role="option"` with `aria-selected`.
- Keyboard navigation: `up` / `down` moves between items, `Enter` confirms.
- Accessible labels: `aria-label="Selecionar hora"` / `aria-label="Selecionar minuto"`.

---

## 6. Input Mask & Dropdown Positioning

### Date Input -- pt-BR Mask

**Formats:**
- Variant `date`: `DD/MM/AAAA` (10 characters)
- Variant `datetime`: `DD/MM/AAAA HH:mm` (16 characters)

**Mask behavior:**
- Accepts only digits (filters non 0-9)
- Auto-inserts `/` at positions 2 and 5, space at position 10, `:` at position 13
- Backspace removes normally, including separators
- On paste, strips non-numeric characters and applies mask on the result
- `maxLength` limits character count

**Progressive validation:**
- While typing, input accepts any digit (does not block partial input)
- On completing all characters, parses with `date-fns/parse`
- If valid: propagates to Context -> `onChange`
- If invalid: applies CSS error class (subtle red border), does not propagate

**Controlled value display:**
- When `props.value` changes externally (e.g. async data arrived), input formats `Date -> pt-BR string` and displays
- When input is focused and user is typing, local input value prevails (does not overwrite what user is typing)

### Dropdown -- Responsive Positioning

**Default position:**
- Opens below the inputs, left-aligned
- Fixed width (~300px), independent of input width

**Viewport edge detection:**
1. On open, calculates `getBoundingClientRect()` of inputs
2. Checks available space below: fits -> opens below (default); doesn't fit -> opens above
3. Checks available space to the right: fits -> left-aligned; doesn't fit -> right-aligned

**Implementation:**
- Uses `useEffect` + `getBoundingClientRect()` to calculate position on open
- Recalculates on window `resize` and `scroll` (with throttle)
- Positioning via CSS `position: absolute` relative to a `position: relative` wrapper

**Closing behavior:**
- Click outside -> `mousedown` listener on `document`, checks if target is outside component
- `Escape` key -> `keydown` listener
- Complete selection (both dates filled) -> closes automatically
- Does not close when interacting inside the dropdown

---

## 7. Testing Strategy

Tests with **Vitest** + **React Testing Library**.

### Coverage by category

**1. Basic rendering**
- Renders without crash with minimal props (`value`, `onChange`)
- Renders two inputs (start and end)
- Variant `date`: inputs with `DD/MM/AAAA` placeholder
- Variant `datetime`: inputs with `DD/MM/AAAA HH:mm` placeholder
- Prop `disabled` disables both inputs

**2. Dropdown open/close**
- Focus on start input opens dropdown with calendar
- Click outside closes dropdown
- Escape key closes dropdown
- Dropdown does not open when `disabled`

**3. Period selection via calendar**
- Selecting a day with `activeField="initial"` fills start date
- After selecting start, focus auto-changes to `activeField="final"`
- Selecting second day fills end date and closes dropdown
- `onChange` is called with event in format `{ target: { name, value: { initial, final } } }`

**4. Period auto-sort**
- If `final < initial`, `onChange` receives values swapped (smaller as initial, larger as final)

**5. Input typing**
- Typing `25032026` results in `25/03/2026` displayed in input (auto mask)
- Typing a complete valid date fires `onChange`
- Typing an invalid date (`30/02/2026`) does not fire `onChange`, shows error state
- Pasting a formatted date works correctly

**6. Min/max validation**
- Days outside min/max range are not clickable in calendar
- Typing a date outside range does not fire `onChange`

**7. Calendar navigation**
- Previous/next month buttons change `viewDate`
- Keyboard: arrows move focus between days, `Enter` selects, `Page Up/Down` changes month

**8. Time selector (datetime variant)**
- Hour/minute columns render when `variant="datetime"`
- Clicking a time value updates the value with date + time
- Time selector is disabled if no day was selected

**9. Async value**
- Component renders with `value={ initial: "", final: "" }` without errors
- When `value` changes externally (simulating API data arriving), inputs update correctly

### Test dependencies

- `vitest` (test runner)
- `@testing-library/react` (rendering + queries)
- `@testing-library/user-event` (typing, click, keyboard simulation)
- `@testing-library/jest-dom` (matchers: `toBeVisible`, `toBeDisabled`)
- `jsdom` (vitest environment for DOM simulation)

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Date library | date-fns | Tree-shakeable, immutable, pure functions. Replaces deprecated moment.js |
| Async data | Async initial value | Component handles loading state with empty strings |
| Selection flow | Sequential | Start -> auto-focus end -> close. Clear and predictable |
| Time selection | Scrollable columns | Visual, intuitive, Material UI-like UX |
| Component API | Controlled | `value` + `onChange`, idiomatic React pattern |
| onChange pattern | Native event shape | `{ target: { name, value } }` for form integration |
| Format/locale | ISO 8601 internal, pt-BR fixed | Consumer works with ISO, display always DD/MM/YYYY |
| Architecture | Context + internal sub-components | Balance of organization, clarity, and pragmatism for a POC |
