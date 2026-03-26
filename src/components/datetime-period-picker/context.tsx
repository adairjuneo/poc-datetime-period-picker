import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from "react";
import { parseISO, addMonths, addYears, setHours, setMinutes } from "date-fns";
import { formatToIso, parseDatePtBr, sortPeriod } from "./constants";
import type {
  DateTimePeriodPickerProps,
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

  // Parse props.value ISO strings to Date | null (memoized to preserve referential equality)
  const initial = useMemo(
    () => (props.value.initial ? parseISO(props.value.initial) : null),
    [props.value.initial],
  );
  const final = useMemo(
    () => (props.value.final ? parseISO(props.value.final) : null),
    [props.value.final],
  );
  const min = useMemo(() => (props.min ? parseISO(props.min) : null), [props.min]);
  const max = useMemo(() => (props.max ? parseISO(props.max) : null), [props.max]);

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
          name: props.name ?? "",
          value: {
            initial: i ? formatToIso(i, variant) : "",
            final: f ? formatToIso(f, variant) : "",
          },
        },
      });
    },
    [props.onChange, props.name, variant],
  );

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => addMonths(prev, direction));
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => addYears(prev, direction));
  }, []);

  const selectDate = useCallback(
    (date: Date) => {
      if (disabled) return;

      if (activeField === "initial") {
        // Preserve existing time if datetime variant
        let newDate = date;
        if (variant === "datetime" && initial) {
          newDate = setMinutes(
            setHours(date, initial.getHours()),
            initial.getMinutes(),
          );
        }
        fireChange(newDate, final);
        setActiveField("final");
      } else if (activeField === "final") {
        let newDate = date;
        if (variant === "datetime" && final) {
          newDate = setMinutes(
            setHours(date, final.getHours()),
            final.getMinutes(),
          );
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

      const updated = setMinutes(setHours(base, hours), minutes);
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

  const open = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      if (initial) setViewDate(initial);
      // Initialize focusedDate based on initial value or today
      const fieldDate = initial ?? new Date();
      setFocusedDate(fieldDate);
    }
  }, [disabled, initial]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveField(null);
    setHoveredDate(null);
    setFocusedDate(null);
  }, []);

  // Sync focusedDate when activeField changes (e.g. user tabs between inputs)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excluding initial/final; only sync on activeField change
  useEffect(() => {
    if (!isOpen || !activeField) return;
    const date = activeField === 'initial' ? initial : final;
    setFocusedDate(date ?? new Date());
  }, [isOpen, activeField]);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
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
      setHoveredDate,
      open,
      close,
    }),
    [
      variant,
      min,
      max,
      disabled,
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
      open,
      close,
    ],
  );

  return (
    <PickerContext.Provider value={value}>{children}</PickerContext.Provider>
  );
}
