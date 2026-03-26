export type Variant = "date" | "datetime";

export type DatePeriod = {
  initial: string;
  final: string;
};

export type DatePeriodChangeEvent = {
  target: {
    name: string;
    value: DatePeriod;
  };
};

export type ActiveField = "initial" | "final" | null;

export type DateTimePeriodPickerProps = {
  variant?: Variant;
  value: DatePeriod;
  onChange: (event: DatePeriodChangeEvent) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  name?: string;
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
  setHoveredDate: (date: Date | null) => void;
  open: () => void;
  close: () => void;
};
