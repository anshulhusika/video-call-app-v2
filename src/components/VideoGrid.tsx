import { VideoTile } from './VideoTile';
import { Peer } from '../hooks/useWebRTC';

type VideoGridProps = {
  peers: Peer[];
  onExpandPeer?: (peerId: string) => void;
};

export function VideoGrid({ peers, onExpandPeer }: VideoGridProps) {
  const getGridClass = () => {
    const count = peers.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  if (peers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-400/20 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 animate-pulse" />
          </div>
          <p className="text-white text-xl font-medium">Waiting for others to join...</p>
          <p className="text-white/70 text-sm mt-2">Share the room link to invite participants</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 grid ${getGridClass()} gap-4 p-4 auto-rows-fr`}>
      {peers.map((peer) => (
        <div key={peer.peerId} className="min-h-[200px] md:min-h-[300px]">
          <VideoTile
            stream={peer.stream}
            displayName={peer.displayName}
            onExpand={() => onExpandPeer?.(peer.peerId)}
          />
        </div>
      ))}
    </div>
  );
}
