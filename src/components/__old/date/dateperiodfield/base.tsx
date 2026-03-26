import React from 'react';
import _ from 'lodash';
import { useIMask } from 'react-imask';
import { createPortal } from 'react-dom';
import moment, { type Moment } from 'moment';
import Hint from '../../../hint';
import Icon from '../../../icons';
import { Tooltip } from '../../../tooltip';
import { mergeRefs } from '../../../form2/helpers';
import { Keys } from '../types';
import * as BaseDate from '../base';
import { TOKEN_ISO_FORMAT, NAVIGATION_KEYS, TOKEN_MASK, TOKEN_PTBR_FORMAT } from '../helpers';
import { Triggers } from './triggers';
import { CalendarBox } from './calendarbox';
import { DatePeriodFieldContext } from './context';
import type { DatePeriodFieldBaseProps, DatePeriodTypes, InputType, SelectedDateType, UpdateDateStateParams } from './types';

export const InputBase = 
  React.forwardRef<HTMLInputElement, DatePeriodFieldBaseProps>((props, __) => {
    const {
      label, errors, initialName = 'inicial', finalName = 'final', customClass = '', customClassLabel = '',
      customClassWrapper = '', customClassInputContainer = '', labelUppercase = false, undigitable = false,
      skeletonize = false, hintPosition = 'below', themePopover = 'light', popoverAlign = 'left',
      showCalendarButton = true, textAlign = 'left', openCalendarOnFocus = true, shouldCloseOnSelect = true,
      showPredefinedPeriodsButton = true, showClearDateButton = true, placeholder = TOKEN_PTBR_FORMAT, returnValueType = 'default',
      tooltip, tooltipPosition, tooltipWidth, disabled, readOnly, ...rest
    } = props;
    const [selectedDate, setSelectedDate] = React.useState<SelectedDateType>({ 
      inicial: null, final: null, 
    });
    const [calendarBoxOpen, setCalendarBoxOpen] = React.useState(false);
    const [activeDescendant, setActiveDescendant] = React.useState<string>(
      moment().format(TOKEN_ISO_FORMAT),
    );
    const [calendarDisplayDate, setCalendarDisplayDate] = React.useState<Moment>(moment());
    const calendarRef = React.useRef<HTMLDivElement | null>(null);
    const inputRootRef = React.useRef<HTMLDivElement | null>(null);
    const finalInputRef = React.useRef<HTMLInputElement | null>(null);
    const initialInputRef = React.useRef<HTMLInputElement | null>(null);
    const dateContainerRef = React.useRef<HTMLDivElement | null>(null);
    const initialInputName = React.useMemo(() => String(props.name).concat('.').concat(initialName), [props.name, initialName]);
    const finalInputName = React.useMemo(() => String(props.name).concat('.').concat(finalName), [props.name, finalName]);

    const { 
      value: initialMaskedValue, 
      setValue: setInitialMaskValue, 
      unmaskedValue: initialUnmaskedValue,
    } = useIMask(
      { mask: TOKEN_MASK, lazy: false, placeholderChar: '_' },
      {
        ref: initialInputRef,
        defaultValue: selectedDate.inicial?.format(TOKEN_PTBR_FORMAT),
        onComplete: (value) => {
          const date = moment(value, TOKEN_PTBR_FORMAT);
          if (date.isValid()) {
            handleChangeUpdateDateState({ date, inputType: 'initial', typing: true });
          }
        },
      },
    );

    const { 
      value: finalMaskedValue, 
      setValue: setFinalMaskValue, 
      unmaskedValue: finalUnmaskedValue,
    } = useIMask(
      { mask: TOKEN_MASK, lazy: false, placeholderChar: '_' },
      {
        ref: finalInputRef,
        defaultValue: selectedDate.final?.format(TOKEN_PTBR_FORMAT),
        onComplete: (value) => {
          const date = moment(value, TOKEN_PTBR_FORMAT);
          if (date.isValid()) {
            handleChangeUpdateDateState({ date, inputType: 'final', typing: true });
          }
        },
      },
    );

    const hasLabel = !_.isEmpty(props?.label);
    const hasHintMessages = Boolean(props.hint?.length);
    const hasValidationErrors = Boolean(errors?.length);

    const handleChangeSelectedDate = (object: SelectedDateType) => 
      setSelectedDate(object);
    const handleChangeCalendarBoxState = (value: boolean) => 
      setCalendarBoxOpen(value);
    const handleChangeActiveDescendant = (value: string) => 
      setActiveDescendant(value);
    const handleChangeCalendarDisplayDate = (value: Moment) => 
      setCalendarDisplayDate(value);
    const handleChangePreviousMonth = () =>
      setCalendarDisplayDate(prevDisplayDate => prevDisplayDate.clone().subtract(1, 'month'));
    const handleChangeNextMonth = () =>
      setCalendarDisplayDate(prevDisplayDate => prevDisplayDate.clone().add(1, 'month'));
    const handleNavigateWithDays = (offset: number) => {
      setCalendarDisplayDate((prevDisplayDate) => {
        const daySelected = prevDisplayDate.clone().add(offset, 'day');
        handleChangeActiveDescendant(daySelected.format(TOKEN_ISO_FORMAT));
        return daySelected;
      });
    };
    const handleNavigateWithWeeks = (when: 'start' | 'end') => {
      setCalendarDisplayDate((prevDisplayDate) => {
        let daySelected = prevDisplayDate;
        if (when === 'end') daySelected = prevDisplayDate.clone().endOf('week');
        if (when === 'start') daySelected = prevDisplayDate.clone().startOf('week');
        handleChangeActiveDescendant(daySelected.format(TOKEN_ISO_FORMAT));
        return daySelected;
      });
    };
    const verifyPeriodSelectedIsValid = () => {
      const objectValue = props?.value as Partial<{ [x: string]: string | undefined }>;
      const isValidInitialValue = !_.isEmpty(objectValue[initialName]);
      const isValidFinalValue = !_.isEmpty(objectValue[finalName]);
      return isValidInitialValue && isValidFinalValue;
    };
    const handleOnClickClearSelectedPeriod = () => {
      props.onChange?.({
        target: {
          name: props.name,
          value: { [initialName]: '', [finalName]: '' } as any,
        },
      } as React.ChangeEvent<HTMLInputElement>);
      setSelectedDate(() => ({ inicial: null, final: null }));
      setInitialMaskValue('');
      setFinalMaskValue('');
      handleChangeCalendarBoxState(false);
    };

    const handleChangeUpdateDateState = (params: UpdateDateStateParams) => {
      const { date, inputType, typing } = params;
      const rawDate = date.clone();
      const verifyDateRangeOrder = (initialDate: Moment | null, finalDate: Moment | null) => {
        const inicial = initialDate?.isAfter(finalDate) ? finalDate : initialDate;
        const final = initialDate?.isAfter(finalDate) ? initialDate : finalDate;
        return { inicial, final };
      };
      switch (inputType) {
        case 'initial': {
          setSelectedDate((prevSelectedDate) => {
            const { inicial, final } = verifyDateRangeOrder(rawDate, prevSelectedDate.final);
            const updatedState: SelectedDateType = { inicial, final };
            return updatedState;
          });
          const { inicial, final } = verifyDateRangeOrder(rawDate, selectedDate.final);
          props.onChange?.({
            target: {
              name: props.name,
              value: {
                [initialName]: returnValueType === 'default' ? inicial?.format(TOKEN_ISO_FORMAT) : inicial?.toISOString(),
                [finalName]: returnValueType === 'default' ? final?.format(TOKEN_ISO_FORMAT) : final?.toISOString(),
              } as any,
            },
          } as React.ChangeEvent<HTMLInputElement>);
          requestAnimationFrame(() => {
            if (!typing) finalInputRef.current?.focus?.();
          });
          break;
        }
        case 'final': {
          setSelectedDate((prevSelectedDate) => {
            const { inicial, final } = verifyDateRangeOrder(prevSelectedDate.inicial, rawDate);
            const updatedState: SelectedDateType = { inicial, final };
            return updatedState;
          });
          const { inicial, final } = verifyDateRangeOrder(selectedDate.inicial, rawDate);
          props.onChange?.({
            target: {
              name: props.name,
              value: {
                [initialName]: returnValueType === 'default' ? inicial?.format(TOKEN_ISO_FORMAT) : inicial?.toISOString(),
                [finalName]: returnValueType === 'default' ? final?.format(TOKEN_ISO_FORMAT) : final?.toISOString(),
              } as any,
            },
          } as React.ChangeEvent<HTMLInputElement>);
          if (shouldCloseOnSelect) handleChangeCalendarBoxState(false);
          break;
        }
        default:
          break;
      }
      setCalendarDisplayDate(rawDate.clone());
    };

    const handleChangeUpdateDateStateWithPredefinedPeriod = (period: DatePeriodTypes) => {
      const localOnChange = (initialDate: Moment, finalDate: Moment) => {
        const valueToUpdate = {
          [initialName]: returnValueType === 'default' ? initialDate.format(TOKEN_ISO_FORMAT) : initialDate.toISOString(),
          [finalName]: returnValueType === 'default' ? finalDate.format(TOKEN_ISO_FORMAT) : finalDate.toISOString(),
        };
        setSelectedDate(() => {
          const updatedState: SelectedDateType = {
            inicial: initialDate.clone(),
            final: finalDate.clone(),
          };
          return updatedState;
        });
        props.onChange?.({
          target: {
            name: props.name,
            value: valueToUpdate as any,
          },
        } as React.ChangeEvent<HTMLInputElement>);
      };

      switch (period) {
        case 'today': {
          const date = moment();
          localOnChange(date, date);
          break;
        }
        case 'week': {
          const startOfWeek = moment().startOf('week');
          const endOfWeek = moment().endOf('week');
          localOnChange(startOfWeek, endOfWeek);
          break;
        }
        case 'lastweek': {
          const startOfLastWeek = moment().add(-1, 'week').startOf('week');
          const endOfLastWeek = moment().add(-1, 'week').endOf('week');
          localOnChange(startOfLastWeek, endOfLastWeek);
          break;
        }
        case 'last15': {
          const startOfLastFifteenDays = moment().add(-14, 'd');
          const endOfLastFifteenDays = moment();
          localOnChange(startOfLastFifteenDays, endOfLastFifteenDays);
          break;
        }
        case 'month': {
          const startOfMonth = moment().startOf('month');
          const endOfMonth = moment().endOf('month');
          localOnChange(startOfMonth, endOfMonth);
          break;
        }
        case 'lastmonth': {
          const startOfMonth = moment().add(-1, 'month').startOf('month');
          const endOfMonth = moment().add(-1, 'month').endOf('month');
          localOnChange(startOfMonth, endOfMonth);
          break;
        }
        default:
          break;
      }
      finalInputRef?.current?.focus?.();
      if (shouldCloseOnSelect) handleChangeCalendarBoxState(false);
    };

    const handleOnBlurMaskInput = (
      event: React.FocusEvent<HTMLInputElement>, inputType: InputType,
    ) => {
      props?.onBlur?.(event);
      if (inputType === 'initial') {
        if (event.relatedTarget?.id !== finalInputName) handleChangeCalendarBoxState(false);
        if (calendarBoxOpen) {
          handleChangeActiveDescendant((selectedDate.inicial ?? moment()).format(TOKEN_ISO_FORMAT));
          setCalendarDisplayDate(selectedDate.inicial ?? moment());
        }
        if (_.size(initialUnmaskedValue) !== 8) {
          const date = moment(selectedDate.inicial, TOKEN_ISO_FORMAT);
          if (date.isValid()) { setInitialMaskValue(date.format(TOKEN_PTBR_FORMAT)); }
        }
      }
      if (inputType === 'final') {
        if (event.relatedTarget?.id !== initialInputName) handleChangeCalendarBoxState(false);
        if (calendarBoxOpen) {
          handleChangeActiveDescendant((selectedDate.final ?? moment()).format(TOKEN_ISO_FORMAT));
          setCalendarDisplayDate(selectedDate.final ?? moment());
        }
        if (_.size(finalUnmaskedValue) !== 8) {
          const date = moment(selectedDate.final, TOKEN_ISO_FORMAT);
          if (date.isValid()) { setFinalMaskValue(date.format(TOKEN_PTBR_FORMAT)); }
        }
      }
    };

    const handleOnFocusMaskInput = (
      event: React.FocusEvent<HTMLInputElement>, inputType: InputType,
    ) => {
      props?.onFocus?.(event);
      if (!readOnly && !calendarBoxOpen && openCalendarOnFocus) {
        setCalendarBoxOpen(true);
      }
      if (inputType === 'initial') {
        handleChangeActiveDescendant((selectedDate.inicial ?? moment()).format(TOKEN_ISO_FORMAT));
        setCalendarDisplayDate(selectedDate.inicial ?? moment());
      }
      if (inputType === 'final') {
        handleChangeActiveDescendant((selectedDate.final ?? moment()).format(TOKEN_ISO_FORMAT));
        setCalendarDisplayDate(selectedDate.final ?? moment());
      }
    };

    const handleOnKeyDownMaskInput = (
      event: React.KeyboardEvent<HTMLInputElement>, inputType: InputType,
    ) => {
      props?.onKeyDown?.(event);
      if (calendarBoxOpen && event.key && 
        !event.shiftKey && !event.altKey && event.key === Keys.enter) {
        event.preventDefault();
        const rawDate = moment(_.toString(activeDescendant), TOKEN_ISO_FORMAT);
        handleChangeUpdateDateState({ date: rawDate, inputType });
      }
    };

    const handleOnPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
      if (undigitable) {
        event.preventDefault();
      } else {
        props.onPaste?.(event);
      }
    };

    const handleOnBeforeInput = (event: React.InputEvent<HTMLInputElement>) => {
      if (undigitable) {
        event.preventDefault();
      } else {
        props.onBeforeInput?.(event);
      }
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (calendarBoxOpen && event.key && !event.shiftKey && 
        !event.altKey && NAVIGATION_KEYS.includes(event.key)) {
        event.preventDefault();
        switch (event.key) {
          case Keys.arrowLeft: handleNavigateWithDays(-1);
            break;
          case Keys.arrowRight: handleNavigateWithDays(1);
            break;
          case Keys.arrowUp: handleNavigateWithDays(-7);
            break;
          case Keys.arrowDown: handleNavigateWithDays(7);
            break;
          case Keys.pageUp: handleChangeNextMonth();
            break;
          case Keys.pageDown: handleChangePreviousMonth();
            break;
          case Keys.home: handleNavigateWithWeeks('start');
            break;
          case Keys.end: handleNavigateWithWeeks('end');
            break;
          case Keys.escape: handleChangeCalendarBoxState(false);
            break;
          default:
            break;
        }
      }
    };

    React.useEffect(() => {
      if (props?.value) {
        const objectValue = props.value as Partial<{ [x: string]: string | undefined }>;
        const initialDate = moment(_.toString(objectValue[initialName]), TOKEN_ISO_FORMAT);
        const finalDate = moment(_.toString(objectValue[finalName]), TOKEN_ISO_FORMAT);
        setSelectedDate(() => ({
          inicial: initialDate.isValid() ? initialDate : null,
          final: finalDate.isValid() ? finalDate : null,
        }));
        setInitialMaskValue(initialDate.format(TOKEN_PTBR_FORMAT));
        setFinalMaskValue(finalDate.format(TOKEN_PTBR_FORMAT));
      }
    }, [props?.value]);

    const contextValues = ({
      isReadOnly: Boolean(readOnly), isDisabled: Boolean(readOnly), undigitable, skeletonize, 
      dateContainerRef, calendarBoxOpen, activeDescendant, selectedDate, 
      initialInputId: initialInputName, finalInputId: finalInputName, initialInputRef, 
      finalInputRef, showCalendarButton, calendarDisplayDate, hasValidationErrors, 
      openCalendarOnFocus, showPredefinedPeriodsButton, showClearDateButton, 
      handleChangeSelectedDate, handleChangePreviousMonth, handleChangeNextMonth, 
      handleChangeCalendarBoxState, handleChangeActiveDescendant, handleChangeCalendarDisplayDate, 
      handleChangeUpdateDateState, handleOnClickClearSelectedPeriod, 
      handleChangeUpdateDateStateWithPredefinedPeriod, 
      hasValidPeriodSelected: verifyPeriodSelectedIsValid(),
    });

    return (
      <React.Fragment>
        <DatePeriodFieldContext.Provider value={contextValues}>
          <BaseDate.Root
            ref={inputRootRef}
            data-testid="test-date-period-field-root"
            data-state-error={hasValidationErrors}
            customClassWrapper={customClassWrapper}>
            {hasLabel && (
            <BaseDate.Label
              data-testid="test-date-period-field-label"
              label={label}
              inputId={initialInputName}
              hint={props?.hint}
              isDisabled={disabled}
              isReadOnly={readOnly}
              skeletonize={skeletonize}
              required={props?.required}
              hintPosition={hintPosition}
              themePopover={themePopover}
              popoverAlign={popoverAlign}
              labelUppercase={labelUppercase}
              hasHintMessages={hasHintMessages}
              customClassLabel={customClassLabel} />
            )}
            <BaseDate.Container
              ref={dateContainerRef}
              data-testid="test-date-period-field-container"
              onKeyDown={handleOnKeyDown}
              skeletonize={skeletonize}
              customClassInputContainer={customClassInputContainer}>
              <BaseDate.Input
                {..._.omit(rest, ['initialRef', 'finalRef'])}
                ref={mergeRefs(initialInputRef, props?.initialRef)}
                id={initialInputName}
                name={initialInputName}
                value={initialMaskedValue}
                disabled={disabled}
                readOnly={readOnly}
                customClass={customClass}
                tabIndex={(!readOnly && !skeletonize) ? 0 : -1}
                placeholder={placeholder}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendant}
                aria-expanded={calendarBoxOpen}
                aria-controls={initialInputName}
                aria-labelledby={initialInputName}
                data-testid="test-date-period-field-initial-input"
                data-state-is-period-input={true}
                data-state-error={hasValidationErrors}
                data-state-read-only={readOnly}
                data-state-text-align={textAlign}
                data-state-undigitable={undigitable}
                data-state-skeletonize={skeletonize}
                onPaste={handleOnPaste}
                onBeforeInput={handleOnBeforeInput}
                onBlur={event => handleOnBlurMaskInput(event, 'initial')}
                onFocus={event => handleOnFocusMaskInput(event, 'initial')}
                onKeyDown={event => handleOnKeyDownMaskInput(event, 'initial')} />
              <span
                className="separator"
                data-state-disabled={disabled}
                data-state-read-only={readOnly}
                onMouseDown={(event) => { event.preventDefault(); }}>
                <Icon name="arrow_right" size={10} />
              </span>
              <BaseDate.Input
                {..._.omit(rest, ['initialRef', 'finalRef'])}
                ref={mergeRefs(finalInputRef, props?.finalRef)}
                id={finalInputName}
                name={finalInputName}
                value={finalMaskedValue}
                readOnly={readOnly}
                disabled={disabled}
                customClass={customClass}
                tabIndex={(!readOnly && !skeletonize) ? 0 : -1}
                placeholder={placeholder}
                aria-autocomplete="list"
                aria-activedescendant={activeDescendant}
                aria-expanded={calendarBoxOpen}
                aria-controls={finalInputName}
                aria-labelledby={finalInputName}
                data-testid="test-date-period-field-final-input"
                data-state-is-period-input={true}
                data-state-error={hasValidationErrors}
                data-state-read-only={readOnly}
                data-state-text-align={textAlign}
                data-state-undigitable={undigitable}
                data-state-skeletonize={skeletonize}
                onPaste={handleOnPaste}
                onBeforeInput={handleOnBeforeInput}
                onBlur={event => handleOnBlurMaskInput(event, 'final')}
                onFocus={event => handleOnFocusMaskInput(event, 'final')}
                onKeyDown={event => handleOnKeyDownMaskInput(event, 'final')} />
              <Triggers />
            </BaseDate.Container>
            {calendarBoxOpen &&
              createPortal(<CalendarBox ref={calendarRef} />, document.body)
          }
            {hintPosition === 'below' && (
            <Hint
              customClass="hint"
              description={props.hint}
              disabled={disabled}
              skeletonize={skeletonize}
              visible={hasHintMessages} />
            )}
            {hasValidationErrors && (
            <span
              data-testid="test-date-period-field-list-errors"
              className="error"
              data-state-skeletonize={skeletonize}
              aria-describedby={String(label).concat('-errors')}>
              {errors?.map((error, index) => (
                <React.Fragment key={`${index + 1}-${error}`}>
                  {error}
                  {' '}
                </React.Fragment>
              ))}
            </span>
            )}
          </BaseDate.Root>
        </DatePeriodFieldContext.Provider>
        <Tooltip
          targetRef={inputRootRef}
          text={tooltip}
          width={tooltipWidth}
          position={tooltipPosition} />
      </React.Fragment>
    );
  });

InputBase.displayName = 'DatePeriodFieldInputBase';
