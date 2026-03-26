import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePeriodPicker } from '../index';
import type { DatePeriod, DatePeriodChangeEvent, DateTimePeriodPickerProps } from '../types';

// Mock scrollIntoView since jsdom doesn't support it (needed for TimeSelector)
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPicker(overrides: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const defaultProps = {
    value: { initial: '', final: '' } as DatePeriod,
    onChange,
    name: 'period',
    ...overrides,
  };

  const result = render(<DateTimePeriodPicker {...defaultProps} />);
  return { ...result, onChange };
}

/**
 * A controlled wrapper that updates its own state from onChange,
 * needed for tests that require multiple interactions (e.g., selecting two dates).
 */
function ControlledPicker(props: Partial<DateTimePeriodPickerProps> & { spy: (e: DatePeriodChangeEvent) => void }) {
  const { spy, ...rest } = props;
  const [value, setValue] = useState<DatePeriod>(
    (rest.value as DatePeriod) ?? { initial: '', final: '' },
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

function renderControlled(overrides: Partial<DateTimePeriodPickerProps> = {}) {
  const spy = vi.fn();
  const result = render(<ControlledPicker spy={spy} {...overrides} />);
  return { ...result, onChange: spy };
}

describe('DateTimePeriodPicker', () => {
  // --- Basic rendering ---
  describe('rendering', () => {
    it('renders two inputs', () => {
      renderPicker();
      expect(screen.getByLabelText('Data inicial')).toBeInTheDocument();
      expect(screen.getByLabelText('Data final')).toBeInTheDocument();
    });

    it('renders with DD/MM/AAAA placeholder for date variant', () => {
      renderPicker({ variant: 'date' });
      const inputs = screen.getAllByPlaceholderText('DD/MM/AAAA');
      expect(inputs).toHaveLength(2);
    });

    it('renders with DD/MM/AAAA HH:mm placeholder for datetime variant', () => {
      renderPicker({ variant: 'datetime' });
      const inputs = screen.getAllByPlaceholderText('DD/MM/AAAA HH:mm');
      expect(inputs).toHaveLength(2);
    });

    it('disables inputs when disabled prop is true', () => {
      renderPicker({ disabled: true });
      expect(screen.getByLabelText('Data inicial')).toBeDisabled();
      expect(screen.getByLabelText('Data final')).toBeDisabled();
    });
  });

  // --- Dropdown open/close ---
  describe('dropdown', () => {
    it('opens dropdown on input focus', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dropdown on Escape', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // The dropdown listens for mousedown, not click
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not open dropdown when disabled', async () => {
      renderPicker({ disabled: true });
      fireEvent.focus(screen.getByLabelText('Data inicial'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Period selection via calendar ---
  describe('calendar selection', () => {
    it('calls onChange with initial date on first day click', async () => {
      const { onChange } = renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // The calendar grid may contain multiple buttons with the same day number
      // (days from previous/next month). Use getAllByText and pick from current month.
      const day15Buttons = screen.getAllByText('15');
      // Click the first one that is in the current month (not disabled, not outside)
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.name).toBe('period');
      expect(event.target.value.initial).not.toBe('');
    });

    it('calls onChange with both dates after selecting two days', async () => {
      // Need controlled wrapper so second click sees updated initial date
      const { onChange } = renderControlled();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Select day 10 from current month
      const day10Buttons = screen.getAllByText('10');
      const day10 = day10Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day10Buttons[0];
      await userEvent.click(day10);

      // After first click, activeField switches to 'final' and dropdown stays open
      // Select day 20 from current month
      const day20Buttons = screen.getAllByText('20');
      const day20 = day20Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day20Buttons[0];
      await userEvent.click(day20);

      expect(onChange.mock.calls.length).toBeGreaterThanOrEqual(2);
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value.initial).not.toBe('');
      expect(lastCall.target.value.final).not.toBe('');
    });
  });

  // --- Auto-sort ---
  describe('auto-sort', () => {
    it('swaps dates if final < initial', async () => {
      // Need controlled wrapper so second click sees updated initial date
      const { onChange } = renderControlled();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Select day 20 first (initial)
      const day20Buttons = screen.getAllByText('20');
      const day20 = day20Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day20Buttons[0];
      await userEvent.click(day20);

      // Select day 5 second (final) — should auto-sort
      const day5Buttons = screen.getAllByText('5');
      const day5 = day5Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day5Buttons[0];
      await userEvent.click(day5);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const initial = lastCall.target.value.initial;
      const final = lastCall.target.value.final;

      expect(new Date(initial).getTime()).toBeLessThan(new Date(final).getTime());
    });
  });

  // --- Input typing ---
  describe('input typing', () => {
    it('applies mask while typing', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');
    });

    it('calls onChange when valid date is typed', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(onChange).toHaveBeenCalled();
    });

    it('handles paste with formatted date', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial') as HTMLInputElement;
      await userEvent.click(input);

      // Simulate paste via fireEvent with a mock clipboardData
      fireEvent.paste(input, {
        clipboardData: {
          getData: () => '25/03/2026',
        },
      });

      expect(input).toHaveValue('25/03/2026');
    });
  });

  // --- Min/max validation ---
  describe('min/max validation', () => {
    it('disables days before min date in calendar', async () => {
      // We need to ensure the calendar is showing March 2026
      // Set value to March 2026 so viewDate starts there
      renderPicker({
        min: '2026-03-15',
        value: { initial: '2026-03-20', final: '' },
      });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Day 10 of March should be disabled (before min of 15th)
      const day10Buttons = screen.getAllByText('10');
      const day10 = day10Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day10Buttons[0];
      expect(day10).toBeDisabled();
    });

    it('disables days after max date in calendar', async () => {
      renderPicker({
        max: '2026-03-20',
        value: { initial: '2026-03-15', final: '' },
      });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      // Day 25 of March should be disabled (after max of 20th)
      const day25Buttons = screen.getAllByText('25');
      const day25 = day25Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day25Buttons[0];
      expect(day25).toBeDisabled();
    });

    it('does not call onChange when typing a date before min', async () => {
      const { onChange } = renderPicker({
        min: '2026-03-15',
        value: { initial: '', final: '' },
      });
      const input = screen.getByLabelText('Data inicial');
      await userEvent.click(input);
      await userEvent.type(input, '10032026');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --- Async value ---
  describe('async value', () => {
    it('renders with empty values without errors', () => {
      renderPicker({ value: { initial: '', final: '' } });
      expect(screen.getByLabelText('Data inicial')).toHaveValue('');
      expect(screen.getByLabelText('Data final')).toHaveValue('');
    });

    it('updates inputs when value changes externally', () => {
      const { rerender, onChange } = renderPicker();

      rerender(
        <DateTimePeriodPicker
          name="period"
          value={{ initial: '2026-03-25', final: '2026-03-28' }}
          onChange={onChange}
        />,
      );

      expect(screen.getByLabelText('Data inicial')).toHaveValue('25/03/2026');
      expect(screen.getByLabelText('Data final')).toHaveValue('28/03/2026');
    });
  });

  // --- Calendar navigation ---
  describe('calendar navigation', () => {
    it('navigates to next month', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));

      const nextBtn = screen.getByLabelText('Próximo mês');
      const title = screen.getByText(/\w+ \d{4}/);
      const initialMonth = title.textContent;

      await userEvent.click(nextBtn);

      expect(title.textContent).not.toBe(initialMonth);
    });
  });

  // --- Time selector (datetime) ---
  describe('time selector', () => {
    it('renders time columns for datetime variant', async () => {
      renderPicker({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      expect(screen.getByLabelText('Selecionar hora')).toBeInTheDocument();
      expect(screen.getByLabelText('Selecionar minuto')).toBeInTheDocument();
    });

    it('does not render time columns for date variant', async () => {
      renderPicker({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data inicial'));

      expect(screen.queryByLabelText('Selecionar hora')).not.toBeInTheDocument();
    });
  });

  // --- Dual-focus behavior ---
  describe('dual-focus keyboard navigation', () => {
    it('Tab from initial to final keeps calendar open', async () => {
      renderPicker();
      const initialInput = screen.getByLabelText('Data inicial');
      await userEvent.click(initialInput);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Tab to final input
      await userEvent.tab();
      const finalInput = screen.getByLabelText('Data final');
      expect(document.activeElement).toBe(finalInput);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('input has combobox role and ARIA attributes', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data inicial');
      expect(input).toHaveAttribute('role', 'combobox');
      expect(input).toHaveAttribute('aria-haspopup', 'dialog');
      expect(input).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(input);
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('Tab past final input closes calendar', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data inicial'));
      await userEvent.tab(); // -> final
      await userEvent.tab(); // -> outside component

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
