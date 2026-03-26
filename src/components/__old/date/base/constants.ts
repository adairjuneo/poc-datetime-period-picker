import { type CSSProperties, type RefObject, useEffect, useState } from "react";

export const useCalendarPosition = (
  calendarBoxOpen: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
) => {
  const [calendarBoxStyles, setCalendarBoxStyles] = useState<CSSProperties>({});

  useEffect(() => {
    const updatePosition = () => {
      const selectPositionOnScreen = containerRef.current?.getBoundingClientRect();
      if (selectPositionOnScreen) {
        const { top, left, width, height } = selectPositionOnScreen;
        setCalendarBoxStyles({
          top: top + height + window.scrollY,
          left: left + window.scrollX,
          width: width,
          position: 'absolute',
        });
      }
    };

    if (calendarBoxOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [calendarBoxOpen, containerRef]);

  return { calendarBoxStyles };
};
