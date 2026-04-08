// src/components/date/picker/calendar.tsx
import { useCallback } from 'react';
import moment from 'moment';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from '../shared/constants';

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

  const handleDayClick = useCallback(
    (date: Date) => {
      if (isDisabled(date)) return;
      picker.selectDate(date);
    },
    [picker, isDisabled],
  );

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
        {grid.map((cell) => {
          const isSelected = picker.date && moment(cell.date).isSame(picker.date, 'day');

          return (
            <button
              key={cell.date.toISOString()}
              id={`dp-day-${cell.date.toISOString()}`}
              type="button"
              className="day"
              data-date={cell.date.toISOString()}
              data-state-outside={!cell.isCurrentMonth || undefined}
              data-state-disabled={isDisabled(cell.date) || undefined}
              data-state-today={moment(cell.date).isSame(moment(), 'day') || undefined}
              data-state-selected={isSelected || undefined}
              data-state-focused={(picker.focusedDate && moment(cell.date).isSame(picker.focusedDate, 'day')) || undefined}
              onClick={() => handleDayClick(cell.date)}
              onMouseDown={(e) => e.preventDefault()}
              tabIndex={-1}
              disabled={isDisabled(cell.date)}
              aria-label={cell.date.toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              aria-selected={isSelected || false}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
