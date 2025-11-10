import { VideoTile } from './VideoTile';
import { useDraggable } from '../hooks/useDraggable';

type DraggableVideoTileProps = {
  stream: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
};

export function DraggableVideoTile({ stream, displayName, isLocal, isMuted, isVideoOff }: DraggableVideoTileProps) {
  const { position, isDragging, handleMouseDown, handleTouchStart } = useDraggable();

  return (
    <div
      className={`fixed w-40 h-52 md:w-48 md:h-64 z-50 transition-shadow duration-200 ${
        isDragging ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab shadow-xl'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <VideoTile
        stream={stream}
        displayName={displayName}
        isLocal={isLocal}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
      />
    </div>
  );
}
