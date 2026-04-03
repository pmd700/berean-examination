import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import VideoTile from './VideoTile';
import CallControls from './CallControls';
import UserAvatar from './UserAvatar';
import { startRingtone, stopRingtone } from './RingtoneGenerator';
import useWebRTC from './useWebRTC';
import { Phone, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const RING_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 2000;

export default function CallView({ user, friend, conversationKey, callSignal, isCaller, onEnd }) {
  const [callState, setCallState] = useState(isCaller ? 'outgoing_ringing' : 'incoming_ringing');
  const [callDuration, setCallDuration] = useState(0);
  const [connectionError, setConnectionError] = useState(null);

  const signalRef = useRef(callSignal);
  const pollRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const durationRef = useRef(null);
  const iceCandidatesRef = useRef([]);
  const hasSetRemoteRef = useRef(false);

  const iCallerRole = isCaller ? 'caller' : 'callee';

  const onIceCandidate = useCallback(async (candidate) => {
    iceCandidatesRef.current.push(candidate);
    const field = isCaller ? 'ice_candidates_caller' : 'ice_candidates_callee';
    try {
      await base44.entities.CallSignal.update(signalRef.current.id, {
        [field]: JSON.stringify(iceCandidatesRef.current),
      });
    } catch {}
  }, [isCaller]);

  const onConnectionStateChange = useCallback((state) => {
    if (state === 'connected') {
      setCallState('connected');
      setConnectionError(null);
    } else if (state === 'disconnected') {
      setConnectionError('Connection interrupted. Trying to reconnect...');
    } else if (state === 'failed') {
      setCallState('failed');
      setConnectionError('Connection failed. Please try again.');
    }
  }, []);

  const rtc = useWebRTC({
    onIceCandidate,
    onConnectionStateChange,
  });

  // ── Start call timer when connected ──
  useEffect(() => {
    if (callState === 'connected') {
      stopRingtone();
      const start = Date.now();
      durationRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(durationRef.current);
  }, [callState]);

  // ── Caller: create offer & start ringing ──
  useEffect(() => {
    if (!isCaller) return;
    const initCall = async () => {
      setCallState('outgoing_ringing');
      startRingtone();

      const offerSdp = await rtc.createOffer();
      await base44.entities.CallSignal.update(signalRef.current.id, {
        offer_sdp: offerSdp,
      });

      // Timeout for no answer
      ringTimeoutRef.current = setTimeout(async () => {
        stopRingtone();
        try {
          await base44.entities.CallSignal.update(signalRef.current.id, { status: 'missed' });
        } catch {}
        setCallState('missed');
      }, RING_TIMEOUT_MS);
    };
    initCall();

    return () => clearTimeout(ringTimeoutRef.current);
  }, []);

  // ── Poll for signal updates ──
  useEffect(() => {
    const poll = async () => {
      try {
        const signals = await base44.entities.CallSignal.filter({ id: signalRef.current.id });
        if (!signals.length) return;
        const sig = signals[0];
        signalRef.current = sig;

        // Check if ended/declined
        if (sig.status === 'declined') {
          stopRingtone();
          clearTimeout(ringTimeoutRef.current);
          setCallState('declined');
          return;
        }
        if (sig.status === 'ended') {
          stopRingtone();
          setCallState('ended');
          return;
        }
        if (sig.status === 'failed') {
          stopRingtone();
          setCallState('failed');
          return;
        }

        // Caller: check for answer
        if (isCaller && sig.answer_sdp && !hasSetRemoteRef.current) {
          hasSetRemoteRef.current = true;
          clearTimeout(ringTimeoutRef.current);
          stopRingtone();
          setCallState('connecting');
          await rtc.setRemoteAnswer(sig.answer_sdp);
        }

        // Process remote ICE candidates
        const remoteField = isCaller ? 'ice_candidates_callee' : 'ice_candidates_caller';
        if (sig[remoteField]) {
          try {
            const candidates = JSON.parse(sig[remoteField]);
            for (const c of candidates) {
              await rtc.addIceCandidate(c);
            }
          } catch {}
        }
      } catch {}
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [isCaller]);

  // ── Callee: accept call ──
  const handleAccept = async () => {
    setCallState('connecting');
    stopRingtone();

    try {
      // Re-fetch to get latest offer
      const signals = await base44.entities.CallSignal.filter({ id: signalRef.current.id });
      const sig = signals[0];
      if (!sig?.offer_sdp) {
        setCallState('failed');
        return;
      }
      signalRef.current = sig;

      const answerSdp = await rtc.createAnswer(sig.offer_sdp);
      await base44.entities.CallSignal.update(sig.id, {
        answer_sdp: answerSdp,
        status: 'accepted',
        started_at: new Date().toISOString(),
      });
    } catch (e) {
      setCallState('failed');
    }
  };

  // ── Decline ──
  const handleDecline = async () => {
    stopRingtone();
    try {
      await base44.entities.CallSignal.update(signalRef.current.id, { status: 'declined' });
    } catch {}
    setCallState('declined');
  };

  // ── Hang up ──
  const handleHangUp = async () => {
    stopRingtone();
    clearTimeout(ringTimeoutRef.current);
    clearInterval(pollRef.current);
    rtc.cleanup();

    try {
      await base44.entities.CallSignal.update(signalRef.current.id, {
        status: 'ended',
        ended_at: new Date().toISOString(),
      });
    } catch {}

    // Insert system message into DM
    try {
      const durationStr = callDuration > 0
        ? ` (${Math.floor(callDuration / 60)}:${String(callDuration % 60).padStart(2, '0')})`
        : '';
      await base44.entities.DirectMessage.create({
        sender_email: user.email,
        receiver_email: friend.email,
        text: `📞 Call ended${durationStr}`,
        conversation_key: conversationKey,
        is_read: false,
        reactions: [],
      });
    } catch {}

    onEnd();
  };

  // ── End call on unmount ──
  useEffect(() => {
    return () => {
      stopRingtone();
      rtc.cleanup();
    };
  }, []);

  // ── Auto-close after end states ──
  useEffect(() => {
    if (['declined', 'missed', 'failed', 'ended'].includes(callState)) {
      rtc.cleanup();
      const timer = setTimeout(() => onEnd(), 3000);
      return () => clearTimeout(timer);
    }
  }, [callState]);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  // ── Ringing states ──
  if (callState === 'incoming_ringing') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 p-8"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 rounded-full bg-green-500/20"
              style={{ margin: '-12px' }}
            />
            <UserAvatar name={friend.name} avatarUrl={friend.avatar} size="xl" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">{friend.name}</p>
            <p className="text-sm text-gray-400 mt-1 animate-pulse">Incoming call...</p>
          </div>
          <div className="flex items-center gap-6 mt-4">
            <button
              onClick={handleDecline}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all shadow-lg shadow-red-600/30"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all shadow-lg shadow-green-600/30"
            >
              <Phone className="w-7 h-7 text-white" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (callState === 'outgoing_ringing') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-6 p-8"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-full bg-amber-500/20"
              style={{ margin: '-16px' }}
            />
            <UserAvatar name={friend.name} avatarUrl={friend.avatar} size="xl" />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-white">{friend.name}</p>
            <p className="text-sm text-gray-400 mt-1 animate-pulse">Calling...</p>
          </div>
          <button
            onClick={handleHangUp}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all mt-4 shadow-lg shadow-red-600/30"
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </button>
        </motion.div>
      </div>
    );
  }

  // ── End states ──
  if (['declined', 'missed', 'failed', 'ended'].includes(callState)) {
    const stateMessages = {
      declined: 'Call declined',
      missed: 'No answer',
      failed: 'Call failed',
      ended: 'Call ended',
    };
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex flex-col items-center gap-4 p-8"
        >
          <div className={`p-4 rounded-full ${callState === 'ended' ? 'bg-gray-800' : 'bg-red-900/30'}`}>
            {callState === 'failed' ? (
              <AlertTriangle className="w-8 h-8 text-red-400" />
            ) : (
              <PhoneOff className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <p className="text-lg font-medium text-white">{stateMessages[callState]}</p>
          {callDuration > 0 && (
            <p className="text-sm text-gray-500">{formatDuration(callDuration)}</p>
          )}
        </motion.div>
      </div>
    );
  }

  // ── Connecting ──
  if (callState === 'connecting') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-md flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
          <p className="text-white text-lg font-medium">Connecting...</p>
        </motion.div>
      </div>
    );
  }

  // ── Connected: in-call UI ──
  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-white font-medium">{friend.name}</span>
        </div>
        <span className="text-sm text-gray-400 font-mono">{formatDuration(callDuration)}</span>
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden p-2">
        {/* Remote video (main) */}
        <VideoTile
          stream={rtc.remoteStream}
          name={friend.name}
          avatarUrl={friend.avatar}
          isMuted={false}
          isCameraOff={!rtc.remoteStream?.getVideoTracks().some(t => t.enabled)}
          className="w-full h-full"
        />

        {/* Local self-view (PIP) */}
        <div className="absolute bottom-4 right-4 w-32 h-24 sm:w-40 sm:h-30 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700">
          <VideoTile
            stream={rtc.isScreenSharing ? rtc.screenStream : rtc.localStream}
            name="You"
            isMuted={rtc.isMuted}
            isCameraOff={rtc.isCameraOff && !rtc.isScreenSharing}
            isLocal
            isScreenShare={rtc.isScreenSharing}
            className="w-full h-full"
          />
        </div>

        {/* Screen sharing banner */}
        <AnimatePresence>
          {rtc.isScreenSharing && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-600/90 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2"
            >
              You are sharing your screen
              <button
                onClick={rtc.stopScreenShare}
                className="ml-1 bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 text-xs transition-colors"
              >
                Stop
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection warning */}
        {connectionError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-600/90 text-white text-sm px-4 py-2 rounded-full backdrop-blur-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {connectionError}
          </div>
        )}

        {/* Media error */}
        {rtc.mediaError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-sm max-w-sm text-center"
          >
            {rtc.mediaError}
            <button onClick={() => rtc.setMediaError(null)} className="ml-2 underline text-xs">Dismiss</button>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <CallControls
        isMuted={rtc.isMuted}
        isCameraOff={rtc.isCameraOff}
        isScreenSharing={rtc.isScreenSharing}
        onToggleMute={rtc.toggleMute}
        onToggleCamera={rtc.toggleCamera}
        onToggleScreenShare={rtc.isScreenSharing ? rtc.stopScreenShare : rtc.startScreenShare}
        onHangUp={handleHangUp}
      />
    </div>
  );
}