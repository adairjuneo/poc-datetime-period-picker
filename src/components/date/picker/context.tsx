// src/components/date/picker/context.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import moment from "moment";
import { formatToIso, parseDatePtBr } from "../shared/constants";
import type { DateTimePickerProps, PickerContextValue, Variant } from "./types";

const PickerContext = createContext<PickerContextValue | null>(null);

export function usePicker(): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) throw new Error("usePicker must be used within PickerProvider");
  return ctx;
}

type PickerProviderProps = DateTimePickerProps & { children: ReactNode };

export function PickerProvider({ children, ...props }: PickerProviderProps) {
  const variant: Variant = props.variant ?? "date";
  const disabled = props.disabled ?? false;
  const readOnly = props.readOnly ?? false;
  const undigitable = props.undigitable ?? false;
  const componentName = props.name ?? '';

  // Parse props.value ISO string to Date | null
  const date = useMemo(
    () => (props.value ? moment(props.value).toDate() : null),
    [props.value],
  );
  const min = useMemo(() => (props.min ? moment(props.min).toDate() : null), [props.min]);
  const max = useMemo(() => (props.max ? moment(props.max).toDate() : null), [props.max]);

  // Internal ephemeral state
  const [viewDate, setViewDate] = useState<Date>(() => date ?? new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  const fireChange = useCallback(
    (newDate: Date | null) => {
      props.onChange({
        target: {
          name: componentName,
          value: newDate ? formatToIso(newDate, variant) : '',
        },
      });
    },
    [props.onChange, componentName, variant],
  );

  const navigateMonth = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'months').toDate());
  }, []);

  const navigateYear = useCallback((direction: 1 | -1) => {
    setViewDate((prev) => moment(prev).add(direction, 'years').toDate());
  }, []);

  const selectDate = useCallback(
    (selectedDate: Date) => {
      if (disabled) return;

      // Preserve existing time if datetime variant
      let newDate = selectedDate;
      if (variant === "datetime" && date) {
        newDate = moment(selectedDate)
          .hours(date.getHours())
          .minutes(date.getMinutes())
          .toDate();
      }
      fireChange(newDate);

      // date variant: close on select. datetime variant: stay open for time adjustment
      if (variant === 'date') {
        setIsOpen(false);
        setFocusedDate(null);
      }
    },
    [disabled, variant, date, fireChange],
  );

  const setTime = useCallback(
    (hours: number, minutes: number) => {
      if (disabled || !date) return;
      const updated = moment(date).hours(hours).minutes(minutes).toDate();
      fireChange(updated);
    },
    [disabled, date, fireChange],
  );

  const updateFromInput = useCallback(
    (raw: string) => {
      const parsed = parseDatePtBr(raw, variant);
      if (!parsed) return;

      if (min && parsed < min) return;
      if (max && parsed > max) return;

      fireChange(parsed);
    },
    [variant, min, max, fireChange],
  );

  const clearField = useCallback(() => {
    fireChange(null);
    setViewDate(new Date());
    setFocusedDate(new Date());
  }, [fireChange]);

  const open = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsOpen(true);
      if (date) setViewDate(date);
      setFocusedDate(date ?? new Date());
    }
  }, [disabled, readOnly, date]);

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedDate(null);
  }, []);

  const value = useMemo<PickerContextValue>(
    () => ({
      variant,
      min,
      max,
      disabled,
      readOnly,
      undigitable,
      componentName,
      date,
      viewDate,
      isOpen,
      focusedDate,
      setFocusedDate,
      setViewDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime,
      updateFromInput,
      clearField,
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
      date,
      viewDate,
      isOpen,
      focusedDate,
      navigateMonth,
      navigateYear,
      selectDate,
      setTime,
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
