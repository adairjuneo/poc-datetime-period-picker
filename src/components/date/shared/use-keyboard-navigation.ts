import { useCallback } from 'react';
import moment from 'moment';
import type { KeyboardEventLike } from './types';

export type KeyboardNavDeps = {
  isOpen: boolean;
  focusedDate: Date | null;
  viewDate: Date;
  min: Date | null;
  max: Date | null;
  setFocusedDate: (date: Date | null) => void;
  setViewDate: (date: Date) => void;
  navigateMonth: (dir: 1 | -1) => void;
  selectDate: (date: Date) => void;
};

export function useKeyboardNavigation(deps: KeyboardNavDeps) {
  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (deps.min && moment(date).isBefore(deps.min)) return false;
      if (deps.max && moment(date).isAfter(deps.max)) return false;
      return true;
    },
    [deps.min, deps.max],
  );

  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      deps.setFocusedDate(newDate);
      if (!moment(newDate).isSame(deps.viewDate, 'month')) {
        deps.setViewDate(moment(newDate).startOf('month').toDate());
      }
    },
    [isWithinBounds, deps.setFocusedDate, deps.viewDate, deps.setViewDate],
  );

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!deps.isOpen || !deps.focusedDate) return;

      const date = deps.focusedDate;
      let newDate: Date | null = null;

      switch (e.key) {
        case 'ArrowLeft':
          newDate = moment(date).subtract(1, 'days').toDate();
          break;
        case 'ArrowRight':
          newDate = moment(date).add(1, 'days').toDate();
          break;
        case 'ArrowUp':
          newDate = moment(date).subtract(1, 'weeks').toDate();
          break;
        case 'ArrowDown':
          newDate = moment(date).add(1, 'weeks').toDate();
          break;
        case 'PageUp':
          newDate = moment(date).subtract(1, 'months').toDate();
          break;
        case 'PageDown':
          newDate = moment(date).add(1, 'months').toDate();
          break;
        case 'Home':
          newDate = moment(deps.viewDate).startOf('month').toDate();
          break;
        case 'End':
          newDate = moment(deps.viewDate).endOf('month').toDate();
          break;
        default:
          return; // Don't preventDefault for unhandled keys
      }

      e.preventDefault();
      if (newDate) {
        moveFocus(newDate);
      }
    },
    [deps.isOpen, deps.focusedDate, deps.viewDate, moveFocus],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEventLike) => {
      if (!deps.isOpen || !deps.focusedDate) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        deps.selectDate(deps.focusedDate);
      }
    },
    [deps.isOpen, deps.focusedDate, deps.selectDate],
  );

  return { handleContainerKeyDown, handleInputKeyDown };
}
