import { useEffect, useRef, useCallback } from 'react';
import { getHours, getMinutes } from 'date-fns';
import { usePicker } from './context';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeSelector() {
  const { activeField, initial, final, setTime } = usePicker();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const activeDate = activeField === 'initial' ? initial : final;
  const currentHours = activeDate ? getHours(activeDate) : 0;
  const currentMinutes = activeDate ? getMinutes(activeDate) : 0;
  const isDisabled = !activeDate;

  // Scroll to active item on mount and when value changes
  const scrollToActive = useCallback((ref: React.RefObject<HTMLDivElement | null>, index: number) => {
    if (!ref.current) return;
    const item = ref.current.children[index] as HTMLElement;
    if (item) {
      item.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (!isDisabled) {
      scrollToActive(hoursRef, currentHours);
      scrollToActive(minutesRef, currentMinutes);
    }
  }, [isDisabled, currentHours, currentMinutes, scrollToActive]);

  const handleSelectHour = useCallback(
    (hour: number) => {
      if (isDisabled) return;
      setTime(activeField, hour, currentMinutes);
    },
    [setTime, activeField, isDisabled, currentMinutes],
  );

  const handleSelectMinute = useCallback(
    (minute: number) => {
      if (isDisabled) return;
      setTime(activeField, currentHours, minute);
    },
    [setTime, activeField, isDisabled, currentHours],
  );

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      type: 'hour' | 'minute',
      value: number,
    ) => {
      const max = type === 'hour' ? 23 : 59;
      let next = value;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          next = value > 0 ? value - 1 : max;
          break;
        case 'ArrowDown':
          e.preventDefault();
          next = value < max ? value + 1 : 0;
          break;
        case 'Enter':
          e.preventDefault();
          if (type === 'hour') handleSelectHour(value);
          else handleSelectMinute(value);
          return;
        default:
          return;
      }

      // Focus next item
      const ref = type === 'hour' ? hoursRef : minutesRef;
      const item = ref.current?.children[next] as HTMLElement;
      if (item) item.focus();
    },
    [handleSelectHour, handleSelectMinute],
  );

  const selectorClass = [
    'dtp-time-selector',
    isDisabled && 'dtp-time-selector--disabled',
  ].filter(Boolean).join(' ');

  return (
    <div className={selectorClass}>
      <div className="dtp-time-group">
        <span className="dtp-time-label">Hora</span>
        <div
          ref={hoursRef}
          className="dtp-time-column"
          role="listbox"
          aria-label="Selecionar hora"
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className={`dtp-time-item ${h === currentHours ? 'dtp-time-item--active' : ''}`}
              role="option"
              aria-selected={h === currentHours}
              tabIndex={h === currentHours ? 0 : -1}
              onClick={() => handleSelectHour(h)}
              onKeyDown={(e) => handleKeyDown(e, 'hour', h)}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="dtp-time-group">
        <span className="dtp-time-label">Minuto</span>
        <div
          ref={minutesRef}
          className="dtp-time-column"
          role="listbox"
          aria-label="Selecionar minuto"
        >
          {MINUTES.map((m) => (
            <div
              key={m}
              className={`dtp-time-item ${m === currentMinutes ? 'dtp-time-item--active' : ''}`}
              role="option"
              aria-selected={m === currentMinutes}
              tabIndex={m === currentMinutes ? 0 : -1}
              onClick={() => handleSelectMinute(m)}
              onKeyDown={(e) => handleKeyDown(e, 'minute', m)}
            >
              {String(m).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
