# date-fns → moment.js Migration Design

## Context

The `DateTimePeriodPicker` component currently uses date-fns v4 for all date manipulation (formatting, parsing, comparison, arithmetic). The component needs to be integrated into a production component package that uses moment.js (>= 2.29) as a direct dependency with pt-BR locale configured globally. This migration is a 1:1 library substitution — no feature changes, no API changes.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Internal representation | Keep native `Date` objects | Minimal architectural impact; types.ts unchanged; context/state/props untouched |
| Migration approach | Direct inline substitution | Small scope (5 files, 46 call sites); consistent with production package patterns |
| moment.js usage pattern | `moment(date).operation().toDate()` | Creates/discards temporary Moment objects; inherently safe from mutability bugs |
| `getHours`/`getMinutes` | Replace with native `date.getHours()`/`date.getMinutes()` | Eliminates unnecessary moment dependency in time-selector.tsx |

## Function Mapping

All 23 date-fns functions mapped to their moment.js or native equivalents:

### Formatting & Parsing (constants.ts)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 1 | `format(date, fmt)` | `moment(date).format(fmt)` | Format tokens differ (see below) |
| 2 | `parse(str, fmt, ref)` | `moment(str, fmt, true).toDate()` | `true` enables strict parsing |
| 3 | `isValid(date)` | `moment(date).isValid()` | |

### ISO Parsing (context.tsx)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 4 | `parseISO(str)` | `moment(str).toDate()` | moment parses ISO natively |

### Comparison (calendar.tsx, use-keyboard-navigation.ts, constants.ts)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 5 | `isBefore(a, b)` | `moment(a).isBefore(b)` | |
| 6 | `isAfter(a, b)` | `moment(a).isAfter(b)` | |
| 7 | `isSameDay(a, b)` | `moment(a).isSame(b, 'day')` | |
| 8 | `isSameMonth(a, b)` | `moment(a).isSame(b, 'month')` | |
| 9 | `isToday(date)` | `moment(date).isSame(moment(), 'day')` | |

### Arithmetic (context.tsx, use-keyboard-navigation.ts, constants.ts)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 10 | `addDays(date, n)` | `moment(date).add(n, 'days').toDate()` | |
| 11 | `subDays(date, n)` | `moment(date).subtract(n, 'days').toDate()` | |
| 12 | `addWeeks(date, n)` | `moment(date).add(n, 'weeks').toDate()` | |
| 13 | `subWeeks(date, n)` | `moment(date).subtract(n, 'weeks').toDate()` | |
| 14 | `addMonths(date, n)` | `moment(date).add(n, 'months').toDate()` | |
| 15 | `subMonths(date, n)` | `moment(date).subtract(n, 'months').toDate()` | |
| 16 | `addYears(date, n)` | `moment(date).add(n, 'years').toDate()` | |

### Start/End of Period (constants.ts, use-keyboard-navigation.ts)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 17 | `startOfWeek(date, { weekStartsOn: 0 })` | `moment(date).startOf('week').toDate()` | pt-BR locale sets Sunday as first day |
| 18 | `startOfMonth(date)` | `moment(date).startOf('month').toDate()` | |
| 19 | `endOfMonth(date)` | `moment(date).endOf('month').toDate()` | |

### Time Manipulation (context.tsx)

| # | date-fns | moment.js equivalent | Notes |
|---|---|---|---|
| 20 | `setHours(date, h)` | `moment(date).hours(h).toDate()` | Chain with setMinutes when both change |
| 21 | `setMinutes(date, m)` | `moment(date).minutes(m).toDate()` | Chain: `moment(date).hours(h).minutes(m).toDate()` |

### Time Reading — Replaced with Native JS (time-selector.tsx)

| # | date-fns | Native JS equivalent | Notes |
|---|---|---|---|
| 22 | `getHours(date)` | `date.getHours()` | No moment needed |
| 23 | `getMinutes(date)` | `date.getMinutes()` | No moment needed |

## Format Token Changes

date-fns and moment.js use different format token conventions. Four constants in `constants.ts` must change:

| Constant | Current (date-fns) | New (moment.js) |
|---|---|---|
| `DATE_FORMAT_DISPLAY` | `dd/MM/yyyy` | `DD/MM/YYYY` |
| `DATETIME_FORMAT_DISPLAY` | `dd/MM/yyyy HH:mm` | `DD/MM/YYYY HH:mm` |
| `DATE_FORMAT_ISO` | `yyyy-MM-dd` | `YYYY-MM-DD` |
| `DATETIME_FORMAT_ISO` | `yyyy-MM-dd'T'HH:mm` | `YYYY-MM-DD[T]HH:mm` |

Token conversion rules:

| date-fns | moment.js | Meaning |
|---|---|---|
| `dd` | `DD` | Day of month (zero-padded) |
| `MM` | `MM` | Month (identical) |
| `yyyy` | `YYYY` | 4-digit year |
| `HH` | `HH` | 24h hour (identical) |
| `mm` | `mm` | Minutes (identical) |
| `'X'` (single quotes) | `[X]` (square brackets) | Literal escape |

## Mutability Safety

moment.js objects are mutable — `moment(date).add(1, 'day')` modifies the Moment in-place. This is a known footgun.

Our pattern eliminates this risk entirely:

```ts
const next = moment(date).add(1, 'day').toDate();
```

1. `moment(date)` creates a **new** Moment from the native Date
2. `.add(1, 'day')` mutates this temporary Moment (safe — nobody else holds a reference)
3. `.toDate()` extracts a **new** native Date
4. The temporary Moment is discarded (GC)

For chained time operations in `context.tsx`, the current pattern `setMinutes(setHours(date, h), m)` becomes a single chain: `moment(date).hours(h).minutes(m).toDate()` — cleaner and equally safe.

## startOfWeek and Locale

`buildCalendarGrid` uses `startOfWeek(monthStart, { weekStartsOn: 0 })` to force Sunday as the first day of the week.

With moment.js, `startOf('week')` follows the locale configuration. The pt-BR locale in moment.js defines `dow: 0` (Sunday), matching our current behavior.

In the production package, pt-BR locale is configured globally. For the POC environment, we add `import 'moment/locale/pt-br'` in the component entry point or test setup to ensure consistent behavior.

## Impact by File

| File | Changes | Complexity | Import Changes |
|---|---|---|---|
| `constants.ts` | 4 format constants + ~8 call sites | Low | Remove 7 date-fns imports, add `moment` |
| `context.tsx` | ~13 call sites | Low | Remove 5 date-fns imports, add `moment` |
| `calendar.tsx` | ~11 call sites | Low | Remove 4 date-fns imports, add `moment` |
| `time-selector.tsx` | 2 call sites → native JS | Trivial | Remove date-fns import entirely |
| `use-keyboard-navigation.ts` | ~10 call sites | Low | Remove 11 date-fns imports, add `moment` |
| `types.ts` | None | Zero | No changes |
| `package.json` | Swap dependency | Trivial | `date-fns` → `moment` |

**Total production files changed:** 5 source files + package.json
**Total test files changed:** 0 behavioral changes (4 format-string assertions in constants.test.ts updated separately in migration step 6)

## Test Strategy

The 77 existing tests serve as the migration safety net:

1. **73 tests require zero changes** — they test behavior (expected outputs for given inputs), not implementation details
2. **4 tests in constants.test.ts** need format token string updates:
   - `expect(DATE_FORMAT_DISPLAY).toBe('dd/MM/yyyy')` → `'DD/MM/YYYY'`
   - `expect(DATETIME_FORMAT_DISPLAY).toBe('dd/MM/yyyy HH:mm')` → `'DD/MM/YYYY HH:mm'`
   - `expect(DATE_FORMAT_ISO).toBe('yyyy-MM-dd')` → `'YYYY-MM-DD'`
   - `expect(DATETIME_FORMAT_ISO).toBe("yyyy-MM-dd'T'HH:mm")` → `'YYYY-MM-DD[T]HH:mm'`
3. **Validation approach:** Run the full test suite after each file migration. All 77 tests passing = migration correct.

### `parseDatePtBr` — Behavioral Parity Check

The current implementation uses a round-trip check to reject invalid dates (e.g., `30/02`):

```ts
const parsed = parse(raw, fmt, new Date());
if (!isValid(parsed)) return null;
const roundTrip = format(parsed, fmt);
if (roundTrip !== raw) return null;
```

With moment.js strict parsing (`moment(str, fmt, true)`), invalid dates like `30/02` are rejected directly — `moment('30/02/2026', 'DD/MM/YYYY', true).isValid()` returns `false`. **Decision: keep the round-trip check during migration** for extra safety and behavioral parity. It can be simplified in a follow-up if desired.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Mutability bugs | Low | Pattern `moment(date).op().toDate()` eliminates this — no shared Moment references |
| Format token mistakes | Low | Only 4 constants to change; tests validate all formatting paths |
| Locale-dependent `startOf('week')` | Low | pt-BR locale configured globally; explicit `import 'moment/locale/pt-br'` in POC |
| moment.js strict parse differs from date-fns parse | Low | Strict mode + round-trip check cover edge cases; existing tests validate |
| Bundle size increase | Info | moment.js (~70KB gzipped) vs date-fns tree-shaken (~6KB). Irrelevant — production package already bundles moment.js |

## Migration Order

Files should be migrated one at a time, running the full test suite after each:

1. **constants.ts** — Foundation: format tokens, format/parse/validate/grid/sort functions
2. **context.tsx** — Core state: parseISO, addMonths, addYears, setHours, setMinutes
3. **calendar.tsx** — Rendering: isSameDay, isAfter, isBefore, isToday
4. **time-selector.tsx** — Simplification: remove date-fns, use native getHours/getMinutes
5. **use-keyboard-navigation.ts** — Navigation: add/sub days/weeks/months, startOf/endOf, comparisons
6. **constants.test.ts** — Update 4 format token assertions
7. **package.json** — Swap date-fns for moment in dependencies
8. **Verify** — Run full test suite, confirm 77/77 pass, clean up any unused imports
