import React from 'react';
import GridCol from '../../../gridlayout';
import type { OnDenied } from '../../../@types/PermissionAttr';
import { actionsOnPermissionDenied } from '../../../permissionValidations';
import { options } from '../helpers';
import type { DatePeriodFieldBaseProps, DatePeriodFieldProps } from './types';
import { InputBase } from './base';

const Input = React.forwardRef<HTMLInputElement, DatePeriodFieldProps>(({
  onDeniedActions, permissionAttr, disabled, readOnly, gridLayout, ...props
}, ref) => {
  const onDenied: OnDenied = React.useMemo(() => {
    return onDeniedActions || actionsOnPermissionDenied(options, permissionAttr);
  }, [onDeniedActions, permissionAttr]);
  const { hideContent, unvisible } = onDenied;
  const isReadOnly = Boolean(readOnly || onDenied.readOnly);
  const isDisabled = Boolean(disabled || onDenied.disabled);
  const inputProps = { 
    readOnly: isReadOnly, disabled: isDisabled, ...props, 
  } satisfies DatePeriodFieldBaseProps;

  if (unvisible || hideContent) return null;

  if (gridLayout) {
    return (
      <GridCol cols={gridLayout}>
        <InputBase ref={ref} {...inputProps} />
      </GridCol>
    );
  }

  return (
    <InputBase ref={ref} {...inputProps} />
  );
});

Input.displayName = 'DatePeriodFieldInput';

export { Input };
export type { DatePeriodFieldProps };
