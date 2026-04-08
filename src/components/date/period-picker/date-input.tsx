import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useIMask } from 'react-imask';
import { usePicker } from './context';
import { formatDatePtBr } from '../shared/constants';
import { buildMaskOptions, mergeRefs } from '../shared/date-input-utils';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
  externalRef?: React.RefObject<HTMLInputElement | null>;
};

export function DateInput({ field, externalRef }: DateInputProps) {
  const picker = usePicker();
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const isExternalUpdate = useRef(false);
  const unmaskedRef = useRef('');
  const dateOnFocusRef = useRef<Date | null>(null);
  const dateValueRef = useRef(dateValue);
  dateValueRef.current = dateValue;

  const fieldInputName = field === 'initial' ? picker.initialName : picker.finalName;
  const inputName = picker.componentName ? `${picker.componentName}.${fieldInputName}` : fieldInputName;

  const maskOptions = useMemo(
    () => buildMaskOptions(picker.variant),
    [picker.variant],
  );

  // inputRef gives direct DOM access (for .focus()); maskRef is the callback
  // ref that useIMask uses to bind its event listeners to the <input>.
  const inputRef = useRef<HTMLInputElement>(null);
  const { ref: maskRef, setValue, unmaskedValue } = useIMask(maskOptions, {
    ref: inputRef,
    onAccept: (value: string, mask) => {
      if (isExternalUpdate.current) return;

      if (mask.unmaskedValue === '') {
        picker.clearField(field as ActiveField);
        return;
      }

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
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    const expectedDigits = picker.variant === 'datetime' ? 12 : 8;
    const len = unmaskedRef.current.length;

    if (len > 0 && len < expectedDigits) {
      const savedDate = dateOnFocusRef.current;
      if (savedDate) {
        // Restore the previous date — let onAccept propagate to parent
        setValue(formatDatePtBr(savedDate, picker.variant));
      } else {
        // No previous date: clear to placeholder, guard to avoid extra onChange
        isExternalUpdate.current = true;
        setValue('');
        queueMicrotask(() => {
          isExternalUpdate.current = false;
        });
      }
    }
  }, [picker.variant, setValue]);

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
      ref={mergeRefs(maskRef, externalRef)}
      type="text"
      className="input"
      name={inputName}
      data-state-active={isActive || undefined}
      data-state-read-only={picker.readOnly || undefined}
      data-state-undigitable={picker.undigitable || undefined}
      disabled={picker.disabled}
      readOnly={picker.readOnly || picker.undigitable}
      onBeforeInput={handleBeforeInput}
      onPaste={handlePaste}
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
