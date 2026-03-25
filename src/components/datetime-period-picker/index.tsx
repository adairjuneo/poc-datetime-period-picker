import { useRef } from 'react';
import { PickerProvider } from './context';
import { DateInput } from './date-input';
import { Dropdown } from './dropdown';
import { Calendar } from './calendar';
import { TimeSelector } from './time-selector';
import type { DateTimePeriodPickerProps } from './types';
import './styles.css';

export type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from './types';

export function DateTimePeriodPicker(props: DateTimePeriodPickerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const variant = props.variant ?? 'date';

  return (
    <PickerProvider {...props}>
      <div className="dtp-wrapper">
        <div ref={anchorRef} className="dtp-inputs">
          <DateInput field="initial" placeholder={props.placeholder} />
          <span className="dtp-inputs-separator">—</span>
          <DateInput field="final" placeholder={props.placeholder} />
        </div>

        <Dropdown anchorRef={anchorRef}>
          <Calendar />
          {variant === 'datetime' && <TimeSelector />}
        </Dropdown>
      </div>
    </PickerProvider>
  );
}
