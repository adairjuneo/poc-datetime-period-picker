import { useCallback } from 'react';
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  isBefore,
  isAfter,
  isSameMonth,
} from 'date-fns';
import { usePicker } from './context';
import type { KeyboardEventLike } from './types';

export function useKeyboardNavigation() {
  const picker = usePicker();

  const isWithinBounds = useCallback(
    (date: Date): boolean => {
      if (picker.min && isBefore(date, picker.min)) return false;
      if (picker.max && isAfter(date, picker.max)) return false;
      return true;
    },
    [picker.min, picker.max],
  );

  const moveFocus = useCallback(
    (newDate: Date) => {
      if (!isWithinBounds(newDate)) return;
      picker.setFocusedDate(newDate);
      if (!isSameMonth(newDate, picker.viewDate)) {
        picker.setViewDate(startOfMonth(newDate));
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
          newDate = subDays(date, 1);
          break;
        case 'ArrowRight':
          newDate = addDays(date, 1);
          break;
        case 'ArrowUp':
          newDate = subWeeks(date, 1);
          break;
        case 'ArrowDown':
          newDate = addWeeks(date, 1);
          break;
        case 'PageUp':
          newDate = subMonths(date, 1);
          break;
        case 'PageDown':
          newDate = addMonths(date, 1);
          break;
        case 'Home':
          newDate = startOfMonth(picker.viewDate);
          break;
        case 'End':
          newDate = endOfMonth(picker.viewDate);
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
