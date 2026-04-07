# API Parity with Legacy Component — Design Spec

**Date:** 2026-04-07
**Status:** Self-Reviewed
**Branch:** `release/with_imask`

## Problem

The new `DateTimePeriodPicker` component is functionally complete but lacks several props that the legacy `DatePeriodField` component supports. Consumers migrating from legacy need: custom field names with dynamic value keys, label rendering, read-only/undigitable modes, and external ref access to inputs.

## Scope

New props to add:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | — | Optional label text rendered above the input group |
| `labelUppercase` | `boolean` | `false` | Applies `text-transform: uppercase` to the label |
| `initialName` | `I extends string` | `'initial'` | Key name for the initial date in value/onChange |
| `finalName` | `F extends string` | `'final'` | Key name for the final date in value/onChange |
| `readOnly` | `boolean` | `false` | Makes inputs read-only; prevents dropdown from opening |
| `undigitable` | `boolean` | `false` | Blocks typing/pasting in inputs; calendar-only selection |
| `initialRef` | `RefObject<HTMLInputElement \| null>` | — | External ref merged with internal ref for initial input |
| `finalRef` | `RefObject<HTMLInputElement \| null>` | — | External ref merged with internal ref for final input |

## Design

### 1. Generic Types for Dynamic Keys

`DatePeriod` and `DatePeriodChangeEvent` become generic, parameterized by the initial/final key names. Defaults preserve backward compatibility.

```typescript
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
```

The exported `DateTimePeriodPicker` function uses a generic signature so TypeScript infers `I` and `F` from `initialName`/`finalName`:

```typescript
export function DateTimePeriodPicker<
  I extends string = 'initial',
  F extends string = 'final'
>(props: DateTimePeriodPickerProps<I, F>) { ... }
```

### 2. Dynamic Keys in Context and fireChange

The context (`PickerProvider`) needs to know `initialName` and `finalName` to build the correct value object in `fireChange`. These are passed as props to `PickerProvider` and stored on the context.

**Context changes:**
- Add `initialName: string` and `finalName: string` to `PickerContextValue`
- Add `readOnly: boolean` and `undigitable: boolean` to `PickerContextValue`

**fireChange changes** (`context.tsx:57-75`):
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
        name: props.name ?? '',
        value: {
          [iName]: i ? formatToIso(i, variant) : '',
          [fName]: f ? formatToIso(f, variant) : '',
        },
      },
    } as any); // Cast needed: computed property keys lose generic inference
  },
  [props.onChange, props.name, variant, iName, fName],
);
```

Where `iName = props.initialName ?? 'initial'` and `fName = props.finalName ?? 'final'`.

**Parsing value from props** (`context.tsx:35-42`):

Currently reads `props.value.initial` and `props.value.final`. Must change to use dynamic keys:
```typescript
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

### 3. Input Name Attributes

Each input gets an HTML `name` attribute following the legacy pattern: `${componentName}.${fieldName}`.

In `date-input.tsx`, the input element gets:
```tsx
name={`${picker.componentName}.${fieldInputName}`}
```

Where:
- `picker.componentName` = the `name` prop (e.g., `'periodo'`)
- `fieldInputName` = `picker.initialName` when `field === 'initial'`, `picker.finalName` when `field === 'final'`

The context exposes `componentName: string` (the `name` prop value) and `initialName: string` / `finalName: string`.

### 4. Label

Rendered in `index.tsx` (the `PickerShell` component), above the `input-group` div:

```tsx
{label && (
  <label
    className="label"
    data-state-label-uppercase={labelUppercase || undefined}
  >
    {label}
  </label>
)}
```

The label does **not** use `htmlFor` because neither input has a static `id`. Instead, the `<label>` is a visual-only label. The inputs already have `aria-label` attributes (`"Data inicial"` / `"Data final"`) which provide accessible names. If `htmlFor` were needed in the future, both inputs would need `id` attributes — but since we have two inputs per picker, a single `htmlFor` cannot target both.

CSS added to `styles.scss`:
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

The `label` and `labelUppercase` props are passed through from `DateTimePeriodPicker` to `PickerShell` (not on context — they're only used in the shell's JSX). The `initialRef` and `finalRef` are also passed as props to `PickerShell`, which forwards them to `DateInput`.

`PickerShell`'s props type expands from `{ variant }` to include `label`, `labelUppercase`, `initialRef`, `finalRef`.

### 5. readOnly

When `readOnly` is `true`:

- **Inputs:** receive `readOnly` HTML attribute. Input cursor changes to `default`.
- **Dropdown:** does NOT open. The `open()` function in context checks `readOnly` in addition to `disabled`.
- **Focus behavior:** inputs can receive focus (for accessibility/tab navigation), but no calendar opens.
- **Visual:** inputs get `data-state-read-only="true"` for optional CSS styling. Default styling: `cursor: default`.

**Context changes:**
- `open()` callback (`context.tsx:169-177`): add `if (readOnly) return;` guard alongside existing `disabled` check.
- Add `readOnly: boolean` to `PickerContextValue`.

**DateInput changes:**
- Pass `readOnly={picker.readOnly}` to `<input>`.
- Add `data-state-read-only={picker.readOnly || undefined}` to `<input>`.

### 6. undigitable

When `undigitable` is `true`:

- **Inputs:** block `beforeinput` and `paste` events via `preventDefault()`.
- **Dropdown/calendar:** works normally — user can only select dates via the calendar.
- **Visual:** inputs get `data-state-undigitable="true"`. Default styling: `cursor: pointer` (indicating clicking opens calendar).

**DateInput changes:**
```tsx
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

Both handlers are attached to the `<input>`:
```tsx
<input
  ...
  onBeforeInput={handleBeforeInput}
  onPaste={handlePaste}
/>
```

**Note:** React's `onBeforeInput` fires before iMask's internal `input` event listener, so `preventDefault()` should prevent iMask from processing the keystroke. This must be verified during implementation — if iMask bypasses the prevention, an alternative approach is to set `readOnly` on the input when `undigitable` is true while still allowing calendar-triggered value changes via `setValue`.

### 7. initialRef / finalRef — Merging External Refs

A `mergeRefs` utility function is needed to combine iMask's callback ref with the consumer's RefObject.

**New utility** (inline in `date-input.tsx` or extracted to a small `utils.ts`):
```typescript
function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && typeof ref === 'object') {
        // React 19: RefObject has mutable .current (MutableRefObject is deprecated)
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };
}
```

**Usage in DateInput:**

The external ref comes from the parent component via context or direct prop. Since `DateInput` receives `field` as a prop, the parent (`PickerShell` in `index.tsx`) can pass the correct external ref:

```tsx
<DateInput field="initial" externalRef={initialRef} />
<DateInput field="final" externalRef={finalRef} />
```

Inside `DateInput`:
```tsx
<input
  ref={mergeRefs(maskRef, externalRef)}
  ...
/>
```

The `initialRef`/`finalRef` props are NOT placed on context — they're passed directly from `DateTimePeriodPicker` → `PickerShell` → `DateInput` as props.

## Files Changed

| File | Change |
|------|--------|
| `src/components/datetime-period-picker/types.ts` | Add generics to `DatePeriod`, `DatePeriodChangeEvent`, `DateTimePeriodPickerProps`. Add new props. Add `readOnly`, `undigitable`, `initialName`, `finalName`, `componentName` to `PickerContextValue`. |
| `src/components/datetime-period-picker/context.tsx` | Accept and propagate new props. Change `fireChange` to use dynamic keys. Change value parsing to use dynamic keys. Add `readOnly` guard to `open()`. |
| `src/components/datetime-period-picker/date-input.tsx` | Add `externalRef` prop, merge refs. Add `readOnly`, `undigitable` support. Add `name` attribute. Add `onBeforeInput`/`onPaste` handlers. |
| `src/components/datetime-period-picker/index.tsx` | Render `<label>`. Pass new props through. Generic function signature. Pass `initialRef`/`finalRef` to `DateInput`. |
| `src/components/datetime-period-picker/styles.scss` | Add `.label` styles with `[data-state-label-uppercase]`. Add `[data-state-read-only]` and `[data-state-undigitable]` cursor styles. |
| `src/components/datetime-period-picker/__tests__/datetime-period-picker.test.tsx` | ~15 new tests (see Test Plan). |

## Test Plan

### Label tests (2 tests)

| # | Test | Description |
|---|------|-------------|
| 1 | Label renders when prop is provided | Render with `label="Período"`, verify `<label>` exists with text |
| 2 | labelUppercase applies data attribute | Render with `labelUppercase`, verify `data-state-label-uppercase="true"` |

### readOnly tests (3 tests)

| # | Test | Description |
|---|------|-------------|
| 3 | readOnly inputs have readOnly attribute | Render with `readOnly`, verify inputs have `readOnly` |
| 4 | readOnly prevents dropdown from opening | Render with `readOnly`, focus input, verify no dialog |
| 5 | readOnly displays existing value | Render with `readOnly` and value, verify input shows date |

### undigitable tests (2 tests)

| # | Test | Description |
|---|------|-------------|
| 6 | undigitable blocks typing | Render with `undigitable`, type into input, verify value unchanged |
| 7 | undigitable allows calendar selection | Render with `undigitable`, click calendar day, verify onChange fires |

### initialRef / finalRef tests (2 tests)

| # | Test | Description |
|---|------|-------------|
| 8 | initialRef receives input element | Render with `initialRef`, verify `.current` is the initial `<input>` |
| 9 | finalRef receives input element | Render with `finalRef`, verify `.current` is the final `<input>` |

### initialName / finalName tests (4 tests)

| # | Test | Description |
|---|------|-------------|
| 10 | Input name attributes use custom names | Render with `name="periodo"`, `initialName="inicio"`, `finalName="fim"`, verify input `name` is `periodo.inicio` / `periodo.fim` |
| 11 | onChange emits value with custom keys | Render with custom names, select date, verify `onChange` value has keys `inicio` / `fim` |
| 12 | Default names work without props | Render without `initialName`/`finalName`, verify input names use `initial`/`final` |
| 13 | Value is read with custom keys | Render with `initialName="inicio"`, `value={ inicio: '2026-03-25', fim: '' }`, verify input shows date |

### Combination test (1 test)

| # | Test | Description |
|---|------|-------------|
| 14 | readOnly + label + custom names | Render with all props combined, verify label, readOnly, and custom names all work together |
