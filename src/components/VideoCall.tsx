import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase, Participant } from '../lib/supabase';
import { useMediaStream } from '../hooks/useMediaStream';
import { useWebRTC } from '../hooks/useWebRTC';
import { VideoGrid } from './VideoGrid';
import { DraggableVideoTile } from './DraggableVideoTile';
import { CallControls } from './CallControls';
import { Copy, Check, Users } from 'lucide-react';

type VideoCallProps = {
  roomId: string;
  displayName: string;
  userId: string;
  onLeave: () => void;
};

export function VideoCall({ roomId, displayName, userId, onLeave }: VideoCallProps) {
  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    error: mediaError,
    startMedia,
    toggleAudio,
    toggleVideo,
  } = useMediaStream();

  // Make peerId stable for component lifetime
  const peerIdRef = useRef(`${userId}-${Math.random().toString(36).slice(2, 9)}`);
  const peerId = peerIdRef.current;

  // UseWebRTC should be resilient to localStream being null initially.
  const { peers, initiateCall } = useWebRTC(roomId, peerId, localStream);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);

  // start media on mount
  useEffect(() => {
    startMedia();
  }, [startMedia]);

  // Insert participant row once localStream is available
  useEffect(() => {
    if (!localStream) return;

    let isMounted = true;

    const joinRoom = async () => {
      try {
        await supabase.from('participants').insert({
          room_id: roomId,
          user_id: userId,
          peer_id: peerId,
          display_name: displayName,
          is_active: true,
        });

        await supabase.from('rooms').update({ status: 'active' }).eq('id', roomId);
      } catch (err) {
        console.error('joinRoom error', err);
      }
    };

    joinRoom();

    return () => {
      if (!isMounted) return;
      (async () => {
  try {
    await supabase
      .from('participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('peer_id', peerId);
  } catch (e) {
    console.warn('failed to mark participant left', e);
  }
})();

      isMounted = false;
    };
  }, [localStream, roomId, userId, peerId, displayName]);

  // Subscribe to participant changes (INSERT/UPDATE)
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}:participants`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT') {
              const newParticipant = payload.new as Participant;
              if (newParticipant.peer_id !== peerId && newParticipant.is_active) {
                setParticipants((prev) => {
                  // avoid duplicates
                  if (prev.some((p) => p.peer_id === newParticipant.peer_id)) return prev;
                  return [...prev, newParticipant];
                });
                await initiateCall(newParticipant.peer_id);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedParticipant = payload.new as Participant;
              if (!updatedParticipant.is_active) {
                setParticipants((prev) => prev.filter((p) => p.peer_id !== updatedParticipant.peer_id));
              }
            }
          } catch (err) {
            console.error('participant change handler error', err);
          }
        }
      )
      .subscribe();

    // fetch existing participants
    const fetchExistingParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .neq('peer_id', peerId);
      if (data) {
        setParticipants((prev) => {
          const ids = new Set(prev.map((p) => p.peer_id));
          const merged = [...prev];
          for (const p of data) {
            if (!ids.has(p.peer_id)) merged.push(p);
            // initiate call for each (hook will ignore duplicates)
            initiateCall(p.peer_id).catch((e) => console.error('initiateCall error', e));
          }
          return merged;
        });
      }
    };

    fetchExistingParticipants().catch((e) => console.error(e));

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, peerId, initiateCall]);

  const handleEndCall = useCallback(async () => {
    try {
      await supabase
        .from('participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('peer_id', peerId);
    } catch (err) {
      console.error('end call update failed', err);
    } finally {
      onLeave();
    }
  }, [peerId, onLeave]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  // Filter peers using the stable peerId
  const remotePeers = peers.filter((peer) => peer.peerId !== peerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col relative overflow-hidden">
      {/* ... header and UI unchanged ... */}

      <div className="relative z-10 flex flex-col h-screen">
        <div className="p-4 flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Video Call</h2>
              <p className="text-white/70 text-sm">{participants.length + 1} participants</p>
            </div>
          </div>

          <button
            onClick={copyRoomId}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-white transition-all duration-200 border border-white/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-sm font-medium hidden md:inline">{copied ? 'Copied!' : 'Copy Room ID'}</span>
          </button>
        </div>

        {mediaError && (
          <div className="mx-4 mt-4 p-4 bg-red-500/20 backdrop-blur-sm border border-red-500/50 rounded-xl text-red-200">
            {mediaError}
          </div>
        )}

        <VideoGrid peers={remotePeers} />

        {localStream && (
          <DraggableVideoTile
            stream={localStream}
            displayName={displayName}
            isLocal
            isMuted={!isAudioEnabled}
            isVideoOff={!isVideoEnabled}
          />
        )}

        <CallControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
}
