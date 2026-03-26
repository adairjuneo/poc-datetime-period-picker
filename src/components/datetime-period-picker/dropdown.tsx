import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { usePicker } from './context';

type DropdownProps = {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
};

type Position = {
  above: boolean;
  alignRight: boolean;
};

export function Dropdown({ anchorRef, children }: DropdownProps) {
  const picker = usePicker();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({ above: false, alignRight: false });

  // Calculate position relative to anchor
  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !dropdownRef.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - anchorRect.bottom;
    const spaceRight = viewportWidth - anchorRect.left;

    setPosition({
      above: spaceBelow < dropdownRect.height && anchorRect.top > dropdownRect.height,
      alignRight: spaceRight < dropdownRect.width,
    });
  }, [anchorRef]);

  // Recalculate on open, resize, scroll
  useEffect(() => {
    if (!picker.isOpen) return;

    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [picker.isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!picker.isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        picker.close();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [picker.isOpen, picker, anchorRef]);

  if (!picker.isOpen) return null;

  const className = [
    'dtp-dropdown',
    position.above ? 'dtp-dropdown--above' : '',
    position.alignRight ? 'dtp-dropdown--align-right' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={dropdownRef} className={className} role="dialog" aria-label="Selecionar período">
      {children}
    </div>
  );
}
