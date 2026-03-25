import { useCallback, useRef } from 'react';
import {
  isSameDay,
  isAfter,
  isBefore,
  isToday,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { usePicker } from './context';
import { DAYS_OF_WEEK, MONTHS, buildCalendarGrid } from './constants';

export function Calendar() {
  const picker = usePicker();
  const gridRef = useRef<HTMLDivElement>(null);
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
      const end = picker.final ?? picker.hoveredDate;
      if (!start || !end) return false;

      const [rangeStart, rangeEnd] = isBefore(start, end) ? [start, end] : [end, start];
      return isAfter(date, rangeStart) && isBefore(date, rangeEnd);
    },
    [picker.initial, picker.final, picker.hoveredDate],
  );

  const getDayClassName = useCallback(
    (cell: (typeof grid)[number]) => {
      const classes = ['dtp-day'];

      if (!cell.isCurrentMonth) classes.push('dtp-day--outside');
      if (isDisabled(cell.date)) classes.push('dtp-day--disabled');
      if (isToday(cell.date)) classes.push('dtp-day--today');

      if (picker.initial && isSameDay(cell.date, picker.initial)) {
        classes.push('dtp-day--selected-start');
      }
      if (picker.final && isSameDay(cell.date, picker.final)) {
        classes.push('dtp-day--selected-end');
      }
      if (isInRange(cell.date)) {
        classes.push('dtp-day--in-range');
      }

      // Hover preview when selecting final date
      if (
        picker.activeField === 'final' &&
        picker.initial &&
        !picker.final &&
        picker.hoveredDate &&
        isInRange(cell.date)
      ) {
        classes.push('dtp-day--hover-preview');
      }

      return classes.join(' ');
    },
    [picker, isDisabled, isInRange],
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

  // Keyboard navigation
  // NOTE: After setViewDate triggers re-render when crossing month boundary,
  // the target button won't exist yet. A pendingFocusDate ref + useEffect
  // would be needed for full cross-month keyboard nav. For now, the view
  // navigates but focus may not follow across months.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, date: Date) => {
      let nextDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          nextDate = subDays(date, 1);
          break;
        case 'ArrowRight':
          nextDate = addDays(date, 1);
          break;
        case 'ArrowUp':
          nextDate = subWeeks(date, 1);
          break;
        case 'ArrowDown':
          nextDate = addWeeks(date, 1);
          break;
        case 'Home':
          nextDate = startOfMonth(picker.viewDate);
          break;
        case 'End':
          nextDate = endOfMonth(picker.viewDate);
          break;
        case 'PageUp':
          e.preventDefault();
          picker.navigateMonth(-1);
          return;
        case 'PageDown':
          e.preventDefault();
          picker.navigateMonth(1);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          handleDayClick(date);
          return;
        case 'Escape':
          picker.close();
          return;
        default:
          return;
      }

      if (nextDate) {
        e.preventDefault();
        const dayStr = nextDate.toISOString();
        const btn = gridRef.current?.querySelector(`[data-date="${dayStr}"]`) as HTMLButtonElement;
        if (btn) {
          btn.focus();
        } else {
          if (nextDate.getMonth() !== picker.viewDate.getMonth()) {
            picker.setViewDate(nextDate);
          }
        }
      }
    },
    [picker, handleDayClick],
  );

  return (
    <div className="dtp-calendar">
      <div className="dtp-calendar-header">
        <button
          type="button"
          className="dtp-calendar-nav"
          onClick={() => picker.navigateMonth(-1)}
          aria-label="Mês anterior"
        >
          &#8249;
        </button>
        <span className="dtp-calendar-title">{monthLabel}</span>
        <button
          type="button"
          className="dtp-calendar-nav"
          onClick={() => picker.navigateMonth(1)}
          aria-label="Próximo mês"
        >
          &#8250;
        </button>
      </div>

      <div className="dtp-calendar-weekdays">
        {DAYS_OF_WEEK.map((day) => (
          <span key={day} className="dtp-calendar-weekday">
            {day}
          </span>
        ))}
      </div>

      <div ref={gridRef} className="dtp-calendar-grid" role="grid">
        {grid.map((cell) => (
          <button
            key={cell.date.toISOString()}
            type="button"
            className={getDayClassName(cell)}
            data-date={cell.date.toISOString()}
            onClick={() => handleDayClick(cell.date)}
            onMouseEnter={() => handleDayHover(cell.date)}
            onMouseLeave={handleDayLeave}
            onKeyDown={(e) => handleKeyDown(e, cell.date)}
            tabIndex={isSameDay(cell.date, picker.initial ?? picker.viewDate) ? 0 : -1}
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
