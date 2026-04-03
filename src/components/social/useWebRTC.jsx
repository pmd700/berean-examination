import { useState, useRef, useCallback, useEffect } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function useWebRTC({ onIceCandidate, onTrack, onConnectionStateChange }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) onIceCandidate?.(e.candidate);
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (stream) {
        setRemoteStream(stream);
        onTrack?.(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(pc.connectionState);
    };

    pcRef.current = pc;
    return pc;
  }, [onIceCandidate, onTrack, onConnectionStateChange]);

  const getLocalMedia = useCallback(async () => {
    let stream = null;
    let error = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (e1) {
      // Try audio only
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        error = 'Camera unavailable — joining with audio only.';
      } catch (e2) {
        // Try video only
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
          error = 'Microphone unavailable — joining with video only.';
        } catch (e3) {
          error = 'Camera and microphone unavailable. Please check your browser permissions.';
        }
      }
    }

    if (error) setMediaError(error);
    if (stream) {
      localStreamRef.current = stream;
      setLocalStream(stream);
    }
    return stream;
  }, []);

  const addLocalTracks = useCallback((pc, stream) => {
    if (!stream || !pc) return;
    const existingSenders = pc.getSenders();
    stream.getTracks().forEach((track) => {
      const existing = existingSenders.find(s => s.track?.kind === track.kind);
      if (!existing) {
        pc.addTrack(track, stream);
      }
    });
  }, []);

  const createOffer = useCallback(async () => {
    const stream = await getLocalMedia();
    const pc = createPeerConnection();
    if (stream) addLocalTracks(pc, stream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer.sdp;
  }, [getLocalMedia, createPeerConnection, addLocalTracks]);

  const createAnswer = useCallback(async (offerSdp) => {
    const stream = await getLocalMedia();
    const pc = createPeerConnection();
    if (stream) addLocalTracks(pc, stream);

    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer.sdp;
  }, [getLocalMedia, createPeerConnection, addLocalTracks]);

  const setRemoteAnswer = useCallback(async (answerSdp) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));
    }
  }, []);

  const addIceCandidate = useCallback(async (candidate) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = screen;
      setScreenStream(screen);
      setIsScreenSharing(true);

      const screenTrack = screen.getVideoTracks()[0];
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => stopScreenShare();
    } catch (e) {
      setMediaError('Screen share was cancelled or denied.');
    }
  }, []);

  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const screen = screenStreamRef.current;
    const local = localStreamRef.current;

    if (screen) {
      screen.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    // Restore camera track
    if (pc && local) {
      const cameraTrack = local.getVideoTracks()[0];
      const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setScreenStream(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setMediaError(null);
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, []);

  return {
    localStream,
    remoteStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    mediaError,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleMute,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    cleanup,
    setMediaError,
  };
}