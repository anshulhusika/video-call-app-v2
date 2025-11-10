import { useState, useCallback, useRef, useEffect } from 'react';

export type Position = {
  x: number;
  y: number;
};

export function useDraggable(initialPosition?: Position) {
  const [position, setPosition] = useState<Position>(initialPosition || { x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  }, [position]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position.x,
      initialY: position.y,
    };
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragRef.current) {
        const deltaX = e.clientX - dragRef.current.startX;
        const deltaY = e.clientY - dragRef.current.startY;

        const newX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.initialX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + deltaY));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && dragRef.current) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragRef.current.startX;
        const deltaY = touch.clientY - dragRef.current.startY;

        const newX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.initialX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 200, dragRef.current.initialY + deltaY));

        setPosition({ x: newX, y: newY });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  return {
    position,
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
}
