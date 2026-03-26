import _ from 'lodash';
import moment, { type Moment } from 'moment';
import { ComponentProps, forwardRef, MouseEvent } from 'react';
import Button from '../../../buttons';
import TextContent from '../../../textContent';
import { useDatePeriodFieldContext } from './context';
import { generateCalendarWeeks, TOKEN_ISO_FORMAT } from '../helpers';
import type { InputType } from './types';
import { useCalendarPosition } from '../base/constants';

interface DateFieldCalendarBoxProps extends ComponentProps<'div'> { }

const CalendarBox = forwardRef<HTMLDivElement, DateFieldCalendarBoxProps>((__, ref) => {
  const {
    initialInputId, finalInputId, activeDescendant, calendarBoxOpen, dateContainerRef, 
    calendarDisplayDate, selectedDate, handleChangeNextMonth, handleChangePreviousMonth, 
    handleChangeUpdateDateState, handleChangeActiveDescendant,
  } = useDatePeriodFieldContext();
  const { calendarBoxStyles } = useCalendarPosition(calendarBoxOpen, dateContainerRef);

  const weeks = generateCalendarWeeks(calendarDisplayDate);

  const isInRange = (day: Moment) => selectedDate.inicial && selectedDate.final &&
    day.isAfter(selectedDate.inicial, 'day') && day.isBefore(selectedDate.final, 'day');
  const isSelected = (day: Moment) =>
    (selectedDate.inicial && day.isSame(selectedDate.inicial, 'day')) ||
    (selectedDate.final && day.isSame(selectedDate.final, 'day'));
  const handleOnMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault?.();
  };

  const handleOnClick = (___: MouseEvent<HTMLButtonElement>, daySelected: Moment) => {
    const inputActive = document.activeElement;
    let inputType: InputType | undefined = undefined;
    if (inputActive?.id === initialInputId) inputType = 'initial';
    if (inputActive?.id === finalInputId) inputType = 'final';
    if (!_.isUndefined(inputType)) {
      handleChangeUpdateDateState({ date: daySelected, inputType });
      handleChangeActiveDescendant(daySelected.format(TOKEN_ISO_FORMAT));
    }
  };

  return (
    <div
      ref={ref}
      style={calendarBoxStyles}
      aria-expanded={calendarBoxOpen}
      className="date-calendar-box"
      data-testid="test-date-period-field-calendar-box">
      <div id={initialInputId} className="date-calendar-box-header">
        <Button
          boxShadow={false}
          type="button"
          iconName="arrow_left"
          title="Mês anterior"
          className="previous-month"
          aria-label="Mês anterior"
          onClick={handleChangePreviousMonth}
          onMouseDown={handleOnMouseDown} />
        <div aria-live="polite" className="month-year">
          <TextContent
            aria-label={calendarDisplayDate.format('MMMM YYYY')}
            as="p"
            data-testid="test-date-period-field-calendar-box-month-description">
            {calendarDisplayDate.format('MMMM YYYY')}
          </TextContent>
        </div>
        <Button
          boxShadow={false}
          type="button"
          iconName="arrow_right"
          title="Próximo mês"
          className="next-month"
          aria-label="Próximo mês"
          onClick={handleChangeNextMonth}
          onMouseDown={handleOnMouseDown} />
      </div>
      <div aria-label="Dias da Semana" role="grid" className="date-calendar-box-days-of-week">
        {moment.weekdaysShort(true).map((day, idx) => (
          <span
            title={day}
            role="columnheader" 
            key={`day-of-week-${idx + 1}`}>
            {day}
          </span>
        ))}
      </div>
      <div className="date-calendar-box-grid-of-days">
        <table aria-label="Calendário" role="grid">
          <tbody className="weeks">
            {weeks.map((week, weekIndex) => (
              <tr role="row" key={weekIndex + 1}>
                {week.map((day, dateIndex) => {
                  const idActiveDescendant = day.format(TOKEN_ISO_FORMAT);
                  const isToday = _.isEqual(
                    moment().format(TOKEN_ISO_FORMAT), 
                    day.format(TOKEN_ISO_FORMAT),
                  );
                  const inRange = isInRange(day) ?? false;
                  const hasFocus = _.isEqual(activeDescendant, day.format(TOKEN_ISO_FORMAT));
                  const hasSelected = isSelected(day) ?? false;
                  const isCurrentMonth = day.month() === calendarDisplayDate.month();
                  const descriptionDate = day.format('LL');
                  return (
                    <td role="gridcell" key={dateIndex}>
                      <Button
                        id={idActiveDescendant}
                        type="button"
                        className="day-button"
                        boxShadow={false}
                        tabIndex={-1}
                        title={descriptionDate}
                        aria-label={descriptionDate}
                        aria-selected={hasSelected}
                        data-testid="test-date-period-field-day-button"
                        data-state-is-today={isToday}
                        data-state-has-focus={hasFocus}
                        data-state-is-in-range={inRange}
                        data-state-is-current-month={isCurrentMonth}
                        label={day.date().toString()}
                        onMouseDown={handleOnMouseDown}
                        onClick={(event) => { handleOnClick(event, day); }} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

CalendarBox.displayName = 'DatePeriodFieldCalendarBox';

export { CalendarBox };
export type { DateFieldCalendarBoxProps };
