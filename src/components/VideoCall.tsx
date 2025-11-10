import { useEffect, useState, useCallback } from 'react';
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

  const peerId = `${userId}-${Date.now()}`;
  const { peers, initiateCall } = useWebRTC(roomId, peerId, localStream);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    startMedia();
  }, [startMedia]);

  useEffect(() => {
    if (!localStream) return;

    const joinRoom = async () => {
      await supabase.from('participants').insert({
        room_id: roomId,
        user_id: userId,
        peer_id: peerId,
        display_name: displayName,
        is_active: true,
      });

      await supabase.from('rooms').update({ status: 'active' }).eq('id', roomId);
    };

    joinRoom();

    return () => {
      supabase.from('participants').update({ is_active: false, left_at: new Date().toISOString() }).eq('peer_id', peerId);
    };
  }, [localStream, roomId, userId, peerId, displayName]);

  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}:participants`);

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newParticipant = payload.new as Participant;
          if (newParticipant.peer_id !== peerId && newParticipant.is_active) {
            setParticipants((prev) => [...prev, newParticipant]);
            await initiateCall(newParticipant.peer_id);
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedParticipant = payload.new as Participant;
          if (!updatedParticipant.is_active) {
            setParticipants((prev) => prev.filter((p) => p.peer_id !== updatedParticipant.peer_id));
          }
        }
      })
      .subscribe();

    const fetchExistingParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true)
        .neq('peer_id', peerId);

      if (data) {
        setParticipants(data);
        data.forEach((participant) => {
          initiateCall(participant.peer_id);
        });
      }
    };

    fetchExistingParticipants();

    return () => {
      channel.unsubscribe();
    };
  }, [roomId, peerId, initiateCall]);

  const handleEndCall = useCallback(async () => {
    await supabase
      .from('participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('peer_id', peerId);

    onLeave();
  }, [peerId, onLeave]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  const remotePeers = peers.filter((peer) => peer.peerId !== peerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

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
            <span className="text-sm font-medium hidden md:inline">
              {copied ? 'Copied!' : 'Copy Room ID'}
            </span>
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
