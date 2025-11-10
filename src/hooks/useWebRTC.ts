import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export type Peer = {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
};

export function useWebRTC(roomId: string, localPeerId: string, localStream: MediaStream | null) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalingSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from('signaling').insert({
          room_id: roomId,
          from_peer_id: localPeerId,
          to_peer_id: peerId,
          type: 'ice-candidate',
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (event) => {
      setPeers((prev) => {
        const existingPeer = prev.find((p) => p.peerId === peerId);
        if (existingPeer) {
          return prev.map((p) =>
            p.peerId === peerId ? { ...p, stream: event.streams[0] } : p
          );
        }
        return prev;
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupPeer(peerId);
      }
    };

    return pc;
  }, [localStream, roomId, localPeerId]);

  const cleanupPeer = useCallback((peerId: string) => {
    const pc = peerConnections.current.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(peerId);
    }
    setPeers((prev) => prev.filter((p) => p.peerId !== peerId));
  }, []);

  const handleOffer = useCallback(async (fromPeerId: string, offer: RTCSessionDescriptionInit) => {
    let pc = peerConnections.current.get(fromPeerId);
    if (!pc) {
      pc = createPeerConnection(fromPeerId);
      peerConnections.current.set(fromPeerId, pc);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await supabase.from('signaling').insert({
      room_id: roomId,
      from_peer_id: localPeerId,
      to_peer_id: fromPeerId,
      type: 'answer',
      payload: { answer: pc.localDescription?.toJSON() },
    });
  }, [createPeerConnection, roomId, localPeerId]);

  const handleAnswer = useCallback(async (fromPeerId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(fromPeerId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async (fromPeerId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(fromPeerId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const initiateCall = useCallback(async (remotePeerId: string) => {
    let pc = peerConnections.current.get(remotePeerId);
    if (!pc) {
      pc = createPeerConnection(remotePeerId);
      peerConnections.current.set(remotePeerId, pc);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await supabase.from('signaling').insert({
      room_id: roomId,
      from_peer_id: localPeerId,
      to_peer_id: remotePeerId,
      type: 'offer',
      payload: { offer: pc.localDescription?.toJSON() },
    });
  }, [createPeerConnection, roomId, localPeerId]);

  useEffect(() => {
    if (!roomId || !localPeerId) return;

    const channel = supabase.channel(`room:${roomId}:signaling`);

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'signaling',
        filter: `to_peer_id=eq.${localPeerId}`,
      }, async (payload) => {
        const signal = payload.new as { type: string; from_peer_id: string; payload: { offer?: RTCSessionDescriptionInit; answer?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit } };

        switch (signal.type) {
          case 'offer':
            if (signal.payload.offer) {
              await handleOffer(signal.from_peer_id, signal.payload.offer);
            }
            break;
          case 'answer':
            if (signal.payload.answer) {
              await handleAnswer(signal.from_peer_id, signal.payload.answer);
            }
            break;
          case 'ice-candidate':
            if (signal.payload.candidate) {
              await handleIceCandidate(signal.from_peer_id, signal.payload.candidate);
            }
            break;
        }
      })
      .subscribe();

    signalingSubscription.current = channel;

    return () => {
      channel.unsubscribe();
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
    };
  }, [roomId, localPeerId, handleOffer, handleAnswer, handleIceCandidate]);

  return { peers, initiateCall, cleanupPeer };
}
