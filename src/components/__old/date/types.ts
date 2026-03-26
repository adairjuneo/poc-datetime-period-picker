import { ComponentPropsWithoutRef, MouseEvent } from 'react';
import type { ColorTheme } from '../../@types/ColorStyles';
import type { Position, HintPosition } from '../../@types/Position';

export type DateValueReturnType = 'default' | 'iso';
export enum Keys {
  arrowLeft = 'ArrowLeft',
  arrowRight = 'ArrowRight',
  arrowUp = 'ArrowUp',
  arrowDown = 'ArrowDown',
  pageUp = 'PageUp',
  pageDown = 'PageDown',
  home = 'Home',
  end = 'End',
  escape = 'Escape',
  enter = 'Enter'
}
export interface BaseDateInputRootProps extends ComponentPropsWithoutRef<'div'> {
  customClassWrapper?: string;
  hasValidationErrors?: boolean;
}
export interface BaseDateInputLabelProps extends ComponentPropsWithoutRef<'span'> {
  hint?: string;
  customClassLabel?: string;
  skeletonize?: boolean;
  label?: string;
  inputId?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  required?: boolean;
  labelUppercase?: boolean;
  hasHintMessages?: boolean;
  hintPosition?: HintPosition;
  themePopover?: ColorTheme;
  popoverAlign?: Extract<Position, 'left' | 'right'>;
}
export interface BaseDateInputContainerProps extends ComponentPropsWithoutRef<'div'> {
  skeletonize?: boolean;
  customClassInputContainer?: string;
}
type InputHTMLProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'multiple'>;
export interface BaseDateInputProps extends InputHTMLProps {
  customClass?: string;
}
export interface BaseDateInputTriggersProps extends ComponentPropsWithoutRef<'div'> {
  isDisabled?: boolean;
  isReadOnly?: boolean;
  skeletonize?: boolean;
  inputFieldId?: string;
  calendarBoxOpen?: boolean;
  showClearButton?: boolean;
  showCalendarButton?: boolean;
  hasValidDateSelection?: boolean;
  hasValidPeriodSelected?: boolean;
  clearButtonTestId?: string;
  calendarButtonTestId?: string;
  onClearSelectedDate: () => void,
  onClickTriggerCalendar: (event: MouseEvent<HTMLButtonElement>) => void,
}
