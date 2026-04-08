// src/components/date/picker/types.ts
import type { Variant } from '../shared/types';

export type { Variant };

export type DateChangeEvent = {
  target: {
    name: string;
    value: string;
  };
};

export type DateTimePickerProps = {
  variant?: Variant;
  value: string;
  onChange: (event: DateChangeEvent) => void;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  label?: string;
  labelUppercase?: boolean;
  min?: string;
  max?: string;
};

export type PickerContextValue = {
  variant: Variant;
  min: Date | null;
  max: Date | null;
  disabled: boolean;
  readOnly: boolean;
  undigitable: boolean;
  componentName: string;
  date: Date | null;
  viewDate: Date;
  isOpen: boolean;
  focusedDate: Date | null;
  setFocusedDate: (date: Date | null) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateYear: (direction: 1 | -1) => void;
  selectDate: (date: Date) => void;
  setTime: (hours: number, minutes: number) => void;
  updateFromInput: (raw: string) => void;
  clearField: () => void;
  open: () => void;
  close: () => void;
};
