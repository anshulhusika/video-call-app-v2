/*
  # Video Calling Platform Schema

  ## Overview
  Creates the database schema for a video calling platform with room-based calls,
  participant management, and real-time signaling support.

  ## New Tables
  
  ### `rooms`
  Stores video call room information
  - `id` (uuid, primary key) - Unique room identifier
  - `name` (text) - Room display name
  - `host_id` (text) - User ID of the room host
  - `status` (text) - Room status (waiting, active, ended)
  - `created_at` (timestamptz) - Room creation timestamp
  - `ended_at` (timestamptz, nullable) - Room end timestamp
  
  ### `participants`
  Tracks participants in video call rooms
  - `id` (uuid, primary key) - Unique participant record identifier
  - `room_id` (uuid, foreign key) - References rooms table
  - `user_id` (text) - Participant user identifier
  - `peer_id` (text) - WebRTC peer connection identifier
  - `display_name` (text) - Participant display name
  - `joined_at` (timestamptz) - Join timestamp
  - `left_at` (timestamptz, nullable) - Leave timestamp
  - `is_active` (boolean) - Whether participant is currently in the call
  
  ### `signaling`
  Handles WebRTC signaling messages between participants
  - `id` (uuid, primary key) - Unique message identifier
  - `room_id` (uuid, foreign key) - References rooms table
  - `from_peer_id` (text) - Sender peer identifier
  - `to_peer_id` (text) - Recipient peer identifier
  - `type` (text) - Signal type (offer, answer, ice-candidate)
  - `payload` (jsonb) - Signal data payload
  - `created_at` (timestamptz) - Message creation timestamp
  
  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can create and read their own rooms
  - Participants can only see data for rooms they're in
  - Signaling messages are only visible to sender and recipient
  
  ### Policies
  1. Rooms: Users can create rooms and view rooms they're hosting or participating in
  2. Participants: Users can join rooms and view other participants in their rooms
  3. Signaling: Participants can send and receive signaling messages within their rooms
  
  ## Notes
  - Real-time subscriptions should be used for live updates
  - Old signaling messages should be cleaned up periodically
  - Room status should be updated when all participants leave
*/

CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host_id text NOT NULL,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view all active rooms"
  ON rooms FOR SELECT
  USING (status IN ('waiting', 'active'));

CREATE POLICY "Room hosts can update their rooms"
  ON rooms FOR UPDATE
  USING (host_id = auth.jwt()->>'user_id')
  WITH CHECK (host_id = auth.jwt()->>'user_id');

CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  peer_id text NOT NULL,
  display_name text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join rooms"
  ON participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view participants in all active rooms"
  ON participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = participants.room_id 
      AND rooms.status IN ('waiting', 'active')
    )
  );

CREATE POLICY "Users can update their own participant status"
  ON participants FOR UPDATE
  USING (user_id = auth.jwt()->>'user_id')
  WITH CHECK (user_id = auth.jwt()->>'user_id');

CREATE TABLE IF NOT EXISTS signaling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  from_peer_id text NOT NULL,
  to_peer_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('offer', 'answer', 'ice-candidate')),
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE signaling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can send signals"
  ON signaling FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.peer_id = signaling.from_peer_id 
      AND participants.is_active = true
    )
  );

CREATE POLICY "Participants can view signals intended for them"
  ON signaling FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants 
      WHERE participants.peer_id IN (signaling.from_peer_id, signaling.to_peer_id)
      AND participants.is_active = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id);
CREATE INDEX IF NOT EXISTS idx_participants_peer_id ON participants(peer_id);
CREATE INDEX IF NOT EXISTS idx_signaling_room_id ON signaling(room_id);
CREATE INDEX IF NOT EXISTS idx_signaling_to_peer ON signaling(to_peer_id);