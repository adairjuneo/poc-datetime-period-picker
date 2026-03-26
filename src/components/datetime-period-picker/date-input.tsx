import { useState, useEffect, useRef, useCallback } from 'react';
import { usePicker } from './context';
import { formatDatePtBr, applyMask } from './constants';
import type { ActiveField } from './types';

type DateInputProps = {
  field: 'initial' | 'final';
  placeholder?: string;
};

export function DateInput({ field, placeholder }: DateInputProps) {
  const picker = usePicker();
  const inputRef = useRef<HTMLInputElement>(null);
  const dateValue = field === 'initial' ? picker.initial : picker.final;
  const isActive = picker.activeField === field;

  const [localValue, setLocalValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [hasError, setHasError] = useState(false);

  const focusedDateId =
    picker.isOpen && isActive && picker.focusedDate
      ? `dtp-day-${picker.focusedDate.toISOString()}`
      : undefined;

  // Sync localValue whenever the controlled date value changes (e.g. calendar selection).
  // This runs even while focused — calendar clicks update dateValue externally and the
  // input must reflect it immediately, not wait for blur.
  useEffect(() => {
    setLocalValue(formatDatePtBr(dateValue, picker.variant));
    setHasError(false);
  }, [dateValue, picker.variant]);

  // Auto-focus when activeField changes to this field
  useEffect(() => {
    if (isActive && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    picker.setActiveField(field);
    picker.open();
  }, [field, picker]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Validate on blur: if incomplete or invalid, show error
    const expectedLen = picker.variant === 'datetime' ? 16 : 10;
    if (localValue.length > 0 && localValue.length < expectedLen) {
      setHasError(true);
    }
  }, [localValue, picker.variant]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const masked = applyMask(e.target.value, picker.variant);
      setLocalValue(masked);
      setHasError(false);
      picker.updateFromInput(field as ActiveField, masked);
    },
    [field, picker],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const masked = applyMask(pasted, picker.variant);
      setLocalValue(masked);
      picker.updateFromInput(field as ActiveField, masked);
    },
    [field, picker],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      picker.onInputKeyDown(e, field);
    },
    [picker, field],
  );

  const displayValue = isFocused ? localValue : formatDatePtBr(dateValue, picker.variant);
  const defaultPlaceholder = picker.variant === 'datetime' ? 'DD/MM/AAAA HH:mm' : 'DD/MM/AAAA';
  const maxLength = picker.variant === 'datetime' ? 16 : 10;

  const className = [
    'dtp-input',
    isActive ? 'dtp-input--active' : '',
    hasError ? 'dtp-input--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <input
      ref={inputRef}
      type="text"
      className={className}
      value={displayValue}
      placeholder={placeholder ?? defaultPlaceholder}
      maxLength={maxLength}
      disabled={picker.disabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onPaste={handlePaste}
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
