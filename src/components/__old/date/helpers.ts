import moment, { type Moment } from 'moment';
import memoize from 'lodash/memoize';
import { OPTIONS_ON_DENIED } from '../../permissionValidations';
import type { PeriodOptions } from './dateperiodfield/types';
import { Keys } from './types';

export const TOKEN_MASK = '00/00/0000';
export const TOKEN_ISO_FORMAT = 'YYYY-MM-DD';
export const TOKEN_PTBR_FORMAT = 'DD/MM/YYYY';
export const options = [
  OPTIONS_ON_DENIED.disabled,
  OPTIONS_ON_DENIED.unvisible,
  OPTIONS_ON_DENIED.readOnly,
  OPTIONS_ON_DENIED.hideContent,
];
export const NAVIGATION_KEYS: string[] = [
  Keys.arrowLeft, Keys.arrowRight, Keys.arrowUp, Keys.arrowDown,
  Keys.pageUp, Keys.pageDown, Keys.home, Keys.end, Keys.escape,
  Keys.enter,
];
export const PERIOD_OPTIONS_LIST: PeriodOptions[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana Atual' },
  { id: 'lastweek', label: 'Última Semana' },
  { id: 'last15', label: 'Últimos 15 dias' },
  { id: 'month', label: 'Mês atual' },
  { id: 'lastmonth', label: 'Último Mês' },
];
export const isWithinBounds = (date: Moment, minDate?: string, maxDate?: string): boolean => {
  if (minDate) {
    const min = moment(minDate, TOKEN_ISO_FORMAT);
    if (date.isBefore(min, 'day')) return false;
  }
  if (maxDate) {
    const max = moment(maxDate, TOKEN_ISO_FORMAT);
    if (date.isAfter(max, 'day')) return false;
  }
  return true;
};
export const generateCalendarWeeks = memoize((monthSelected: Moment): Moment[][] => {
  const startOfCalendar = monthSelected.clone().startOf('month').startOf('week');
  const endOfCalendar = monthSelected.clone().endOf('month').endOf('week');
  const weeks: Moment[][] = [];
  const currentWeek = startOfCalendar.clone();
  while (currentWeek.isSameOrBefore(endOfCalendar, 'day')) {
    const week: Moment[] = [];
    for (let days = 0; days < 7; days++) {
      week.push(currentWeek.clone());
      currentWeek.add(1, 'day');
    }
    weeks.push(week);
  }
  return weeks;
}, (monthSelected: Moment) => monthSelected.format('YYYY-MM'));
