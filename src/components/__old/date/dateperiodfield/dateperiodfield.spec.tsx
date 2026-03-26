import _ from 'lodash';
import moment from 'moment';
import userEvent from '@testing-library/user-event';
import { screen, fireEvent, render, waitFor } from '@testing-library/react';
import { ReactNode, act } from 'react';
import * as DatePeriodField from '.';
import { TOKEN_ISO_FORMAT } from '../helpers';
import Form, { useForm } from '../../../form2';
import storageMock, { permissionAttrMockAuthorized, permissionAttrMockUnauthorized } from '../../../../../config/tests/storageMock';

const handleMockOnChangeFunc = vi.fn();

interface IMockFormProps {
  shouldApplyValidators?: boolean;
  initialValues?: any;
  onSubmit?: (data: any) => void;
  showClearDateButton?: boolean;
}

const renderComponent = async (props: DatePeriodField.DatePeriodFieldProps = {}) => {
  const user = userEvent.setup();
  const defaultValue = {
    inicial: moment('2025-01-14').startOf('week').format(TOKEN_ISO_FORMAT),
    final: moment('2025-01-15').endOf('week').format(TOKEN_ISO_FORMAT),
  };

  const { container } = render(
    <DatePeriodField.Input
      {...props}
      data-testid="test-date-period-field"
      ref={null}
      name="periodoTeste"
      label="Selecione um periodo"
      value={defaultValue}
      onChange={handleMockOnChangeFunc} />,
  );

  return { user, container };
};

describe('DateField Tests', () => {
  beforeAll(() => {
    moment.locale('pt-br');
    vi.mock('react-dom', () => ({
      ...vi.importActual('react-dom'),
      createPortal: (node: ReactNode) => node,
    }));

    Object.defineProperty(window, 'sessionStorage', {
      value: storageMock(),
    });
  });

  describe('Render', () => {
    it('should be able to render input with ARIA attributes correctly', () => {
      renderComponent();
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      expect(initialInput).toBeInTheDocument();
      expect(initialInput).toHaveAttribute('role', 'combobox');
      expect(initialInput).toHaveAttribute('aria-expanded', 'false');
      expect(finalInput).toBeInTheDocument();
    });

    it('should be able to render label, hint, slots and buttons to control', () => {
      renderComponent({ hint: 'Ajuda para lhe dar periodo selecionado.' });
      expect(screen.getByTestId('test-date-period-field-label')).toBeInTheDocument();
      expect(screen.getByText('Ajuda para lhe dar periodo selecionado.')).toBeInTheDocument();
      expect(screen.getByTestId('test-date-period-field-trigger-open-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('test-date-period-field-trigger-select-predefined-periods')).toBeInTheDocument();
    });

    it('should not be able to render nothing when `permissionAttr` define `unvisible` or `hideContent`', async () => {
      const permissionAttr = permissionAttrMockUnauthorized('unvisible');
      const { container } = await renderComponent({ permissionAttr });

      expect(container.firstChild).toBeNull();
    });

    it('should be able to render when `permissionAttr` is valid', async () => {
      const permissionAttr = permissionAttrMockAuthorized('unvisible');
      const { container } = await renderComponent({ permissionAttr });

      expect(container.firstChild).not.toBeNull();
    });

    it('should be able to apply skeleton in data attributes', () => {
      renderComponent({ skeletonize: true });
      const label = screen.getByTestId('test-date-period-field-label');
      const container = screen.getByTestId('test-date-period-field-container');
      const triggerCalendar = screen.getByTestId('test-date-period-field-trigger-open-calendar');

      expect(container).toHaveAttribute('data-state-skeletonize', 'true');
      expect(label).toHaveAttribute('data-state-skeletonize', 'true');
      expect(triggerCalendar.closest('.triggers')).toHaveAttribute('data-state-skeletonize', 'true');
    });

    it('should be able to apply custom class names correctly', () => {
      renderComponent({
        customClass: 'custom-class-input',
        customClassLabel: 'custom-class-label',
        customClassWrapper: 'custom-class-wrapper',
        customClassInputContainer: 'custom-class-container',
      });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      const label = screen.getByText('Selecione um periodo');
      const wrapper = screen.getByTestId('test-date-period-field-root');
      const labelRoot = label.closest('.root-label');
      const container = initialInput.closest('.container');

      expect(initialInput.classList.contains('custom-class-input')).toBe(true);
      expect(finalInput.classList.contains('custom-class-input')).toBe(true);
      expect(labelRoot?.classList.contains('custom-class-label')).toBe(true);
      expect(wrapper?.classList.contains('custom-class-wrapper')).toBe(true);
      expect(container?.classList.contains('custom-class-container')).toBe(true);
    });
  });

  describe('Interactivity', () => {
    it('should be able to open and close the calendarbox when click in calendar button', () => {
      renderComponent();
      const toggleBtn = screen.getByTestId('test-date-period-field-trigger-open-calendar');
      fireEvent.click(toggleBtn);
      expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument();
      fireEvent.click(toggleBtn);
      expect(screen.queryByTestId('test-date-period-field-calendar-box')).not.toBeInTheDocument();
    });

    it('should be able to clean a selected period date when click in clear period button', async () => {
      renderComponent();
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      const clearButton = screen.getByTestId('test-date-period-field-trigger-clean-selected-period');
      expect(initialInput.getAttribute('value')).not.toEqual('__/__/____');
      expect(finalInput.getAttribute('value')).not.toEqual('__/__/____');
      expect(clearButton.getAttribute('data-state-valid-date-selected')).toEqual('true');
      fireEvent.click(clearButton);
      expect(initialInput.getAttribute('value')).toEqual('__/__/____');
      expect(finalInput.getAttribute('value')).toEqual('__/__/____');
    });

    it('should be able to open the calendabox when we focus on input if openDropdownOnFocus is true', () => {
      renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      fireEvent.focus(initialInput);
      expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation and Accessibility', () => {
    it('should be able to navigate between days in calendarbox using Arrow keys', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.keyboard('{ArrowDown}'); });
      await act(async () => { await user.keyboard('{ArrowRight}'); });
      await act(async () => { await user.keyboard('{ArrowUp}{ArrowUp}'); });
      await act(async () => { await user.keyboard('{ArrowLeft}'); });

      await waitFor(() => {
        const calendarBox = screen.getByTestId('test-date-period-field-calendar-box');
        const buttonDayHasFocus = calendarBox.querySelectorAll('[data-state-has-focus="true"]')[0] as HTMLElement;
        expect(buttonDayHasFocus).toHaveAttribute('data-state-has-focus', 'true');
        expect(buttonDayHasFocus).toHaveTextContent('5');
      });
    });

    it('should be able to navigate between months in calendarbox using Page keys', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      await waitFor(() => { expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument(); });

      await act(async () => { await user.keyboard('{PageUp}'); });
      const monthDescription = screen.getByTestId('test-date-period-field-calendar-box-month-description');
      await waitFor(() => { expect(monthDescription).toHaveTextContent('fevereiro 2025'); });

      await act(async () => { await user.keyboard('{PageDown}{PageDown}'); });
      await waitFor(() => { expect(monthDescription).toHaveTextContent('dezembro 2024'); });
    });

    it('should be able to navigate between months in calendarbox using Arrow keys', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      await waitFor(() => { expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument(); });

      await act(async () => { await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}'); });
      const monthDescription = screen.getByTestId('test-date-period-field-calendar-box-month-description');
      await waitFor(() => { expect(monthDescription).toHaveTextContent('fevereiro 2025'); });

      await waitFor(() => {
        const activedescendant = initialInput.getAttribute('aria-activedescendant');
        const activeElement = document.getElementById(activedescendant!);
        expect(activeElement).toHaveAttribute('title', '2 de fevereiro de 2025');
        expect(activeElement).toHaveTextContent('2');
      });

      await act(async () => { await user.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}'); });
      await waitFor(() => {
        const activedescendant = initialInput.getAttribute('aria-activedescendant');
        const activeElement = document.getElementById(activedescendant!);
        expect(activeElement).toHaveAttribute('title', '29 de dezembro de 2024');
        expect(activeElement).toHaveTextContent('29');
      });
    });

    it('should be able to navigate in a week using Home/End keys when calendarbox is open', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      await waitFor(() => { expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument(); });

      await act(async () => { await user.keyboard('{End}'); });
      await waitFor(() => {
        const activedescendant = initialInput.getAttribute('aria-activedescendant');
        const activeElement = document.getElementById(activedescendant!);
        expect(activeElement).toHaveAttribute('title', '18 de janeiro de 2025');
        expect(activeElement).toHaveTextContent('18');
      });

      await act(async () => { await user.keyboard('{Home}'); });
      await waitFor(() => {
        const activedescendant = initialInput.getAttribute('aria-activedescendant');
        const activeElement = document.getElementById(activedescendant!);
        expect(activeElement).toHaveAttribute('title', '12 de janeiro de 2025');
        expect(activeElement).toHaveTextContent('12');
      });
    });

    it('should be able to close the calendarbox when we press key Escape', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });

      await waitFor(() => {
        expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument();
      });
      await act(async () => { await user.keyboard('{Escape}'); });

      await waitFor(() => {
        expect(screen.queryByTestId('test-date-period-field-calendar-box')).not.toBeInTheDocument();
      });
    });

    it('should select initial date when pressing Enter on a calendar day', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.keyboard('{ArrowUp}'); });
      await act(async () => { await user.keyboard('{Enter}'); });

      await waitFor(() => {
        expect(handleMockOnChangeFunc).toHaveBeenCalledWith(expect.objectContaining({
          target: { name: 'periodoTeste', value: { inicial: '2025-01-05', final: '2025-01-18' } },
        }));
      });
    });

    it('should be able to select final date when we press key Enter in a day on calendarbox', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      await act(async () => { await user.click(finalInput); });
      await act(async () => { await user.keyboard('{ArrowDown}'); });
      await act(async () => { await user.keyboard('{Enter}'); });

      await waitFor(() => {
        expect(handleMockOnChangeFunc).toHaveBeenCalledWith(expect.objectContaining({
          target: { name: 'periodoTeste', value: { inicial: '2025-01-12', final: '2025-01-25' } },
        }));
      });
    });

    it('should be able to keep aria-activedescendant always updated', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.keyboard('{ArrowUp}'); });
      const initialInputActivedescendant = initialInput.getAttribute('aria-activedescendant');
      const finalInputActivedescendant = finalInput.getAttribute('aria-activedescendant');

      await waitFor(() => { expect(initialInputActivedescendant).toBeTruthy(); });
      await waitFor(() => { expect(finalInputActivedescendant).toBeTruthy(); });
      const activeButtonElement = document.getElementById(initialInputActivedescendant!);

      await waitFor(() => {
        expect(activeButtonElement).toHaveAttribute('data-state-has-focus', 'true');
        expect(activeButtonElement).toHaveTextContent('5');
      });
    });
  });

  describe('Component States and Restrictions', () => {
    it('should be able to disabled the dateperiodfield inputs when is readOnly', async () => {
      await renderComponent({ readOnly: true });
      const initialInputReadOnly = screen.getByTestId('test-date-period-field-initial-input');
      const finalInputReadOnly = screen.getByTestId('test-date-period-field-final-input');
      expect(initialInputReadOnly).toHaveAttribute('readonly');
      expect(finalInputReadOnly).toHaveAttribute('readonly');
    });

    it('should be able to disabled the dateperiodfield inputs when is disabled', async () => {
      await renderComponent({ disabled: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      expect(initialInput).toBeDisabled();
      expect(finalInput).toBeDisabled();
    });

    it('should be able to block paste and beforeInput when is undigitable', async () => {
      const onPaste = vi.fn();
      const onBeforeInput = vi.fn();
      await renderComponent({ undigitable: true, onPaste, onBeforeInput });

      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');
      fireEvent.paste(initialInput, { clipboardData: { getData: () => '01' } });
      fireEvent.change(initialInput, { target: { data: '01' } });
      fireEvent.paste(finalInput, { clipboardData: { getData: () => '02' } });
      fireEvent.change(finalInput, { target: { data: '02' } });

      expect(onPaste).not.toHaveBeenCalled();
      expect(onBeforeInput).not.toHaveBeenCalled();
    });

    it('should be able to apply data attributes when we use states like skeletonize, read-only, error', async () => {
      await renderComponent({ skeletonize: true, readOnly: true, errors: ['Error DatePeriodField'] });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');

      expect(initialInput).toHaveAttribute('data-state-read-only', 'true');
      expect(initialInput).toHaveAttribute('data-state-skeletonize', 'true');
      expect(initialInput).toHaveAttribute('data-state-error', 'true');
      expect(finalInput).toHaveAttribute('data-state-read-only', 'true');
      expect(finalInput).toHaveAttribute('data-state-skeletonize', 'true');
      expect(finalInput).toHaveAttribute('data-state-error', 'true');
      expect(screen.getByText('Error DatePeriodField')).toBeInTheDocument();
    });
  });

  describe('Events and Callbacks', () => {
    it('should be able to trigger onBlur and onFocus correctly', async () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const { user } = await renderComponent({ onFocus, onBlur });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      const finalInput = screen.getByTestId('test-date-period-field-final-input');

      await act(async () => { await user.click(initialInput); });
      await waitFor(() => { expect(initialInput).toHaveFocus(); });
      await waitFor(() => { expect(onFocus).toHaveBeenCalled(); });
      await act(async () => { await user.tab(); });
      await waitFor(() => { expect(finalInput).toHaveFocus(); });
      await waitFor(() => { expect(onFocus).toHaveBeenCalled(); });

      await act(async () => { await user.tab(); });
      await waitFor(() => { expect(onBlur).toHaveBeenCalled(); });
    });

    it('should be able to call onChange when the user finishes typing the date character by character into the input', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');

      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.clear(initialInput); });
      await waitFor(() => { expect(initialInput).toHaveFocus(); });

      await act(async () => { await user.type(initialInput, '01012025'); });
      await waitFor(() => {
        expect(handleMockOnChangeFunc).toHaveBeenCalledWith(expect.objectContaining({
          target: { name: 'periodoTeste', value: { inicial: '2025-01-01', final: '2025-01-18' } },
        }));
      });
    });

    it('should be able to call onChange when the user finishes typing the date character by character into the input and calendar box has close', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: false });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');

      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.clear(initialInput); });
      await waitFor(() => { expect(initialInput).toHaveFocus(); });

      await act(async () => { await user.type(initialInput, '05012025'); });
      await waitFor(() => {
        expect(handleMockOnChangeFunc).toHaveBeenCalledWith(expect.objectContaining({
          target: { name: 'periodoTeste', value: { inicial: '2025-01-05', final: '2025-01-18' } },
        }));
      });
    });
  });

  describe('Integration with useForm', () => {
    const INITIAL_DATA = { periodo: { inicial: '', final: '' } as any };

    const FormWithPeriodField = (props: IMockFormProps) => {
      const {
        shouldApplyValidators, showClearDateButton, initialValues = INITIAL_DATA,
        onSubmit = () => { },
      } = props;
      const required = () => (value: any) => {
        if (_.isNil(value?.inicial) ||
          (_.isString(value?.inicial) && _.isEmpty(value?.inicial)) ||
          !moment(value?.inicial).isValid()) return 'Data inicial obrigatória.';
        return null;
      };

      const { register, errors, reset, handleSubmit } = useForm({
        initialValues,
        validators: {
          periodo: !shouldApplyValidators ? [] : [required()],
        },
      });

      return (
        <>
          <Form data-testid="test-form-with-period-field" onSubmit={handleSubmit(onSubmit)}>
            <DatePeriodField.Input
              {...register('periodo')}
              showClearDateButton={showClearDateButton}
              data-testid="test-date-period-field-in-form"
              label="Selecione um periodo"
              errors={errors.periodo} />
            <button
              type="submit"
              data-testid="test-save-button">
              Salvar
            </button>
          </Form>
          <button
            type="button"
            data-testid="test-reset-button"
            onClick={() => reset(['periodo'])}>
            Reset Select
          </button>
        </>
      );
    };

    it('should be able to render initial and final value correctly with useForm', async () => {
      render(<FormWithPeriodField />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;

      await waitFor(() => { expect(initialInput?.value).toBe('__/__/____'); });
      await waitFor(() => { expect(finalInput?.value).toBe('__/__/____'); });
    });

    it('should be able to register the field with correctly name', async () => {
      render(<FormWithPeriodField />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;

      await waitFor(() => { expect(initialInput).toHaveAttribute('id', 'periodo.inicial'); });
      await waitFor(() => { expect(initialInput).toHaveAttribute('name', 'periodo.inicial'); });
      await waitFor(() => { expect(finalInput).toHaveAttribute('id', 'periodo.final'); });
      await waitFor(() => { expect(finalInput).toHaveAttribute('name', 'periodo.final'); });
    });

    it('should be able to show validation error when value is invalid', async () => {
      render(<FormWithPeriodField shouldApplyValidators />);

      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;
      await act(async () => { await userEvent.click(initialInput); });
      expect(initialInput).toHaveFocus();
      await act(async () => { await userEvent.tab(); });
      expect(finalInput).toHaveFocus();
      await act(async () => { await userEvent.tab(); });

      expect(screen.getByTestId('test-date-period-field-list-errors')).toBeInTheDocument();

      await act(async () => { await userEvent.click(initialInput); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      await waitFor(() => {
        expect(screen.queryByText(/Data inicial obrigatória/i)).not.toBeInTheDocument();
      });
    });

    it('should be able to trigger onBlur when user leaves the field', async () => {
      render(<FormWithPeriodField />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;
      await act(async () => { await userEvent.click(initialInput); });
      await waitFor(() => { expect(initialInput).toHaveFocus(); });
      await act(async () => { await userEvent.tab(); });
      await waitFor(() => { expect(initialInput).not.toHaveFocus(); });

      await waitFor(() => { expect(finalInput).toHaveFocus(); });
      await act(async () => { await userEvent.tab(); });
      await waitFor(() => { expect(finalInput).not.toHaveFocus(); });
    });

    it('should be able to reset value using reset()', async () => {
      render(<FormWithPeriodField />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;

      await act(async () => { await userEvent.click(initialInput); });
      await act(async () => { await userEvent.keyboard('{ArrowLeft}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      expect(initialInput.value).not.toBe('__/__/____');

      await act(async () => { await userEvent.keyboard('{ArrowRight}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      expect(finalInput.value).not.toBe('__/__/____');

      await act(async () => { await userEvent.click(screen.getByTestId('test-reset-button')); });
      expect(initialInput.value).toBe('__/__/____');
      expect(finalInput.value).toBe('__/__/____');
    });

    it('should be able to clear selected period date using clear button trigger', async () => {
      const handleSubmit = vi.fn();
      render(<FormWithPeriodField showClearDateButton onSubmit={handleSubmit} />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;
      const buttonSubmit = screen.getByTestId('test-save-button');

      await act(async () => { await userEvent.click(initialInput); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      expect(initialInput.value).not.toBe('__/__/____');
      expect(finalInput.value).not.toBe('__/__/____');

      await act(async () => { await userEvent.click(screen.getByTestId('test-date-period-field-trigger-clean-selected-period')); });
      expect(initialInput.value).toBe('__/__/____');
      expect(finalInput.value).toBe('__/__/____');
      await act(async () => { await userEvent.click(buttonSubmit); });
      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
        expect(handleSubmit).toHaveBeenCalledWith({ periodo: { inicial: '', final: '' } });
      });
    });

    it('should be able to integrate with useForm and submit correctly period values', async () => {
      const handleSubmit = vi.fn();
      const localInitialValues = {
        periodo: {
          inicial: moment('2025-01-14').format(TOKEN_ISO_FORMAT),
          final: moment('2025-01-15').format(TOKEN_ISO_FORMAT),
        },
      };
      render(<FormWithPeriodField onSubmit={handleSubmit} initialValues={localInitialValues} />);
      const initialInput = screen.getByTestId('test-date-period-field-initial-input') as HTMLInputElement;
      const finalInput = screen.getByTestId('test-date-period-field-final-input') as HTMLInputElement;
      const buttonSubmit = screen.getByTestId('test-save-button');

      await act(async () => { await userEvent.click(initialInput); });
      expect(initialInput).toHaveFocus();
      await act(async () => { await userEvent.keyboard('{ArrowLeft}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });

      await act(async () => { await userEvent.click(finalInput); });
      expect(finalInput).toHaveFocus();
      await act(async () => { await userEvent.keyboard('{ArrowRight}'); });
      await act(async () => { await userEvent.keyboard('{Enter}'); });
      await act(async () => { await userEvent.click(buttonSubmit); });

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
        expect(handleSubmit).toHaveBeenCalledWith({ periodo: { inicial: '2025-01-13', final: '2025-01-16' } });
      });
    });
  });

  describe('General Cases to Test', () => {
    it('should be able to handle invalid date inputs gracefully', async () => {
      const onBlur = vi.fn();
      const { user } = await renderComponent({ onBlur, openCalendarOnFocus: false });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');

      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.clear(initialInput); });
      await act(async () => { await user.type(initialInput, '99999999'); });
      await act(async () => { await user.tab(); });

      expect(handleMockOnChangeFunc).not.toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({
          value: expect.objectContaining({ inicial: '9999-99-99' }),
        }),
      }));
    });

    it('should be able to handle leap years correctly', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: false });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');

      await act(async () => { await user.click(initialInput); });
      await act(async () => { await user.clear(initialInput); });
      await act(async () => { await user.type(initialInput, '29022024'); });
      expect(handleMockOnChangeFunc).toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({
          value: expect.objectContaining({ inicial: '2024-02-29' }),
        }),
      }));

      await act(async () => { await user.clear(initialInput); });
      await act(async () => { await user.type(initialInput, '29022023'); });
      expect(handleMockOnChangeFunc).not.toHaveBeenCalledWith(expect.objectContaining({
        target: expect.objectContaining({
          value: expect.objectContaining({ inicial: '2023-02-29' }),
        }),
      }));
    });

    it('should be able to not cause memory leaks when opening/closing calendar multiple times', async () => {
      const { user } = await renderComponent();
      const calendarBtn = screen.getByTestId('test-date-period-field-trigger-open-calendar');

      for (let action = 0; action < 3; action++) {
        await act(async () => { await user.click(calendarBtn); });
        expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument();
        await act(async () => { await user.click(calendarBtn); });
        expect(screen.queryByTestId('test-date-period-field-calendar-box')).not.toBeInTheDocument();
      }
    });

    it('should be able to handle rapid keyboard navigation without performance issues', async () => {
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');

      await act(async () => { await user.click(initialInput); });
      await waitFor(() => { expect(screen.getByTestId('test-date-period-field-calendar-box')).toBeInTheDocument(); });

      await act(async () => {
        for (let action = 0; action < 10; action++) {
          await user.keyboard('{ArrowRight}');
        }
      });

      const calendarBox = screen.getByTestId('test-date-period-field-calendar-box');
      const focusedDay = calendarBox.querySelector('[data-state-has-focus="true"]');
      expect(focusedDay).toBeInTheDocument();
    });

    it('should be able to display month names in correct language pt-br', async () => {
      moment.locale('pt-br');
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      const monthDescription = screen.getByTestId('test-date-period-field-calendar-box-month-description');

      expect(monthDescription.textContent?.toLowerCase()).toContain('janeiro');
    });

    it('should be able to display month names in correct language en-us', async () => {
      moment.locale('en');
      const { user } = await renderComponent({ openCalendarOnFocus: true });
      const initialInput = screen.getByTestId('test-date-period-field-initial-input');
      await act(async () => { await user.click(initialInput); });
      const monthDescription = screen.getByTestId('test-date-period-field-calendar-box-month-description');

      expect(monthDescription.textContent?.toLowerCase()).toContain('january');
    });
  });
});
