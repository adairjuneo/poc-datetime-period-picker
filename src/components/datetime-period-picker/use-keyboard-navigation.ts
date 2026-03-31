import { useCallback } from 'react';
import moment from 'moment';
import { usePicker } from './context';
import type { KeyboardEventLike } from './types';

export function useKeyboardNavigation() {
  const picker = usePicker();

  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (picker.min && moment(date).isBefore(picker.min)) return false;
      if (picker.max && moment(date).isAfter(picker.max)) return false;
      return true;
    },
    [picker.min, picker.max],
  );

  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      picker.setFocusedDate(newDate);
      if (!moment(newDate).isSame(picker.viewDate, 'month')) {
        picker.setViewDate(moment(newDate).startOf('month').toDate());
      }
    },
    [isWithinBounds, picker.setFocusedDate, picker.viewDate, picker.setViewDate],
  );

  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!picker.isOpen || !picker.focusedDate) return;

      const date = picker.focusedDate;
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
          newDate = moment(picker.viewDate).startOf('month').toDate();
          break;
        case 'End':
          newDate = moment(picker.viewDate).endOf('month').toDate();
          break;
        default:
          return; // Don't preventDefault for unhandled keys
      }

      e.preventDefault();
      if (newDate) {
        moveFocus(newDate);
      }
    },
    [picker.isOpen, picker.focusedDate, picker.viewDate, moveFocus],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEventLike, _field: 'initial' | 'final') => {
      if (!picker.isOpen || !picker.focusedDate) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        picker.selectDate(picker.focusedDate);
        // Auto-advance is handled by selectDate → setActiveField('final') → DateInput useEffect
      }
    },
    [picker.isOpen, picker.focusedDate, picker.selectDate],
  );

  return { handleContainerKeyDown, handleInputKeyDown };
}
