// src/components/date/period-picker/index.tsx
import { useRef, useCallback, useEffect } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from '../shared/dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from '../shared/use-keyboard-navigation';
import type { DateTimePeriodPickerProps } from './types';
import './styles.scss';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

type PickerShellProps = {
  variant: 'date' | 'datetime';
  label?: string;
  labelUppercase?: boolean;
  initialRef?: React.RefObject<HTMLInputElement | null>;
  finalRef?: React.RefObject<HTMLInputElement | null>;
};

function PickerShell({ variant, label, labelUppercase, initialRef, finalRef }: PickerShellProps) {
  const picker = usePicker();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation({
    isOpen: picker.isOpen,
    focusedDate: picker.focusedDate,
    viewDate: picker.viewDate,
    min: picker.min,
    max: picker.max,
    setFocusedDate: picker.setFocusedDate,
    setViewDate: picker.setViewDate,
    navigateMonth: picker.navigateMonth,
    selectDate: picker.selectDate,
  });

  useEffect(() => {
    // Bridge: wrap the shared handleInputKeyDown (no field param) so the
    // period-picker's onInputKeyDown signature (with field param) is satisfied.
    picker.setOnInputKeyDown((_e, _field) => {
      handleInputKeyDown(_e);
    });
  }, [handleInputKeyDown, picker.setOnInputKeyDown]);

  // Close dropdown when focus leaves the entire component
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) return;
      picker.close();
    },
    [picker],
  );

  // Handle Escape scoped to this component, then delegate to keyboard navigation hook
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && picker.isOpen) {
        e.stopPropagation();
        picker.close();
        return;
      }
      handleContainerKeyDown(e);
    },
    [picker, handleContainerKeyDown],
  );

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

      <Dropdown anchorRef={anchorRef} isOpen={picker.isOpen} onClose={picker.close} ariaLabel="Selecionar período">
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export function DateTimePeriodPicker<
  I extends string = 'initial',
  F extends string = 'final'
>(props: DateTimePeriodPickerProps<I, F>) {
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...(props as unknown as DateTimePeriodPickerProps)}>
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
