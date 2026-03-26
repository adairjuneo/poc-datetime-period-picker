import { useCallback } from 'react';
import {
  isSameDay,
  isAfter,
  isBefore,
  isToday,
} from 'date-fns';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from './constants';

export function Calendar() {
  const picker = usePicker();
  const grid = buildCalendarGrid(picker.viewDate);
  const currentMonth = picker.viewDate.getMonth();
  const currentYear = picker.viewDate.getFullYear();
  const monthLabel = `${MONTHS[currentMonth]} ${currentYear}`;

  const isDisabled = useCallback(
    (date: Date) => {
      if (picker.min && isBefore(date, picker.min)) return true;
      if (picker.max && isAfter(date, picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );

  const isInRange = useCallback(
    (date: Date) => {
      const start = picker.initial;
      const end = picker.final ?? picker.hoveredDate ?? picker.focusedDate;
      if (!start || !end) return false;

      const [rangeStart, rangeEnd] = isBefore(start, end) ? [start, end] : [end, start];
      return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
    },
    [picker.initial, picker.final, picker.hoveredDate, picker.focusedDate],
  );

  const isHoverPreview = useCallback(
    (date: Date) =>
      picker.activeField === 'final' &&
      picker.initial &&
      !picker.final &&
      (picker.hoveredDate || picker.focusedDate) &&
      isInRange(date),
    [picker, isInRange],
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      if (isDisabled(date)) return;
      picker.selectDate(date);
    },
    [picker, isDisabled],
  );

  const handleDayHover = useCallback(
    (date: Date) => {
      if (picker.activeField === 'final' && picker.initial && !picker.final) {
        picker.setHoveredDate(date);
      }
    },
    [picker],
  );

  const handleDayLeave = useCallback(() => {
    picker.setHoveredDate(null);
  }, [picker]);

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(-1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Mês anterior"
        >
          &#8249;
        </button>
        <span className="calendar-title">{monthLabel}</span>
        <button
          type="button"
          className="calendar-nav"
          onClick={() => picker.navigateMonth(1)}
          onMouseDown={(e) => e.preventDefault()}
          tabIndex={-1}
          aria-label="Próximo mês"
        >
          &#8250;
        </button>
      </div>

      <div className="weekdays">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="weekday">
            {day}
          </span>
        ))}
      </div>

      <div className="grid" role="grid">
        {grid.map((cell) => (
          <button
            key={cell.date.toISOString()}
            id={`dtp-day-${cell.date.toISOString()}`}
            type="button"
            className="day"
            data-date={cell.date.toISOString()}
            data-state-outside={!cell.isCurrentMonth || undefined}
            data-state-disabled={isDisabled(cell.date) || undefined}
            data-state-today={isToday(cell.date) || undefined}
            data-state-selected-start={(picker.initial && isSameDay(cell.date, picker.initial)) || undefined}
            data-state-selected-end={(picker.final && isSameDay(cell.date, picker.final)) || undefined}
            data-state-focused={(picker.focusedDate && isSameDay(cell.date, picker.focusedDate)) || undefined}
            data-state-in-range={isInRange(cell.date) || undefined}
            data-state-hover-preview={isHoverPreview(cell.date) || undefined}
            onClick={() => handleDayClick(cell.date)}
            onMouseEnter={() => handleDayHover(cell.date)}
            onMouseLeave={handleDayLeave}
            onMouseDown={(e) => e.preventDefault()}
            tabIndex={-1}
            disabled={isDisabled(cell.date)}
            aria-label={cell.date.toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            aria-selected={
              (picker.initial && isSameDay(cell.date, picker.initial)) ||
              (picker.final && isSameDay(cell.date, picker.final)) ||
              false
            }
          >
            {cell.date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}
