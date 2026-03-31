import { useCallback } from 'react';
import moment from 'moment';
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
      if (picker.min && moment(date).isBefore(picker.min)) return true;
      if (picker.max && moment(date).isAfter(picker.max)) return true;
      return false;
    },
    [picker.min, picker.max],
  );

  const isInRange = useCallback(
    (date: Date) => {
      const start = picker.initial;
      const end = picker.final ?? picker.hoveredDate ?? picker.focusedDate;
      if (!start || !end) return false;

      const [rangeStart, rangeEnd] = moment(start).isBefore(end) ? [start, end] : [end, start];
      return moment(date).isAfter(rangeStart) && moment(date).isBefore(rangeEnd);
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
            data-state-today={moment(cell.date).isSame(moment(), 'day') || undefined}
            data-state-selected-start={(picker.initial && moment(cell.date).isSame(picker.initial, 'day')) || undefined}
            data-state-selected-end={(picker.final && moment(cell.date).isSame(picker.final, 'day')) || undefined}
            data-state-focused={(picker.focusedDate && moment(cell.date).isSame(picker.focusedDate, 'day')) || undefined}
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
              (picker.initial && moment(cell.date).isSame(picker.initial, 'day')) ||
              (picker.final && moment(cell.date).isSame(picker.final, 'day')) ||
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
