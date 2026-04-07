# API Parity with Legacy Component — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 new props (`label`, `labelUppercase`, `initialName`, `finalName`, `readOnly`, `undigitable`, `initialRef`, `finalRef`) to `DateTimePeriodPicker` for API parity with the legacy `DatePeriodField` component.

**Architecture:** Types become generic (`DatePeriod<I, F>`) with defaults preserving backward compat. New props flow through context (`readOnly`, `undigitable`, `initialName`, `finalName`, `componentName`) or direct props (`label`, `labelUppercase`, `initialRef`, `finalRef`). Each feature is a self-contained task with its own tests.

**Tech Stack:** React 19, TypeScript 5.9 (strict, `erasableSyntaxOnly: true` — no enums), Vitest, react-imask 7.6.1, SCSS, moment.js

**Spec:** `docs/superpowers/specs/2026-04-07-api-parity-design.md`

**Test command:** `npx vitest run`

**Build command:** `npx tsc --noEmit -p tsconfig.app.json`

---

## File Structure

| File | Responsibility | Change Type |
|------|---------------|-------------|
| `src/components/datetime-period-picker/types.ts` | All type definitions — generic `DatePeriod`, `DatePeriodChangeEvent`, `DateTimePeriodPickerProps`, `PickerContextValue` | Modify |
| `src/components/datetime-period-picker/context.tsx` | State management, `fireChange` with dynamic keys, value parsing, `open()` guard for `readOnly` | Modify |
| `src/components/datetime-period-picker/date-input.tsx` | Input rendering — `name` attr, `readOnly`, `undigitable` handlers, `externalRef` merging, `mergeRefs` utility | Modify |
| `src/components/datetime-period-picker/index.tsx` | Shell — generic function signature, `<label>`, prop forwarding to `PickerShell` and `DateInput` | Modify |
| `src/components/datetime-period-picker/styles.scss` | `.label` styles, `[data-state-read-only]`, `[data-state-undigitable]` cursor styles | Modify |
| `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` | ~14 new integration tests | Modify |

---

### Task 1: Generic Types + Dynamic Keys in Context

Add generics to `DatePeriod`, `DatePeriodChangeEvent`, `DateTimePeriodPickerProps`. Add `initialName`, `finalName`, `componentName`, `readOnly`, `undigitable` to `PickerContextValue`. Update `PickerProvider` to parse values with dynamic keys and build `fireChange` output with dynamic keys. Update `DateTimePeriodPicker` to use generic signature.

**Files:**
- Modify: `src/components/datetime-period-picker/types.ts`
- Modify: `src/components/datetime-period-picker/context.tsx`
- Modify: `src/components/datetime-period-picker/index.tsx`
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

- [ ] **Step 1: Write failing tests for dynamic keys**

Add a new `describe('initialName / finalName')` block in `datetime-period-picker.test.tsx`, after the existing `describe('blur rollback')` block:

```typescript
// --- initialName / finalName ---
describe('initialName / finalName', () => {
  it('input name attributes use custom names', async () => {
    render(
      <DateTimePeriodPicker
        name="periodo"
        initialName="inicio"
        finalName="fim"
        value={{ inicio: '', fim: '' }}
        onChange={() => {}}
      />,
    );

    const initialInput = screen.getByLabelText('Data inicial');
    const finalInput = screen.getByLabelText('Data final');
    expect(initialInput).toHaveAttribute('name', 'periodo.inicio');
    expect(finalInput).toHaveAttribute('name', 'periodo.fim');
  });

  it('default names work without props', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
      />,
    );

    const initialInput = screen.getByLabelText('Data inicial');
    const finalInput = screen.getByLabelText('Data final');
    expect(initialInput).toHaveAttribute('name', 'period.initial');
    expect(finalInput).toHaveAttribute('name', 'period.final');
  });

  it('onChange emits value with custom keys', async () => {
    const spy = vi.fn();

    function Controlled() {
      const [value, setValue] = useState({ inicio: '', fim: '' });
      return (
        <DateTimePeriodPicker
          name="periodo"
          initialName="inicio"
          finalName="fim"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            spy(e);
          }}
        />
      );
    }

    render(<Controlled />);
    await userEvent.click(screen.getByLabelText('Data inicial'));

    const day15Buttons = screen.getAllByText('15');
    const day15 = day15Buttons.find(
      (btn) => !btn.hasAttribute('data-state-outside'),
    ) ?? day15Buttons[0];
    await userEvent.click(day15);

    expect(spy).toHaveBeenCalled();
    const event = spy.mock.calls[0][0];
    expect(event.target.value).toHaveProperty('inicio');
    expect(event.target.value).toHaveProperty('fim');
    expect(event.target.value).not.toHaveProperty('initial');
    expect(event.target.value).not.toHaveProperty('final');
  });

  it('value is read with custom keys', () => {
    render(
      <DateTimePeriodPicker
        name="periodo"
        initialName="inicio"
        finalName="fim"
        value={{ inicio: '2026-03-25', fim: '' }}
        onChange={() => {}}
      />,
    );

    const initialInput = screen.getByLabelText('Data inicial');
    expect(initialInput).toHaveValue('25/03/2026');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: TypeScript compilation errors — `initialName`, `finalName` props don't exist on `DateTimePeriodPickerProps`. The tests will fail.

- [ ] **Step 3: Update types.ts with generics and new context fields**

Replace the full content of `src/components/datetime-period-picker/types.ts` with:

```typescript
export type Variant = "date" | "datetime";

export type DatePeriod<
  I extends string = 'initial',
  F extends string = 'final'
> = Record<I, string> & Record<F, string>;

export type DatePeriodChangeEvent<
  I extends string = 'initial',
  F extends string = 'final'
> = {
  target: {
    name: string;
    value: DatePeriod<I, F>;
  };
};

export type ActiveField = "initial" | "final" | null;

export type DateTimePeriodPickerProps<
  I extends string = 'initial',
  F extends string = 'final'
> = {
  variant?: Variant;
  value: DatePeriod<I, F>;
  onChange: (event: DatePeriodChangeEvent<I, F>) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  name?: string;
  label?: string;
  labelUppercase?: boolean;
  initialName?: I;
  finalName?: F;
  initialRef?: React.RefObject<HTMLInputElement | null>;
  finalRef?: React.RefObject<HTMLInputElement | null>;
};

export type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
};

export type KeyboardEventLike = {
  key: string;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export type InputKeyDownHandler = (e: KeyboardEventLike, field: 'initial' | 'final') => void;

export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  readOnly: boolean;
  undigitable: boolean;
  componentName: string;
  initialName: string;
  finalName: string;
  initial: Date | null;
  final: Date | null;
  viewDate: Date;
  activeField: ActiveField;
  isOpen: boolean;
  hoveredDate: Date | null;
  focusedDate: Date | null;
  setFocusedDate: (date: Date | null) => void;
  onInputKeyDown: InputKeyDownHandler;
  setOnInputKeyDown: (fn: InputKeyDownHandler) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (field: ActiveField, hours: number, minutes: number) => void;
  setActiveField: (field: ActiveField) => void;
  updateFromInput: (field: ActiveField, raw: string) => void;
  clearField: (field: ActiveField) => void;
  setHoveredDate: (date: Date | null) => void;
  open: () => void;
  close: () => void;
};
```

- [ ] **Step 4: Update context.tsx for dynamic keys, readOnly, undigitable**

In `src/components/datetime-period-picker/context.tsx`, apply these changes:

**4a.** Inside `PickerProvider`, after `const disabled = props.disabled ?? false;` (line 32), add:

```typescript
const readOnly = props.readOnly ?? false;
const undigitable = props.undigitable ?? false;
const iName = props.initialName ?? 'initial';
const fName = props.finalName ?? 'final';
const componentName = props.name ?? '';
```

**4b.** Replace the value-parsing block (lines 35-42) with:

```typescript
// Parse props.value ISO strings to Date | null (memoized to preserve referential equality)
const initialIso = (props.value as Record<string, string>)[iName] ?? '';
const finalIso = (props.value as Record<string, string>)[fName] ?? '';
const initial = useMemo(
  () => (initialIso ? moment(initialIso).toDate() : null),
  [initialIso],
);
const final = useMemo(
  () => (finalIso ? moment(finalIso).toDate() : null),
  [finalIso],
);
```

**4c.** Replace the `fireChange` callback (lines 57-75) with:

```typescript
const fireChange = useCallback(
  (newInitial: Date | null, newFinal: Date | null) => {
    let i = newInitial;
    let f = newFinal;
    if (i && f) {
      [i, f] = sortPeriod(i, f);
    }
    props.onChange({
      target: {
        name: componentName,
        value: {
          [iName]: i ? formatToIso(i, variant) : '',
          [fName]: f ? formatToIso(f, variant) : '',
        },
      },
    } as any); // Cast needed: computed property keys lose generic inference
  },
  [props.onChange, componentName, variant, iName, fName],
);
```

**4d.** Replace the `open` callback (lines 169-177) with:

```typescript
const open = useCallback(() => {
  if (!disabled && !readOnly) {
    setIsOpen(true);
    if (initial) setViewDate(initial);
    // Initialize focusedDate based on initial value or today
    const fieldDate = initial ?? new Date();
    setFocusedDate(fieldDate);
  }
}, [disabled, readOnly, initial]);
```

**4e.** In the `value` useMemo (lines 195-246), add the new fields to the returned object. After the `disabled,` line add:

```typescript
readOnly,
undigitable,
componentName,
initialName: iName,
finalName: fName,
```

And add these same five variables to the dependency array.

- [ ] **Step 5: Update index.tsx — generic signature + prop forwarding**

**5a.** Replace the `PickerShell` function signature and its type. Change:

```typescript
function PickerShell({ variant }: { variant: 'date' | 'datetime' }) {
```

to:

```typescript
type PickerShellProps = {
  variant: 'date' | 'datetime';
  label?: string;
  labelUppercase?: boolean;
  initialRef?: React.RefObject<HTMLInputElement | null>;
  finalRef?: React.RefObject<HTMLInputElement | null>;
};

function PickerShell({ variant, label, labelUppercase, initialRef, finalRef }: PickerShellProps) {
```

**5b.** In the `PickerShell` JSX, add the label before the `input-group` div, and pass `externalRef` to `DateInput`. Replace the return statement of `PickerShell`:

```tsx
return (
  <div ref={wrapperRef} className="datetime-period-picker" onBlur={handleBlur} onKeyDown={handleKeyDown}>
    {label && (
      <label
        className="label"
        data-state-label-uppercase={labelUppercase || undefined}
      >
        {label}
      </label>
    )}
    <div ref={anchorRef} className="input-group">
      <DateInput field="initial" externalRef={initialRef} />
      <span className="separator">—</span>
      <DateInput field="final" externalRef={finalRef} />
    </div>

    <Dropdown anchorRef={anchorRef}>
      <Calendar />
      {variant === 'datetime' && <TimeSelector />}
    </Dropdown>
  </div>
);
```

**5c.** Replace the `DateTimePeriodPicker` function with generic signature:

```typescript
export function DateTimePeriodPicker<
  I extends string = 'initial',
  F extends string = 'final'
>(props: DateTimePeriodPickerProps<I, F>) {
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...(props as DateTimePeriodPickerProps)}>
      <PickerShell
        variant={variant}
        label={props.label}
        labelUppercase={props.labelUppercase}
        initialRef={props.initialRef}
        finalRef={props.finalRef}
      />
    </PickerProvider>
  );
}
```

Note: `props as DateTimePeriodPickerProps` (with defaults) is needed because `PickerProvider` doesn't know about the generic params — it accesses values via dynamic keys internally.

- [ ] **Step 6: Update date-input.tsx — name attribute + externalRef**

**6a.** Add the `mergeRefs` utility function before the `DateInput` component:

```typescript
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && typeof ref === 'object') {
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };
}
```

**6b.** Update `DateInputProps` type:

```typescript
type DateInputProps = {
  field: 'initial' | 'final';
  externalRef?: React.RefObject<HTMLInputElement | null>;
};
```

**6c.** Update the function signature:

```typescript
export function DateInput({ field, externalRef }: DateInputProps) {
```

**6d.** Add `name` attribute computation inside `DateInput`, after `const dateValueRef = ...`:

```typescript
const fieldInputName = field === 'initial' ? picker.initialName : picker.finalName;
const inputName = picker.componentName ? `${picker.componentName}.${fieldInputName}` : fieldInputName;
```

**6e.** Update the `<input>` JSX — add `name` and change `ref` to use `mergeRefs`:

```tsx
<input
  ref={mergeRefs(maskRef, externalRef)}
  type="text"
  className="input"
  name={inputName}
  data-state-active={isActive || undefined}
  disabled={picker.disabled}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-haspopup="dialog"
  aria-expanded={picker.isOpen && isActive}
  aria-activedescendant={focusedDateId}
  aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
  data-field={field}
/>
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: All tests pass (existing + 4 new `initialName / finalName` tests).

- [ ] **Step 8: Run type-check**

Run: `npx tsc --noEmit -p tsconfig.app.json`

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/datetime-period-picker/types.ts \
        src/components/datetime-period-picker/context.tsx \
        src/components/datetime-period-picker/index.tsx \
        src/components/datetime-period-picker/date-input.tsx \
        src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "feat: add generic type support and dynamic key names (initialName/finalName)"
```

---

### Task 2: Label + labelUppercase

Add the `label` and `labelUppercase` props to the shell component and corresponding SCSS styles.

**Files:**
- Modify: `src/components/datetime-period-picker/styles.scss`
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Note: The JSX for label rendering was already added in Task 1 Step 5b. This task adds the CSS and tests.

- [ ] **Step 1: Write failing tests for label**

Add a new `describe('label')` block in `datetime-period-picker.test.tsx`, after the `describe('initialName / finalName')` block:

```typescript
// --- Label ---
describe('label', () => {
  it('renders label when prop is provided', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
        label="Período"
      />,
    );

    const label = screen.getByText('Período');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
  });

  it('does not render label when prop is omitted', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByText('Período')).not.toBeInTheDocument();
  });

  it('applies uppercase data attribute when labelUppercase is true', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
        label="Período"
        labelUppercase
      />,
    );

    const label = screen.getByText('Período');
    expect(label).toHaveAttribute('data-state-label-uppercase', 'true');
  });
});
```

- [ ] **Step 2: Run tests to verify they pass (label JSX was added in Task 1)**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: All 3 label tests pass (the label JSX was added in Task 1 Step 5b). If they fail, debug before continuing.

- [ ] **Step 3: Add CSS for label**

In `src/components/datetime-period-picker/styles.scss`, after the `.separator` block (line 21, after the closing `}`), add:

```scss
.label {
  font-size: 14px;
  font-weight: 500;
  color: $text-heading;
  margin-bottom: 4px;

  &[data-state-label-uppercase='true'] {
    text-transform: uppercase;
  }
}
```

- [ ] **Step 4: Run full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`

Expected: All tests pass, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/datetime-period-picker/styles.scss \
        src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "feat: add label and labelUppercase props with SCSS styles"
```

---

### Task 3: readOnly

Add `readOnly` prop — makes inputs read-only and prevents dropdown from opening.

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx`
- Modify: `src/components/datetime-period-picker/styles.scss`
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Note: The `readOnly` field on `PickerContextValue`, the guard in `open()`, and the context propagation were already added in Task 1. This task adds `DateInput` changes, CSS, and tests.

- [ ] **Step 1: Write failing tests for readOnly**

Add a new `describe('readOnly')` block in `datetime-period-picker.test.tsx`, after the `describe('label')` block:

```typescript
// --- readOnly ---
describe('readOnly', () => {
  it('inputs have readOnly attribute', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
        readOnly
      />,
    );

    expect(screen.getByLabelText('Data inicial')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Data final')).toHaveAttribute('readonly');
  });

  it('prevents dropdown from opening', async () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '2026-03-25', final: '' }}
        onChange={() => {}}
        readOnly
      />,
    );

    await userEvent.click(screen.getByLabelText('Data inicial'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays existing value', () => {
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '2026-03-25', final: '2026-03-28' }}
        onChange={() => {}}
        readOnly
      />,
    );

    expect(screen.getByLabelText('Data inicial')).toHaveValue('25/03/2026');
    expect(screen.getByLabelText('Data final')).toHaveValue('28/03/2026');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: At least the `readOnly attribute` test fails — the `<input>` doesn't have `readOnly` yet.

- [ ] **Step 3: Add readOnly support to DateInput**

In `src/components/datetime-period-picker/date-input.tsx`, update the `<input>` JSX to add `readOnly` and `data-state-read-only`:

```tsx
<input
  ref={mergeRefs(maskRef, externalRef)}
  type="text"
  className="input"
  name={inputName}
  data-state-active={isActive || undefined}
  data-state-read-only={picker.readOnly || undefined}
  disabled={picker.disabled}
  readOnly={picker.readOnly}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-haspopup="dialog"
  aria-expanded={picker.isOpen && isActive}
  aria-activedescendant={focusedDateId}
  aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
  data-field={field}
/>
```

- [ ] **Step 4: Add CSS for readOnly**

In `src/components/datetime-period-picker/styles.scss`, inside the `.input` block (after the `&:disabled` block, around line 44), add:

```scss
&[data-state-read-only='true'] {
  cursor: default;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: All tests pass including the 3 new readOnly tests.

- [ ] **Step 6: Run full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`

Expected: All tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx \
        src/components/datetime-period-picker/styles.scss \
        src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "feat: add readOnly prop to prevent input editing and dropdown opening"
```

---

### Task 4: undigitable

Add `undigitable` prop — blocks typing/pasting but allows calendar selection.

**Files:**
- Modify: `src/components/datetime-period-picker/date-input.tsx`
- Modify: `src/components/datetime-period-picker/styles.scss`
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Note: The `undigitable` field on `PickerContextValue` and context propagation were already added in Task 1.

- [ ] **Step 1: Write failing tests for undigitable**

Add a new `describe('undigitable')` block in `datetime-period-picker.test.tsx`, after the `describe('readOnly')` block:

```typescript
// --- undigitable ---
describe('undigitable', () => {
  it('blocks typing in inputs', async () => {
    const onChange = vi.fn();
    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={onChange}
        undigitable
      />,
    );

    const input = screen.getByLabelText('Data inicial');
    await userEvent.click(input);
    await userEvent.type(input, '25032026');

    // onChange should not be called — typing is blocked
    expect(onChange).not.toHaveBeenCalled();
    // Input should still show placeholder
    expect(input).toHaveValue('__/__/____');
  });

  it('allows calendar selection', async () => {
    const spy = vi.fn();

    function Controlled() {
      const [value, setValue] = useState({ initial: '', final: '' });
      return (
        <DateTimePeriodPicker
          name="period"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            spy(e);
          }}
          undigitable
        />
      );
    }

    render(<Controlled />);
    await userEvent.click(screen.getByLabelText('Data inicial'));

    // Calendar should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const day15Buttons = screen.getAllByText('15');
    const day15 = day15Buttons.find(
      (btn) => !btn.hasAttribute('data-state-outside'),
    ) ?? day15Buttons[0];
    await userEvent.click(day15);

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].target.value.initial).not.toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: `blocks typing in inputs` fails — typing still works because `onBeforeInput` handler is not implemented yet.

- [ ] **Step 3: Add undigitable support to DateInput**

In `src/components/datetime-period-picker/date-input.tsx`, add two new handlers before `handleFocus`:

```typescript
const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
  if (picker.undigitable) {
    e.preventDefault();
  }
}, [picker.undigitable]);

const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
  if (picker.undigitable) {
    e.preventDefault();
  }
}, [picker.undigitable]);
```

Then update the `<input>` JSX to add these handlers and the data attribute:

```tsx
<input
  ref={mergeRefs(maskRef, externalRef)}
  type="text"
  className="input"
  name={inputName}
  data-state-active={isActive || undefined}
  data-state-read-only={picker.readOnly || undefined}
  data-state-undigitable={picker.undigitable || undefined}
  disabled={picker.disabled}
  readOnly={picker.readOnly}
  onBeforeInput={handleBeforeInput}
  onPaste={handlePaste}
  onFocus={handleFocus}
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
  role="combobox"
  aria-haspopup="dialog"
  aria-expanded={picker.isOpen && isActive}
  aria-activedescendant={focusedDateId}
  aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
  data-field={field}
/>
```

- [ ] **Step 4: Add CSS for undigitable**

In `src/components/datetime-period-picker/styles.scss`, inside the `.input` block (after the `&[data-state-read-only='true']` block), add:

```scss
&[data-state-undigitable='true'] {
  cursor: pointer;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: All tests pass.

**If `blocks typing in inputs` still fails** (iMask bypasses `onBeforeInput`), apply the fallback: instead of `onBeforeInput`, use `readOnly` on the HTML input when `undigitable` is true. Change the input's `readOnly` attribute to:

```tsx
readOnly={picker.readOnly || picker.undigitable}
```

And remove the `onBeforeInput` handler. The calendar selection still works because it changes value via `setValue` (programmatic), not via user input events.

- [ ] **Step 6: Run full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`

Expected: All tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/datetime-period-picker/date-input.tsx \
        src/components/datetime-period-picker/styles.scss \
        src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "feat: add undigitable prop to block typing while allowing calendar selection"
```

---

### Task 5: initialRef / finalRef

Add external ref forwarding via `initialRef` and `finalRef` props.

**Files:**
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Note: The `mergeRefs` utility, `externalRef` prop on `DateInput`, and the prop forwarding from `DateTimePeriodPicker` → `PickerShell` → `DateInput` were all added in Task 1. This task only adds tests.

- [ ] **Step 1: Write tests for initialRef / finalRef**

Add a new `describe('initialRef / finalRef')` block in `datetime-period-picker.test.tsx`, after the `describe('undigitable')` block:

```typescript
// --- initialRef / finalRef ---
describe('initialRef / finalRef', () => {
  it('initialRef receives the initial input element', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;

    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
        initialRef={ref}
      />,
    );

    const input = screen.getByLabelText('Data inicial');
    expect(ref.current).toBe(input);
  });

  it('finalRef receives the final input element', () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement | null>;

    render(
      <DateTimePeriodPicker
        name="period"
        value={{ initial: '', final: '' }}
        onChange={() => {}}
        finalRef={ref}
      />,
    );

    const input = screen.getByLabelText('Data final');
    expect(ref.current).toBe(input);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

Expected: Both tests pass (ref merging was implemented in Task 1).

- [ ] **Step 3: Run full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`

Expected: All tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "test: add initialRef and finalRef tests"
```

---

### Task 6: Combination Test + Export Cleanup

Add a combination test to verify all props work together. Update the re-exported types to include the generic signatures.

**Files:**
- Modify: `src/components/datetime-period-picker/index.tsx` (export check)
- Test: `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx`

- [ ] **Step 1: Write combination test**

Add a new `describe('combination')` block in `datetime-period-picker.test.tsx`, after the `describe('initialRef / finalRef')` block:

```typescript
// --- Combination ---
describe('combination', () => {
  it('readOnly + label + custom names all work together', () => {
    render(
      <DateTimePeriodPicker
        name="periodo"
        initialName="inicio"
        finalName="fim"
        value={{ inicio: '2026-03-25', fim: '2026-03-28' }}
        onChange={() => {}}
        readOnly
        label="Período de viagem"
        labelUppercase
      />,
    );

    // Label is rendered with uppercase attribute
    const label = screen.getByText('Período de viagem');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('data-state-label-uppercase', 'true');

    // Inputs are readOnly with custom names
    const initialInput = screen.getByLabelText('Data inicial');
    const finalInput = screen.getByLabelText('Data final');
    expect(initialInput).toHaveAttribute('readonly');
    expect(finalInput).toHaveAttribute('readonly');
    expect(initialInput).toHaveAttribute('name', 'periodo.inicio');
    expect(finalInput).toHaveAttribute('name', 'periodo.fim');

    // Values are displayed correctly
    expect(initialInput).toHaveValue('25/03/2026');
    expect(finalInput).toHaveValue('28/03/2026');
  });
});
```

- [ ] **Step 2: Verify exports in index.tsx**

Check that `index.tsx` re-exports the generic types. The existing line should be:

```typescript
export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';
```

This already works because the generics have defaults — consumers can use `DatePeriod` (with defaults) or `DatePeriod<'inicio', 'fim'>` (with custom keys). No change needed.

- [ ] **Step 3: Run full test suite + type-check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`

Expected: All tests pass, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx
git commit -m "test: add combination test for readOnly + label + custom names"
```

---

## Summary

| Task | Feature | Tests Added | Files Modified |
|------|---------|-------------|----------------|
| 1 | Generic types + dynamic keys + ref merging + label JSX | 4 | types.ts, context.tsx, index.tsx, date-input.tsx, test |
| 2 | Label CSS + label tests | 3 | styles.scss, test |
| 3 | readOnly | 3 | date-input.tsx, styles.scss, test |
| 4 | undigitable | 2 | date-input.tsx, styles.scss, test |
| 5 | initialRef / finalRef | 2 | test |
| 6 | Combination test | 1 | test |
| **Total** | | **15** | |
