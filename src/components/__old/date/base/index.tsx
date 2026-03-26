import '../datepicker2.scss';

import { forwardRef, MouseEvent } from 'react';
import Icon from '../../../icons';
import Popover, { PopoverText } from '../../../popover';
import type {
  BaseDateInputRootProps,
  BaseDateInputLabelProps,
  BaseDateInputContainerProps,
  BaseDateInputProps,
  BaseDateInputTriggersProps,
} from '../types';

export const Root = forwardRef<HTMLDivElement, BaseDateInputRootProps>((props, ref) => {
  const { children, customClassWrapper = '', hasValidationErrors = false, ...rest } = props;
  return (
    <div
      {...rest}
      ref={ref}
      data-state-error={hasValidationErrors}
      className={`date-field-root ${customClassWrapper}`}>
      {children}
    </div>
  );
});

Root.displayName = 'BaseDateRoot';

export const Label = forwardRef<HTMLSpanElement, BaseDateInputLabelProps>((props, ref) => {
  const {
    hint, label, inputId, isDisabled = false, isReadOnly = false, required = false,
    hasHintMessages = false, labelUppercase = false, skeletonize = false, hintPosition = 'below',
    themePopover = 'light', popoverAlign = 'left', customClassLabel = '', ...rest
  } = props;

  return (
    <span
      {...rest}
      ref={ref}
      className={`root-label ${customClassLabel}`}
      data-state-skeletonize={skeletonize}>
      <label
        className="label"
        title={label}
        htmlFor={inputId}
        aria-disabled={isDisabled}
        data-state-disabled={isDisabled}
        data-state-read-only={isReadOnly}
        data-state-input-required={required}
        data-state-label-uppercase={labelUppercase}>
        {label}
      </label>
      {hasHintMessages && hintPosition === 'onLabelRight' && !skeletonize && (
        <Popover
          customClass="label-popover"
          theme={themePopover}
          align={popoverAlign}
          iconColor="#03bde2">
          <PopoverText text={hint} />
        </Popover>
      )}
    </span>
  );
});

Label.displayName = 'BaseDateLabel';

export const Container = forwardRef<HTMLDivElement, BaseDateInputContainerProps>((props, ref) => {
  const { children, skeletonize = false, customClassInputContainer = '', ...rest } = props;

  return (
    <div
      {...rest}
      ref={ref}
      data-state-skeletonize={skeletonize}
      className={`container ${customClassInputContainer}`}>
      {children}
    </div>
  );
});

Container.displayName = 'BaseDateContainer';

export const Input = forwardRef<HTMLInputElement, BaseDateInputProps>((props, ref) => {
  const { customClass = '', ...rest } = props;

  return (
    <input
      {...rest}
      ref={ref}
      multiple={false}
      type="text"
      // eslint-disable-next-line jsx-a11y/role-has-required-aria-props
      role="combobox"
      aria-haspopup="true"
      className={`input ${customClass}`}
      aria-autocomplete="list" />
  );
});

Input.displayName = 'BaseDateInput';

export const Triggers = forwardRef<HTMLDivElement, BaseDateInputTriggersProps>((props, ref) => {
  const {
    children, isReadOnly, isDisabled, skeletonize, inputFieldId, calendarBoxOpen,
    showCalendarButton, showClearButton, onClearSelectedDate, onClickTriggerCalendar,
    hasValidDateSelection = false, hasValidPeriodSelected = false, clearButtonTestId = 'test-date-trigger-clear',
    calendarButtonTestId = 'test-date-trigger-open-calendar', ...rest
  } = props;
  const ariaLabel = !calendarBoxOpen ? 'Abrir Calendário' : 'Fechar Calendário';
  const shouldHavePermitClickOnTrigger = !isReadOnly && !isDisabled;

  const handleOnClickClear = (event: MouseEvent<HTMLButtonElement>) => {
    if (!shouldHavePermitClickOnTrigger) {
      event.preventDefault();
    } else {
      onClearSelectedDate();
    }
  };

  return (
    <div
      {...rest}
      ref={ref}
      className="triggers"
      data-state-disabled={isDisabled}
      data-state-read-only={isReadOnly}
      data-state-skeletonize={skeletonize}>
      <button
        data-testid={clearButtonTestId}
        className="clear-selected-date"
        type="button"
        title="Limpar Data Selecionada"
        tabIndex={-1}
        disabled={isDisabled}
        aria-label="Limpar Data Selecionada"
        aria-controls={inputFieldId}
        data-state-read-only={isReadOnly}
        data-state-visible={showClearButton}
        data-state-valid-date-selected={hasValidDateSelection || hasValidPeriodSelected}
        onClick={handleOnClickClear}
        onMouseDown={(event) => { event.preventDefault(); }}>
        <Icon name="cancel" />
      </button>
      <button
        data-testid={calendarButtonTestId}
        className="open-calendar"
        type="button"
        title={ariaLabel}
        tabIndex={-1}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-controls={inputFieldId}
        data-state-visible={showCalendarButton}
        data-state-read-only={isReadOnly}
        onClick={onClickTriggerCalendar}
        onMouseDown={(event) => { event.preventDefault(); }}>
        <Icon name="calendar" />
      </button>
      {children}
    </div>
  );
});

Triggers.displayName = 'BaseDateTriggers';
