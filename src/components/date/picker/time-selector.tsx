// src/components/date/picker/time-selector.tsx
import { useEffect, useRef, useCallback } from 'react';
import { usePicker } from './context';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function TimeSelector() {
  const { date, setTime } = usePicker();
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const currentHours = date ? date.getHours() : 0;
  const currentMinutes = date ? date.getMinutes() : 0;
  const isDisabled = !date;

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
      setTime(hour, currentMinutes);
    },
    [setTime, isDisabled, currentMinutes],
  );

  const handleSelectMinute = useCallback(
    (minute: number) => {
      if (isDisabled) return;
      setTime(currentHours, minute);
    },
    [setTime, isDisabled, currentHours],
  );

  const preventFocusSteal = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const noopKeyDown = useCallback((_e: React.KeyboardEvent) => {
    // Intentionally empty — these items never receive keyboard focus.
  }, []);

  return (
    <div className="time-selector" data-state-disabled={isDisabled || undefined}>
      <div className="time-group">
        <span className="time-label">Hora</span>
        <div
          ref={hoursRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar hora"
        >
          {HOURS.map((h) => (
            <div
              key={h}
              className="time-item"
              data-state-active={h === currentHours || undefined}
              role="option"
              aria-selected={h === currentHours}
              tabIndex={-1}
              onClick={() => handleSelectHour(h)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
            >
              {String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>

      <div className="time-group">
        <span className="time-label">Minuto</span>
        <div
          ref={minutesRef}
          tabIndex={-1}
          className="time-column"
          role="listbox"
          aria-label="Selecionar minuto"
        >
          {MINUTES.map((m) => (
            <div
              key={m}
              className="time-item"
              data-state-active={m === currentMinutes || undefined}
              role="option"
              aria-selected={m === currentMinutes}
              tabIndex={-1}
              onClick={() => handleSelectMinute(m)}
              onMouseDown={preventFocusSteal}
              onKeyDown={noopKeyDown}
            >
              {String(m).padStart(2, '0')}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
