// src/components/date/period-picker/context.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import moment from "moment";
import { formatToIso, parseDatePtBr, sortPeriod } from "../shared/constants";
import type {
  DateTimePeriodPickerProps,
  DatePeriodChangeEvent,
  PickerContextValue,
  ActiveField,
  Variant,
  InputKeyDownHandler,
} from "./types";

const PickerContext = createContext<PickerContextValue | null>(null);

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx;
}

type PickerProviderProps = DateTimePeriodPickerProps & { children: ReactNode };

export function PickerProvider({ children, ...props }: PickerProviderProps) {
  const variant: Variant = props.variant ?? "date";
  const disabled = props.disabled ?? false;
  const readOnly = props.readOnly ?? false;
  const undigitable = props.undigitable ?? false;
  const iName = props.initialName ?? 'initial';
  const fName = props.finalName ?? 'final';
  const componentName = props.name ?? '';

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
  const min = useMemo(() => (props.min ? moment(props.min).toDate() : null), [props.min]);
  const max = useMemo(() => (props.max ? moment(props.max).toDate() : null), [props.max]);

  // Internal ephemeral state
  const [viewDate, setViewDate] = useState<Date>(() => initial ?? new Date());
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);
  const [onInputKeyDown, setOnInputKeyDownState] = useState<InputKeyDownHandler>(() => () => {});
  const setOnInputKeyDown = useCallback((fn: InputKeyDownHandler) => {
    setOnInputKeyDownState(() => fn);
  }, []);

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
      } as DatePeriodChangeEvent); // Cast needed: computed property keys lose generic inference
    },
    [props.onChange, componentName, variant, iName, fName],
  );

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'months').toDate());
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'years').toDate());
  }, []);

  const selectDate = useCallback(
    (date: Date) => {
      if (disabled) return;

      if (activeField === "initial") {
        // Preserve existing time if datetime variant
        let newDate = date;
        if (variant === "datetime" && initial) {
          newDate = moment(date)
            .hours(initial.getHours())
            .minutes(initial.getMinutes())
            .toDate();
        }
        fireChange(newDate, final);
        setActiveField("final");
      } else if (activeField === "final") {
        let newDate = date;
        if (variant === "datetime" && final) {
          newDate = moment(date)
            .hours(final.getHours())
            .minutes(final.getMinutes())
            .toDate();
        }
        fireChange(initial, newDate);
        setActiveField(null);
        setIsOpen(false);
        setHoveredDate(null);
      }
    },
    [activeField, disabled, variant, initial, final, fireChange],
  );

  const setTimeAction = useCallback(
    (field: ActiveField, hours: number, minutes: number) => {
      if (!field || disabled) return;

      const base = field === "initial" ? initial : final;
      if (!base) return;

      const updated = moment(base).hours(hours).minutes(minutes).toDate();
      if (field === "initial") {
        fireChange(updated, final);
      } else {
        fireChange(initial, updated);
      }
    },
    [disabled, initial, final, fireChange],
  );

  const updateFromInput = useCallback(
    (field: ActiveField, raw: string) => {
      if (!field) return;
      const parsed = parseDatePtBr(raw, variant);
      if (!parsed) return;

      // Check min/max
      if (min && parsed < min) return;
      if (max && parsed > max) return;

      if (field === "initial") {
        fireChange(parsed, final);
      } else {
        fireChange(initial, parsed);
      }
    },
    [variant, min, max, initial, final, fireChange],
  );

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

  const open = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen(true);
      if (initial) setViewDate(initial);
      const fieldDate = initial ?? new Date();
      setFocusedDate(fieldDate);
    }
  }, [disabled, readOnly, initial]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveField(null);
    setHoveredDate(null);
    setFocusedDate(null);
  }, []);

  // Sync focusedDate and viewDate when activeField changes (e.g. user tabs between inputs)

  useEffect(() => {
    if (!isOpen || !activeField) return;
    const date = activeField === 'initial' ? initial : final;
    setFocusedDate(date ?? new Date());
    setViewDate(date ?? new Date());
  }, [isOpen, activeField]);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      initialName: iName,
      finalName: fName,
      initial,
      final,
      viewDate,
      activeField,
      isOpen,
      hoveredDate,
      focusedDate,
      setFocusedDate,
      onInputKeyDown,
      setOnInputKeyDown,
      setViewDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime: setTimeAction,
      setActiveField,
      updateFromInput,
      clearField,
      setHoveredDate,
      open,
      close,
    }),
    [
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      iName,
      fName,
      initial,
      final,
      viewDate,
      activeField,
      isOpen,
      hoveredDate,
      focusedDate,
      onInputKeyDown,
      setOnInputKeyDown,
      navigateMonth,
      navigateYear,
      selectDate,
      setTimeAction,
      updateFromInput,
      clearField,
      open,
      close,
    ],
  );

  return (
    <PickerContext.Provider value={value}>{children}</PickerContext.Provider>
  );
}
