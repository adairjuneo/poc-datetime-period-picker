import { useRef, useCallback, useEffect } from 'react';
import { PickerProvider, usePicker } from './context';
import { DateInput } from './date-input';
import { Dropdown } from './dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import { useKeyboardNavigation } from './use-keyboard-navigation';
import type { DateTimePeriodPickerProps } from './types';
import './styles.scss';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

function PickerShell({ variant, placeholder }: { variant: 'date' | 'datetime'; placeholder?: string }) {
  const picker = usePicker();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const { handleContainerKeyDown, handleInputKeyDown } = useKeyboardNavigation();

  useEffect(() => {
    picker.setOnInputKeyDown(handleInputKeyDown);
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
    <div ref={wrapperRef} className="dtp-wrapper" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div ref={anchorRef} className="dtp-inputs">
        <DateInput field="initial" placeholder={placeholder} />
        <span className="dtp-inputs-separator">—</span>
        <DateInput field="final" placeholder={placeholder} />
      </div>

      <Dropdown anchorRef={anchorRef}>
        <Calendar />
        {variant === 'datetime' && <TimeSelector />}
      </Dropdown>
    </div>
  );
}

export function DateTimePeriodPicker(props: DateTimePeriodPickerProps) {
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...props}>
      <PickerShell variant={variant} placeholder={props.placeholder} />
    </PickerProvider>
  );
}
