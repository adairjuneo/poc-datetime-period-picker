import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';

type DropdownProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
};

type Position = {
  above: boolean;
  alignRight: boolean;
};

export function Dropdown({ anchorRef, isOpen, onClose, ariaLabel = 'Selecionar data', children }: DropdownProps) {
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
    if (!isOpen) return;

    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="dropdown"
      data-state-above={position.above || undefined}
      data-state-align-right={position.alignRight || undefined}
      role="dialog"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}
