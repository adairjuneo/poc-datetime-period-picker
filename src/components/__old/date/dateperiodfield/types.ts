import type { Moment } from 'moment';
import { ComponentPropsWithoutRef, RefObject } from 'react';
import type { TextAlign } from '../../../@types/Align';
import type { ColorTheme } from '../../../@types/ColorStyles';
import type { ITooltipCommonProps } from '../../../tooltip/types';
import type { Position, HintPosition } from '../../../@types/Position';
import type { OnDenied, PermissionAttr } from '../../../@types/PermissionAttr';
import type { DateValueReturnType } from '../types';

export type DatePeriodTypes = 'today' | 'week' | 'lastweek' | 'last15' | 'month' | 'lastmonth';
export type PeriodOptions = { id: DatePeriodTypes, label?: string; };
export type InputType = 'initial' | 'final';
export type SelectedDateType = { inicial: Moment | null, final: Moment | null };
export type UpdateDateStateParams = { date: Moment, inputType: InputType, typing?: boolean };
type InputHTMLProps = Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'multiple' | 'value'>;

export interface DatePeriodFieldBaseProps extends InputHTMLProps, ITooltipCommonProps {
  value?: any;
  initialName?: string;
  initialRef?: RefObject<HTMLInputElement | null>;
  finalName?: string;
  finalRef?: RefObject<HTMLInputElement | null>;
  hint?: string;
  label?: string;
  errors?: string[];
  customClass?: string;
  customClassLabel?: string;
  customClassWrapper?: string;
  customClassInputContainer?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  undigitable?: boolean;
  skeletonize?: boolean
  labelUppercase?: boolean;
  showCalendarButton?: boolean;
  openCalendarOnFocus?: boolean;
  shouldCloseOnSelect?: boolean;
  showClearDateButton?: boolean;
  showPredefinedPeriodsButton?: boolean;
  returnValueType?: DateValueReturnType;
  textAlign?: TextAlign;
  hintPosition?: HintPosition;
  themePopover?: ColorTheme;
  popoverAlign?: Extract<Position, 'left' | 'right'>;
}

export interface DatePeriodFieldProps extends DatePeriodFieldBaseProps {
  gridLayout?: string;
  permissionAttr?: PermissionAttr;
  onDeniedActions?: OnDenied;
}

export interface DatePeriodContextProps {
  initialInputId: string,
  finalInputId: string,
  activeDescendant: string,
  isReadOnly: boolean,
  isDisabled: boolean,
  undigitable: boolean,
  skeletonize: boolean,
  calendarBoxOpen: boolean,
  showCalendarButton: boolean,
  openCalendarOnFocus: boolean,
  hasValidationErrors: boolean,
  showClearDateButton: boolean,
  hasValidPeriodSelected: boolean,
  showPredefinedPeriodsButton: boolean,
  selectedDate: SelectedDateType;
  calendarDisplayDate: Moment,
  initialInputRef: RefObject<HTMLInputElement | null>,
  finalInputRef: RefObject<HTMLInputElement | null>,
  dateContainerRef: RefObject<HTMLDivElement | null>,
  handleChangeUpdateDateState: (params: UpdateDateStateParams) => void,
  handleChangeNextMonth: () => void,
  handleChangePreviousMonth: () => void,
  handleChangeCalendarBoxState: (value: boolean) => void,
  handleChangeActiveDescendant: (value: string) => void,
  handleChangeCalendarDisplayDate: (value: Moment) => void,
  handleOnClickClearSelectedPeriod: () => void,
  handleChangeUpdateDateStateWithPredefinedPeriod: (period: DatePeriodTypes) => void,
}
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
