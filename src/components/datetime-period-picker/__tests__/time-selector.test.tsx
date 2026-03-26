import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeSelector } from '../time-selector';
import { usePicker } from '../context';
import type { PickerContextValue } from '../types';

vi.mock('../context', () => ({
  usePicker: vi.fn(),
}));

const mockedUsePicker = vi.mocked(usePicker);

function createMockPicker(overrides: Partial<PickerContextValue> = {}): PickerContextValue {
  return {
    variant: 'datetime',
    min: null,
    max: null,
    disabled: false,
    initial: new Date(2026, 2, 25, 14, 30),
    final: new Date(2026, 2, 28, 16, 45),
    viewDate: new Date(2026, 2, 1),
    activeField: 'initial',
    isOpen: true,
    hoveredDate: null,
    setViewDate: vi.fn(),
    navigateMonth: vi.fn(),
    navigateYear: vi.fn(),
    selectDate: vi.fn(),
    setTime: vi.fn(),
    setActiveField: vi.fn(),
    updateFromInput: vi.fn(),
    setHoveredDate: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
    focusedDate: null,
    setFocusedDate: vi.fn(),
    onInputKeyDown: vi.fn(),
    setOnInputKeyDown: vi.fn(),
    ...overrides,
  };
}

describe('TimeSelector', () => {
  beforeEach(() => {
    // Mock scrollIntoView since jsdom doesn't support it
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders hour and minute columns', () => {
    mockedUsePicker.mockReturnValue(createMockPicker());
    render(<TimeSelector />);

    expect(screen.getByText('Hora')).toBeInTheDocument();
    expect(screen.getByText('Minuto')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Selecionar hora' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Selecionar minuto' })).toBeInTheDocument();
  });

  it('renders 24 hours (00-23)', () => {
    mockedUsePicker.mockReturnValue(createMockPicker());
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const options = hourColumn.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(24);
    expect(options[0].textContent).toBe('00');
    expect(options[23].textContent).toBe('23');
  });

  it('renders 60 minutes (00-59)', () => {
    mockedUsePicker.mockReturnValue(createMockPicker());
    render(<TimeSelector />);

    const minuteColumn = screen.getByRole('listbox', { name: 'Selecionar minuto' });
    const options = minuteColumn.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(60);
    expect(options[0].textContent).toBe('00');
    expect(options[59].textContent).toBe('59');
  });

  it('marks the current hour as active when activeField is initial', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    }));
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const options = hourColumn.querySelectorAll('[role="option"]');

    // Hour 14 should be active
    expect(options[14]).toHaveAttribute('aria-selected', 'true');
    expect(options[14]).toHaveClass('dtp-time-item--active');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('marks the current minute as active when activeField is initial', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    }));
    render(<TimeSelector />);

    const minuteColumn = screen.getByRole('listbox', { name: 'Selecionar minuto' });
    const options = minuteColumn.querySelectorAll('[role="option"]');

    // Minute 30 should be active
    expect(options[30]).toHaveAttribute('aria-selected', 'true');
    expect(options[30]).toHaveClass('dtp-time-item--active');
  });

  it('uses final date when activeField is final', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'final',
      final: new Date(2026, 2, 28, 16, 45),
    }));
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const hourOptions = hourColumn.querySelectorAll('[role="option"]');
    expect(hourOptions[16]).toHaveAttribute('aria-selected', 'true');

    const minuteColumn = screen.getByRole('listbox', { name: 'Selecionar minuto' });
    const minuteOptions = minuteColumn.querySelectorAll('[role="option"]');
    expect(minuteOptions[45]).toHaveAttribute('aria-selected', 'true');
  });

  it('adds disabled class when no active date', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'initial',
      initial: null,
    }));
    const { container } = render(<TimeSelector />);

    expect(container.firstChild).toHaveClass('dtp-time-selector--disabled');
  });

  it('calls setTime with selected hour on click', async () => {
    const user = userEvent.setup();
    const mock = createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    });
    mockedUsePicker.mockReturnValue(mock);
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const options = hourColumn.querySelectorAll('[role="option"]');

    await user.click(options[10]);
    expect(mock.setTime).toHaveBeenCalledWith('initial', 10, 30);
  });

  it('calls setTime with selected minute on click', async () => {
    const user = userEvent.setup();
    const mock = createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    });
    mockedUsePicker.mockReturnValue(mock);
    render(<TimeSelector />);

    const minuteColumn = screen.getByRole('listbox', { name: 'Selecionar minuto' });
    const options = minuteColumn.querySelectorAll('[role="option"]');

    await user.click(options[15]);
    expect(mock.setTime).toHaveBeenCalledWith('initial', 14, 15);
  });

  it('does not call setTime when disabled (no active date)', async () => {
    const user = userEvent.setup();
    const mock = createMockPicker({
      activeField: 'initial',
      initial: null,
    });
    mockedUsePicker.mockReturnValue(mock);
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const options = hourColumn.querySelectorAll('[role="option"]');

    await user.click(options[10]);
    expect(mock.setTime).not.toHaveBeenCalled();
  });

  it('handles Enter key to select hour', async () => {
    const user = userEvent.setup();
    const mock = createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    });
    mockedUsePicker.mockReturnValue(mock);
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const activeHour = hourColumn.querySelectorAll('[role="option"]')[14];

    (activeHour as HTMLElement).focus();
    await user.keyboard('{Enter}');
    expect(mock.setTime).toHaveBeenCalledWith('initial', 14, 30);
  });

  it('pads single-digit values with leading zero', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 3, 5),
    }));
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const hourOptions = hourColumn.querySelectorAll('[role="option"]');
    expect(hourOptions[3].textContent).toBe('03');
    expect(hourOptions[3]).toHaveClass('dtp-time-item--active');

    const minuteColumn = screen.getByRole('listbox', { name: 'Selecionar minuto' });
    const minuteOptions = minuteColumn.querySelectorAll('[role="option"]');
    expect(minuteOptions[5].textContent).toBe('05');
    expect(minuteOptions[5]).toHaveClass('dtp-time-item--active');
  });

  it('sets tabIndex 0 only on active items, -1 on others', () => {
    mockedUsePicker.mockReturnValue(createMockPicker({
      activeField: 'initial',
      initial: new Date(2026, 2, 25, 14, 30),
    }));
    render(<TimeSelector />);

    const hourColumn = screen.getByRole('listbox', { name: 'Selecionar hora' });
    const hourOptions = hourColumn.querySelectorAll('[role="option"]');

    expect(hourOptions[14]).toHaveAttribute('tabindex', '0');
    expect(hourOptions[0]).toHaveAttribute('tabindex', '-1');
    expect(hourOptions[23]).toHaveAttribute('tabindex', '-1');
  });
});
