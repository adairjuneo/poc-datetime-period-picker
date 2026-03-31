import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIMask } from 'react-imask';
import IMask from 'imask';
import type { FactoryOpts } from 'imask';
import moment from 'moment';
import { usePicker } from './context';
import { formatDatePtBr } from './constants';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
};

function buildMaskOptions(variant: 'date' | 'datetime') {
  const blocks: Record<string, unknown> = {
    d: { mask: IMask.MaskedRange, from: 1, to: 31, maxLength: 2 },
    m: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2 },
    Y: { mask: IMask.MaskedRange, from: 1900, to: 2099, maxLength: 4 },
  };

  if (variant === 'datetime') {
    blocks.H = { mask: IMask.MaskedRange, from: 0, to: 23, maxLength: 2 };
    blocks.M = { mask: IMask.MaskedRange, from: 0, to: 59, maxLength: 2 };
  }

  const pattern = variant === 'datetime' ? '`d/`m/`Y `H:`M' : '`d/`m/`Y';
  const fmt = variant === 'datetime' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';

  return {
    mask: Date,
    pattern,
    lazy: false,
    placeholderChar: '_',
    overwrite: true,
    autofix: false,
    blocks,
    format: (date: Date) => moment(date).format(fmt),
    parse: (str: string) => moment(str, fmt).toDate(),
  // Cast needed: iMask's FactoryOpts type doesn't cover MaskedDate-specific
  // options (blocks, format, parse). The runtime config is correct.
  } as unknown as FactoryOpts;
}

export function DateInput({ field }: DateInputProps) {
  const picker = usePicker();
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const [hasError, setHasError] = useState(false);
  const isExternalUpdate = useRef(false);
  const unmaskedRef = useRef('');

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  // inputRef gives direct DOM access (for .focus()); maskRef is the callback
  // ref that useIMask uses to bind its event listeners to the <input>.
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string) => {
      if (isExternalUpdate.current) return;
      setHasError(false);
      picker.updateFromInput(field as ActiveField, value);
    },
  });

  // Keep ref in sync so handleBlur reads latest value without re-creating
  unmaskedRef.current = unmaskedValue;

  // Sync iMask value when the controlled date value changes externally
  // (e.g., calendar selection, parent prop change)
  useEffect(() => {
    isExternalUpdate.current = true;
    setValue(formatDatePtBr(dateValue, picker.variant));
    setHasError(false);
    // Use queueMicrotask to reset the guard after iMask processes the setValue
    queueMicrotask(() => {
      isExternalUpdate.current = false;
    });
  }, [dateValue, picker.variant, setValue]);

  // Auto-focus when activeField changes to this field
  useEffect(() => {
    if (isActive && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleFocus = useCallback(() => {
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    if (unmaskedRef.current.length > 0 && unmaskedRef.current.length < expectedDigits) {
      setHasError(true);
    }
  }, [picker.variant]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      picker.onInputKeyDown(e, field);
    },
    [picker, field],
  );

  const focusedDateId =
    picker.isOpen && isActive && picker.focusedDate
      ? `dtp-day-${picker.focusedDate.toISOString()}`
      : undefined;

  return (
    <input
      ref={maskRef}
      type="text"
      className="input"
      data-state-active={isActive || undefined}
      data-state-error={hasError || undefined}
      disabled={picker.disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={picker.isOpen && isActive}
      aria-activedescendant={focusedDateId}
      aria-label={field === 'initial' ? 'Data inicial' : 'Data final'}
      data-field={field}
    />
  );
}
