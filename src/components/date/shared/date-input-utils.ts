import type React from 'react';
import IMask from 'imask';
import type { FactoryOpts } from 'imask';
import moment from 'moment';

export function mergeRefs<T>(...refs: (React.Ref<T> | undefined)[]) {
  return (instance: T | null) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(instance);
      } else if (ref && typeof ref === 'object') {
        (ref as React.RefObject<T | null>).current = instance;
      }
    }
  };
}

export function buildMaskOptions(variant: 'date' | 'datetime') {
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
