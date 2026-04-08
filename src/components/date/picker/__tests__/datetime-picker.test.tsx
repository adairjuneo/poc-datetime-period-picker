// src/components/date/picker/__tests__/datetime-picker.test.tsx
import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateTimePicker } from '../index';
import type { DateTimePickerProps, DateChangeEvent } from '../types';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPicker(overrides: Partial<DateTimePickerProps> = {}) {
  const onChange = vi.fn();
  const defaultProps: DateTimePickerProps = {
    value: '',
    onChange,
    name: 'date',
    ...overrides,
  };

  const result = render(<DateTimePicker {...defaultProps} />);
  return { ...result, onChange };
}

function ControlledPicker(props: Partial<DateTimePickerProps> & { spy: (e: DateChangeEvent) => void }) {
  const { spy, ...rest } = props;
  const [value, setValue] = useState(rest.value ?? '');

  const handleChange = (e: DateChangeEvent) => {
    setValue(e.target.value);
    spy(e);
  };

  return (
    <DateTimePicker
      name="date"
      {...rest}
      value={value}
      onChange={handleChange}
    />
  );
}

function renderControlled(overrides: Partial<DateTimePickerProps> = {}) {
  const spy = vi.fn();
  const result = render(<ControlledPicker spy={spy} {...overrides} />);
  return { ...result, onChange: spy };
}

async function clearInput(input: HTMLElement) {
  await userEvent.tripleClick(input);
  await userEvent.keyboard('{Backspace}');
}

describe('DateTimePicker', () => {
  // --- Basic rendering ---
  describe('rendering', () => {
    it('renders a single input', () => {
      renderPicker();
      expect(screen.getByLabelText('Data')).toBeInTheDocument();
    });

    it('renders with iMask placeholder pattern for date variant', () => {
      renderPicker({ variant: 'date' });
      expect(screen.getByLabelText('Data')).toHaveValue('__/__/____');
    });

    it('renders with iMask placeholder pattern for datetime variant', () => {
      renderPicker({ variant: 'datetime' });
      expect(screen.getByLabelText('Data')).toHaveValue('__/__/____ __:__');
    });

    it('disables input when disabled prop is true', () => {
      renderPicker({ disabled: true });
      expect(screen.getByLabelText('Data')).toBeDisabled();
    });
  });

  // --- Calendar selection ---
  describe('calendar selection', () => {
    it('calls onChange with ISO date on day click', async () => {
      const { onChange } = renderControlled();
      await userEvent.click(screen.getByLabelText('Data'));

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.name).toBe('date');
      expect(event.target.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('date variant closes calendar on select', async () => {
      renderControlled({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('datetime variant keeps calendar open on select', async () => {
      renderControlled({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // --- Typing with iMask ---
  describe('input typing', () => {
    it('applies mask while typing', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');
    });

    it('calls onChange when valid date is typed', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(onChange).toHaveBeenCalled();
    });

    it('does not call onChange for partial date', async () => {
      const { onChange } = renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '250');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // --- Blur rollback ---
  describe('blur rollback', () => {
    it('restores previous date when blur with partial input', async () => {
      renderControlled({ value: '2026-03-25' });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      expect(input).toHaveValue('25/03/2026');

      await clearInput(input);
      await userEvent.type(input, '01');
      await userEvent.click(document.body);

      expect(input).toHaveValue('25/03/2026');
    });

    it('clears to placeholder when blur with partial input and no previous date', async () => {
      renderControlled();

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '15');
      await userEvent.click(document.body);

      expect(input).toHaveValue('__/__/____');
    });

    it('does nothing on blur when input has complete date', async () => {
      renderControlled();

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');
      expect(input).toHaveValue('25/03/2026');

      await userEvent.click(document.body);
      expect(input).toHaveValue('25/03/2026');
    });
  });

  // --- Keyboard navigation ---
  describe('keyboard navigation', () => {
    it('ArrowRight moves focused day forward by 1', async () => {
      renderControlled({ value: '2026-03-15' });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);

      const findDay = (n: number) => {
        const buttons = screen.getAllByText(String(n));
        return buttons.find((btn) => btn.classList.contains('day') && !btn.hasAttribute('data-state-outside'));
      };

      expect(findDay(15)).toHaveAttribute('data-state-focused');

      fireEvent.keyDown(input, { key: 'ArrowRight' });
      expect(findDay(16)).toHaveAttribute('data-state-focused');
    });

    it('Enter selects the focused date', async () => {
      const { onChange } = renderControlled({ value: '2026-03-15' });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);

      fireEvent.keyDown(input, { key: 'ArrowRight' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.calls[0][0];
      expect(event.target.value).toBe('2026-03-16');
    });

    it('Escape closes the calendar', async () => {
      renderPicker();
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Time selector (datetime) ---
  describe('time selector', () => {
    it('renders time columns for datetime variant', async () => {
      renderPicker({ variant: 'datetime' });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.getByLabelText('Selecionar hora')).toBeInTheDocument();
      expect(screen.getByLabelText('Selecionar minuto')).toBeInTheDocument();
    });

    it('does not render time columns for date variant', async () => {
      renderPicker({ variant: 'date' });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.queryByLabelText('Selecionar hora')).not.toBeInTheDocument();
    });
  });

  // --- Clear on empty ---
  describe('clear on empty', () => {
    it('emits onChange with empty string when input is fully cleared', async () => {
      const { onChange } = renderControlled({ value: '2026-03-25' });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await clearInput(input);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value).toBe('');
    });

    it('datetime variant: emits onChange with empty when input is fully cleared', async () => {
      const { onChange } = renderControlled({
        variant: 'datetime',
        value: '2026-03-25T14:30',
      });

      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await clearInput(input);

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.target.value).toBe('');
    });
  });

  // --- Props: label ---
  describe('label', () => {
    it('renders label when prop is provided', () => {
      renderPicker({ label: 'Data de nascimento' });
      const label = screen.getByText('Data de nascimento');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
    });

    it('applies uppercase data attribute when labelUppercase is true', () => {
      renderPicker({ label: 'Data', labelUppercase: true });
      const label = screen.getByText('Data');
      expect(label).toHaveAttribute('data-state-label-uppercase', 'true');
    });
  });

  // --- Props: readOnly ---
  describe('readOnly', () => {
    it('input has readOnly attribute', () => {
      renderPicker({ readOnly: true });
      expect(screen.getByLabelText('Data')).toHaveAttribute('readonly');
    });

    it('prevents dropdown from opening', async () => {
      renderPicker({ readOnly: true, value: '2026-03-25' });
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Props: undigitable ---
  describe('undigitable', () => {
    it('blocks typing in input', async () => {
      const { onChange } = renderPicker({ undigitable: true });
      const input = screen.getByLabelText('Data');
      await userEvent.click(input);
      await userEvent.type(input, '25032026');

      expect(onChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('__/__/____');
    });

    it('allows calendar selection', async () => {
      const { onChange } = renderControlled({ undigitable: true });
      await userEvent.click(screen.getByLabelText('Data'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const day15Buttons = screen.getAllByText('15');
      const day15 = day15Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day15Buttons[0];
      await userEvent.click(day15);

      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0].target.value).not.toBe('');
    });
  });

  // --- Props: disabled ---
  describe('disabled', () => {
    it('does not open dropdown when disabled', async () => {
      renderPicker({ disabled: true });
      fireEvent.focus(screen.getByLabelText('Data'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Props: min/max ---
  describe('min/max', () => {
    it('disables days before min date', async () => {
      renderPicker({ min: '2026-03-15', value: '2026-03-20' });
      await userEvent.click(screen.getByLabelText('Data'));

      const day10Buttons = screen.getAllByText('10');
      const day10 = day10Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day10Buttons[0];
      expect(day10).toBeDisabled();
    });

    it('disables days after max date', async () => {
      renderPicker({ max: '2026-03-20', value: '2026-03-15' });
      await userEvent.click(screen.getByLabelText('Data'));

      const day25Buttons = screen.getAllByText('25');
      const day25 = day25Buttons.find(
        (btn) => !btn.hasAttribute('data-state-outside'),
      ) ?? day25Buttons[0];
      expect(day25).toBeDisabled();
    });
  });

  // --- forwardRef ---
  describe('forwardRef', () => {
    it('ref receives the input element', () => {
      const ref = React.createRef<HTMLInputElement>();

      render(
        <DateTimePicker
          value=""
          onChange={() => {}}
          ref={ref}
        />,
      );

      const input = screen.getByLabelText('Data');
      expect(ref.current).toBe(input);
    });
  });

  // --- Dropdown ---
  describe('dropdown', () => {
    it('opens dropdown on input focus', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes dropdown on click outside', async () => {
      renderPicker();
      await userEvent.click(screen.getByLabelText('Data'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  // --- Async value ---
  describe('async value', () => {
    it('updates input when value changes externally', () => {
      const { rerender, onChange } = renderPicker();

      rerender(
        <DateTimePicker
          name="date"
          value="2026-03-25"
          onChange={onChange}
        />,
      );

      expect(screen.getByLabelText('Data')).toHaveValue('25/03/2026');
    });
  });
});
