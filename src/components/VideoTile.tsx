import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Maximize2 } from 'lucide-react';

type VideoTileProps = {
  stream: MediaStream | null;
  displayName: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  onExpand?: () => void;
};

export function VideoTile({ stream, displayName, isLocal, isMuted, isVideoOff, onExpand }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl group">
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium flex items-center gap-2 shadow-lg">
        <span>{displayName}</span>
        {isMuted ? (
          <MicOff className="w-4 h-4 text-red-400" />
        ) : (
          <Mic className="w-4 h-4 text-green-400" />
        )}
      </div>

      {isVideoOff && (
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm p-2 rounded-full shadow-lg">
          <VideoOff className="w-5 h-5 text-red-400" />
        </div>
      )}

      {onExpand && (
        <button
          onClick={onExpand}
          className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 p-2 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
        >
          <Maximize2 className="w-5 h-5 text-white" />
        </button>
      )}

      {isLocal && (
        <div className="absolute bottom-4 left-4 bg-blue-500/80 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-semibold shadow-lg">
          YOU
        </div>
      )}
    </div>
  );
}
