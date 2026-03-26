import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderForKeyNav(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const defaultProps = {
    value: { initial: '2026-03-15', final: '' } as DatePeriod,
    onChange,
    name: 'period',
    ...overrides,
  };

  const result = render(<DateTimePeriodPicker {...defaultProps} />);
  return { ...result, onChange };
}

function ControlledForKeyNav(
  props: Partial<DateTimePeriodPickerProps> & { spy: (e: DatePeriodChangeEvent) => void },
) {
  const { spy, ...rest } = props;
  const [value, setValue] = useState<DatePeriod>(
    (rest.value as DatePeriod) ?? { initial: '2026-03-15', final: '' },
  );

  const handleChange = (e: DatePeriodChangeEvent) => {
    setValue(e.target.value);
    spy(e);
  };

  return (
    <DateTimePeriodPicker
      name="period"
      {...rest}
      value={value}
      onChange={handleChange}
    />
  );
}

function renderControlledForKeyNav(overrides: Partial<DateTimePeriodPickerProps> = {}) {
  const spy = vi.fn();
  const result = render(<ControlledForKeyNav spy={spy} {...overrides} />);
  return { ...result, onChange: spy };
}

/**
 * Helper: open the calendar by clicking the initial input and return it.
 * After click, focusedDate should be initialized to the initial value date.
 */
async function openCalendar() {
  const input = screen.getByLabelText('Data inicial');
  await userEvent.click(input);
  // Verify the calendar is open
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  return input;
}

/**
 * Find a current-month day button by its day number text.
 * Uses `.dtp-day:not(.dtp-day--outside)` to avoid matching outside-month days.
 */
function findCurrentMonthDay(dayNumber: number): HTMLElement {
  const dayText = String(dayNumber);
  const allButtons = screen.getAllByText(dayText);
  const found = allButtons.find(
    (btn) => btn.classList.contains('dtp-day') && !btn.classList.contains('dtp-day--outside'),
  );
  if (!found) throw new Error(`Could not find current-month day button for day ${dayNumber}`);
  return found;
}

describe('useKeyboardNavigation', () => {
  // --- Arrow key navigation ---
  describe('arrow key navigation', () => {
    it('ArrowRight moves focused day forward by 1', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      // focusedDate starts at March 15
      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'ArrowRight' });

      expect(findCurrentMonthDay(16)).toHaveAttribute('data-focused');
      // Day 15 should no longer be focused
      expect(findCurrentMonthDay(15)).not.toHaveAttribute('data-focused');
    });

    it('ArrowLeft moves focused day backward by 1', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'ArrowLeft' });

      expect(findCurrentMonthDay(14)).toHaveAttribute('data-focused');
    });

    it('ArrowDown moves focused day forward by 7 (one week)', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(findCurrentMonthDay(22)).toHaveAttribute('data-focused');
    });

    it('ArrowUp moves focused day backward by 7 (one week)', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(findCurrentMonthDay(8)).toHaveAttribute('data-focused');
    });
  });

  // --- Month navigation ---
  describe('month navigation', () => {
    it('PageDown moves focused day forward by 1 month', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'PageDown' });

      // Should now be April 15, and calendar should show "Abril 2026"
      expect(screen.getByText('Abril 2026')).toBeInTheDocument();
      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');
    });

    it('PageUp moves focused day backward by 1 month', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'PageUp' });

      // Should now be February 15, and calendar should show "Fevereiro 2026"
      expect(screen.getByText('Fevereiro 2026')).toBeInTheDocument();
      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');
    });

    it('ArrowRight crossing month boundary updates calendar view', async () => {
      // Start at March 31 so ArrowRight crosses into April
      renderForKeyNav({
        value: { initial: '2026-03-31', final: '' },
      });
      const input = await openCalendar();

      // Verify we start at day 31 (March has 31 days)
      expect(findCurrentMonthDay(31)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // Should now be April 1, calendar view should update to April
      expect(screen.getByText('Abril 2026')).toBeInTheDocument();
      expect(findCurrentMonthDay(1)).toHaveAttribute('data-focused');
    });
  });

  // --- Home/End ---
  describe('Home/End navigation', () => {
    it('Home moves focus to start of displayed month', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      // focusedDate starts at March 15
      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'Home' });

      // Should move to March 1
      expect(findCurrentMonthDay(1)).toHaveAttribute('data-focused');
    });

    it('End moves focus to end of displayed month', async () => {
      renderForKeyNav();
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      fireEvent.keyDown(input, { key: 'End' });

      // March has 31 days
      expect(findCurrentMonthDay(31)).toHaveAttribute('data-focused');
    });
  });

  // --- Enter key selection ---
  describe('Enter key selection', () => {
    it('Enter selects the focused date', async () => {
      const { onChange } = renderForKeyNav();
      const input = await openCalendar();

      // Move to March 16 first
      fireEvent.keyDown(input, { key: 'ArrowRight' });
      expect(findCurrentMonthDay(16)).toHaveAttribute('data-focused');

      // Press Enter on the input to select the focused date
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.value.initial).toBe('2026-03-16');
    });

    it('Enter on initial auto-advances focus to final input', async () => {
      const { onChange } = renderControlledForKeyNav();
      const input = await openCalendar();

      // Press Enter to select the focused date (March 15)
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalled();

      // After selecting initial, activeField should switch to 'final'
      // and the final input should get focus
      await waitFor(() => {
        const finalInput = screen.getByLabelText('Data final');
        expect(document.activeElement).toBe(finalInput);
      });
    });
  });

  // --- Min/max bounds ---
  describe('min/max bounds', () => {
    it('blocks navigation past min date', async () => {
      renderForKeyNav({
        min: '2026-03-14',
        value: { initial: '2026-03-15', final: '' },
      });
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      // ArrowLeft would go to March 14 — but min is March 14, so 14 is allowed
      fireEvent.keyDown(input, { key: 'ArrowLeft' });
      expect(findCurrentMonthDay(14)).toHaveAttribute('data-focused');

      // ArrowLeft again would go to March 13 — should be blocked by min
      fireEvent.keyDown(input, { key: 'ArrowLeft' });
      // Should stay on 14
      expect(findCurrentMonthDay(14)).toHaveAttribute('data-focused');
    });

    it('blocks navigation past max date', async () => {
      renderForKeyNav({
        max: '2026-03-16',
        value: { initial: '2026-03-15', final: '' },
      });
      const input = await openCalendar();

      expect(findCurrentMonthDay(15)).toHaveAttribute('data-focused');

      // ArrowRight to March 16 — max is 16, so allowed
      fireEvent.keyDown(input, { key: 'ArrowRight' });
      expect(findCurrentMonthDay(16)).toHaveAttribute('data-focused');

      // ArrowRight again would go to March 17 — should be blocked by max
      fireEvent.keyDown(input, { key: 'ArrowRight' });
      // Should stay on 16
      expect(findCurrentMonthDay(16)).toHaveAttribute('data-focused');
    });
  });

  // --- Guard conditions ---
  describe('guard conditions', () => {
    it('does not handle keys when dropdown is closed', async () => {
      renderForKeyNav();
      const input = screen.getByLabelText('Data inicial');

      // Do NOT open the calendar — fire keyboard events directly
      fireEvent.keyDown(input, { key: 'ArrowRight' });

      // No dialog should appear, and there should be no focused day
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.querySelector('.dtp-day[data-focused]')).toBeNull();
    });
  });
});
