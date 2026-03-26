import moment from 'moment';
import { MouseEvent } from 'react';
import Button from '../../../buttons';
import * as BaseDate from '../base';
import List, { ListItem } from '../../../list';
import type { DatePeriodTypes } from './types';
import { useDatePeriodFieldContext } from './context';
import { PERIOD_OPTIONS_LIST, TOKEN_ISO_FORMAT } from '../helpers';

const Triggers = () => {
  const {
    initialInputId, initialInputRef, finalInputRef, isReadOnly, isDisabled, selectedDate, 
    calendarBoxOpen, showCalendarButton, skeletonize, showPredefinedPeriodsButton,
    showClearDateButton, hasValidPeriodSelected, handleChangeCalendarBoxState,
    handleChangeActiveDescendant, handleChangeCalendarDisplayDate, handleOnClickClearSelectedPeriod,
    handleChangeUpdateDateStateWithPredefinedPeriod,
  } = useDatePeriodFieldContext();
  const shouldHavePermitClickOnTrigger = !isReadOnly && !isDisabled;

  const handleOnClickTriggerSelectPredefinedPeriods = (
    event: any, periodSelected?: DatePeriodTypes,
  ) => {
    if (!shouldHavePermitClickOnTrigger) event?.preventDefault?.();
    else {
      if (periodSelected) handleChangeUpdateDateStateWithPredefinedPeriod(periodSelected);
    }
  };

  const handleOnClickTriggerCalendar = (event: MouseEvent<HTMLButtonElement>) => {
    if (!shouldHavePermitClickOnTrigger) event.preventDefault();
    else {
      handleChangeCalendarBoxState(!calendarBoxOpen);
      if (!calendarBoxOpen) {
        switch (document.activeElement?.id) {
          case initialInputRef.current?.id: {
            handleChangeActiveDescendant(
              (selectedDate.inicial ?? moment()).format(TOKEN_ISO_FORMAT),
            );
            handleChangeCalendarDisplayDate(selectedDate.inicial ?? moment());
            initialInputRef.current?.focus();
            break;
          }
          case finalInputRef.current?.id: {
            handleChangeActiveDescendant((selectedDate.final ?? moment()).format(TOKEN_ISO_FORMAT));
            handleChangeCalendarDisplayDate(selectedDate.final ?? moment());
            finalInputRef.current?.focus();
            break;
          }
          default: initialInputRef.current?.focus();
            break;
        }
      }
    }
  };

  return (
    <BaseDate.Triggers
      clearButtonTestId="test-date-period-field-trigger-clean-selected-period"
      calendarButtonTestId="test-date-period-field-trigger-open-calendar"
      isDisabled={isDisabled}
      isReadOnly={isReadOnly}
      skeletonize={skeletonize}
      inputFieldId={initialInputId}
      calendarBoxOpen={calendarBoxOpen}
      showClearButton={showClearDateButton}
      showCalendarButton={showCalendarButton}
      hasValidDateSelection={false}
      hasValidPeriodSelected={hasValidPeriodSelected}
      onClearSelectedDate={handleOnClickClearSelectedPeriod}
      onClickTriggerCalendar={handleOnClickTriggerCalendar}>
      <Button
        data-testid="test-date-period-field-trigger-select-predefined-periods"
        className="select-predefined-periods"
        dropdown
        transparent
        boxShadow={false}
        showIconDropdown={false}
        visible={showPredefinedPeriodsButton}
        type="button"
        title="Selecionar Periodos Pré Definidos"
        tabIndex={-1}
        disabled={isDisabled}
        aria-label="Selecionar Periodos Pré Definidos"
        aria-controls={initialInputId}
        aria-readonly={isReadOnly}
        data-state-read-only={isReadOnly}
        data-state-visible={showPredefinedPeriodsButton}
        iconName="more1"
        dropdownAlign="right"
        onMouseDown={(event) => { event.preventDefault(); }}>
        <List condensed>
          {PERIOD_OPTIONS_LIST.map(period => (
            <ListItem
              key={period.id}
              itemId={period.id}
              text={period.label}
              onMouseDown={(event) => { event?.preventDefault?.(); }}
              onClick={(event) => {
                handleOnClickTriggerSelectPredefinedPeriods(event, period.id); 
              }} />
          ))}
        </List>
      </Button>
    </BaseDate.Triggers>
  );
};

Triggers.displayName = 'DatePeriodFieldTriggers';

export { Triggers };
