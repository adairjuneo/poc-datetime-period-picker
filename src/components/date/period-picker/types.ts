import type { Variant, CalendarCell, KeyboardEventLike } from '../shared/types';

// Re-export shared types for convenience within this module
export type { Variant, CalendarCell, KeyboardEventLike };

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
