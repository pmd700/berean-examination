import React, { useRef, useEffect } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function VideoTile({
  stream,
  name,
  avatarUrl,
  isMuted,
  isCameraOff,
  isLocal = false,
  isScreenShare = false,
  className = '',
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const showVideo = stream && !isCameraOff;

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden ${className}`}>
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'mirror' : ''}`}
          style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <UserAvatar name={name} avatarUrl={avatarUrl} size="xl" />
        </div>
      )}

      {/* Overlay indicators */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-xs text-white bg-black/60 rounded-full px-2 py-0.5 backdrop-blur-sm">
          {isLocal ? 'You' : name}
        </span>
        {isMuted && (
          <span className="bg-red-600/90 rounded-full p-1 backdrop-blur-sm">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
        {isCameraOff && !isScreenShare && (
          <span className="bg-gray-600/90 rounded-full p-1 backdrop-blur-sm">
            <VideoOff className="w-3 h-3 text-white" />
          </span>
        )}
      </div>

      {isScreenShare && (
        <div className="absolute top-2 left-2">
          <span className="text-[10px] bg-green-600/90 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
            Screen Share
          </span>
        </div>
      )}
    </div>
  );
}