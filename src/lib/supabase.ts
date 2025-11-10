import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Room = {
  id: string;
  name: string;
  host_id: string;
  status: 'waiting' | 'active' | 'ended';
  created_at: string;
  ended_at?: string;
};

export type Participant = {
  id: string;
  room_id: string;
  user_id: string;
  peer_id: string;
  display_name: string;
  joined_at: string;
  left_at?: string;
  is_active: boolean;
};

export type SignalingMessage = {
  id: string;
  room_id: string;
  from_peer_id: string;
  to_peer_id: string;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: Record<string, unknown>;
  created_at: string;
};
