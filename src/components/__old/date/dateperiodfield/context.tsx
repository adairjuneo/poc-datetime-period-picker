import { createContext, useContext } from 'react';
import type { DatePeriodContextProps } from './types';

const DatePeriodFieldContext = createContext<DatePeriodContextProps>({} as DatePeriodContextProps);

const useDatePeriodFieldContext = (): DatePeriodContextProps => {
  const context = useContext(DatePeriodFieldContext);
  if (!context) {
    throw new Error('useDatePeriodFieldContext must be used within a DatePeriodFieldProvider');
  }
  return context;
};

export { DatePeriodFieldContext, useDatePeriodFieldContext };
