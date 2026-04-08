// src/components/date/picker/index.tsx
import { useRef, useCallback, forwardRef } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from '../shared/dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from '../shared/use-keyboard-navigation';
import type { DateTimePickerProps } from './types';
import './styles.scss';

export type { DateChangeEvent, DateTimePickerProps } from './types';

type PickerShellProps = {
  variant: 'date' | 'datetime';
  label?: string;
  labelUppercase?: boolean;
  inputRef: React.Ref<HTMLInputElement>;
};

function PickerShell({ variant, label, labelUppercase, inputRef }: PickerShellProps) {
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

  // Close dropdown when focus leaves the entire component
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && wrapperRef.current?.contains(relatedTarget)) return;
      picker.close();
    },
    [picker],
  );

  // Handle Escape, Enter (for selecting focused date), and arrow keys
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && picker.isOpen) {
        e.stopPropagation();
        picker.close();
        return;
      }
      // Enter on input selects the focused date
      if (e.key === 'Enter') {
        handleInputKeyDown(e);
        return;
      }
      handleContainerKeyDown(e);
    },
    [picker, handleContainerKeyDown, handleInputKeyDown],
  );

  return (
    <div ref={wrapperRef} className="datetime-picker" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      {label && (
        <label
          className="label"
          data-state-label-uppercase={labelUppercase || undefined}
        >
          {label}
        </label>
      )}
      <div ref={anchorRef} className="input-group">
        <DateInput ref={inputRef} />
      </div>

      <Dropdown anchorRef={anchorRef} isOpen={picker.isOpen} onClose={picker.close}>
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  function DateTimePicker(props, ref) {
    const variant = props.variant ?? 'date';

    return (
      <PickerProvider {...props}>
        <PickerShell
          variant={variant}
          label={props.label}
          labelUppercase={props.labelUppercase}
          inputRef={ref}
        />
      </PickerProvider>
    );
  },
);
