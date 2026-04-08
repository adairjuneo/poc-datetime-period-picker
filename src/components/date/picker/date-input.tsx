// src/components/date/picker/date-input.tsx
import { useEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import { useIMask } from 'react-imask';
import { usePicker } from './context';
import { formatDatePtBr } from '../shared/constants';
import { buildMaskOptions, mergeRefs } from '../shared/date-input-utils';

export const DateInput = forwardRef<HTMLInputElement>(function DateInput(_props, externalRef) {
  const picker = usePicker();
  const dateValue = picker.date;

  const isExternalUpdate = useRef(false);
  const unmaskedRef = useRef('');
  const dateOnFocusRef = useRef<Date | null>(null);
  const dateValueRef = useRef(dateValue);
  dateValueRef.current = dateValue;

  const inputName = picker.componentName || undefined;

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string, mask) => {
      if (isExternalUpdate.current) return;

      if (mask.unmaskedValue === '') {
        picker.clearField();
        return;
      }

      picker.updateFromInput(value);
    },
  });

  unmaskedRef.current = unmaskedValue;

  // Sync iMask value when the controlled date value changes externally
  useEffect(() => {
    isExternalUpdate.current = true;
    setValue(formatDatePtBr(dateValue, picker.variant));
    queueMicrotask(() => {
      isExternalUpdate.current = false;
    });
  }, [dateValue, picker.variant, setValue]);

  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    if (picker.undigitable) {
      e.preventDefault();
    }
  }, [picker.undigitable]);

  const handleFocus = useCallback(() => {
    dateOnFocusRef.current = dateValueRef.current;
    picker.open();
  }, [picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    const len = unmaskedRef.current.length;

    if (len > 0 && len < expectedDigits) {
      const savedDate = dateOnFocusRef.current;
      if (savedDate) {
        setValue(formatDatePtBr(savedDate, picker.variant));
      } else {
        isExternalUpdate.current = true;
        setValue('');
        queueMicrotask(() => {
          isExternalUpdate.current = false;
        });
      }
    }
  }, [picker.variant, setValue]);

  const focusedDateId =
    picker.isOpen && picker.focusedDate
      ? `dp-day-${picker.focusedDate.toISOString()}`
      : undefined;

  return (
    <input
      ref={mergeRefs(maskRef, externalRef)}
      type="text"
      className="input"
      name={inputName}
      data-state-read-only={picker.readOnly || undefined}
      data-state-undigitable={picker.undigitable || undefined}
      disabled={picker.disabled}
      readOnly={picker.readOnly || picker.undigitable}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="combobox"
      aria-haspopup="dialog"
      aria-expanded={picker.isOpen}
      aria-activedescendant={focusedDateId}
      aria-label="Data"
    />
  );
});
