export type Variant = 'date' | 'datetime';

export type CalendarCell = {
  date: Date;
  isCurrentMonth: boolean;
};

export type KeyboardEventLike = {
  key: string;
  preventDefault: () => void;
  stopPropagation: () => void;
};
