import { Mic, MicOff, Video, VideoOff, Phone, PhoneOff } from 'lucide-react';

type CallControlsProps = {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
};

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleAudio}
            className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
              isAudioEnabled
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition-all duration-300 transform hover:scale-110 ${
              isVideoEnabled
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
            title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={onEndCall}
            className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-300 transform hover:scale-110 hover:rotate-[135deg]"
            title="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
