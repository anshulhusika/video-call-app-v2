import { useState } from 'react';
import { JoinRoom } from './components/JoinRoom';
import { VideoCall } from './components/VideoCall';
import { supabase } from './lib/supabase';

type AppState = {
  roomId: string | null;
  displayName: string | null;
  userId: string | null;
};

function App() {
  const [state, setState] = useState<AppState>({
    roomId: null,
    displayName: null,
    userId: null,
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async (roomName: string, displayName: string) => {
    try {
      setError(null);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error: createError } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          host_id: userId,
          status: 'waiting',
        })
        .select()
        .single();

      if (createError) throw createError;

      setState({
        roomId: data.id,
        displayName,
        userId,
      });
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.error('Create room error:', err);
    }
  };

  const handleJoinRoom = async (roomId: string, displayName: string) => {
    try {
      setError(null);
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Room not found. Please check the room ID.');
        return;
      }

      if (data.status === 'ended') {
        setError('This room has ended.');
        return;
      }

      setState({
        roomId: data.id,
        displayName,
        userId,
      });
    } catch (err) {
      setError('Failed to join room. Please try again.');
      console.error('Join room error:', err);
    }
  };

  const handleLeave = () => {
    setState({
      roomId: null,
      displayName: null,
      userId: null,
    });
    setError(null);
  };

  if (state.roomId && state.displayName && state.userId) {
    return (
      <VideoCall
        roomId={state.roomId}
        displayName={state.displayName}
        userId={state.userId}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <JoinRoom
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      error={error}
    />
  );
}

export default App;
