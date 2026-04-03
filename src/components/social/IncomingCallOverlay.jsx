import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Phone, PhoneOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from './UserAvatar';
import { startRingtone, stopRingtone } from './RingtoneGenerator';

const POLL_INTERVAL = 3000;

export default function IncomingCallOverlay({ user, friends, onAcceptCall }) {
  const [incomingCall, setIncomingCall] = useState(null);
  const pollRef = useRef(null);
  const dismissedRef = useRef(new Set());

  useEffect(() => {
    if (!user) return;

    const checkForCalls = async () => {
      try {
        const signals = await base44.entities.CallSignal.filter({
          callee_email: user.email,
          status: 'ringing',
        });

        if (signals.length > 0) {
          // Find one that isn't dismissed and is fresh (< 35s old)
          const now = Date.now();
          const fresh = signals.find(s =>
            !dismissedRef.current.has(s.id) &&
            (now - new Date(s.created_date).getTime()) < 35000
          );

          if (fresh && !incomingCall) {
            // Check if caller is blocked
            try {
              const blocks = await base44.entities.UserBlock.filter({
                blocker_email: user.email,
                blocked_email: fresh.caller_email,
              });
              if (blocks.length > 0) {
                // Auto-decline blocked callers
                await base44.entities.CallSignal.update(fresh.id, { status: 'declined' });
                return;
              }
            } catch {}

            const callerFriend = friends?.find(f => f.email === fresh.caller_email);
            setIncomingCall({
              ...fresh,
              callerName: fresh.caller_name || callerFriend?.name || fresh.caller_email.split('@')[0],
              callerAvatar: fresh.caller_avatar || callerFriend?.avatar,
            });
            startRingtone();
          }
        } else if (incomingCall) {
          // Call was cancelled or ended
          stopRingtone();
          setIncomingCall(null);
        }
      } catch {}
    };

    checkForCalls();
    pollRef.current = setInterval(checkForCalls, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [user, friends, incomingCall]);

  // Also poll to check if the ringing call was cancelled by caller
  useEffect(() => {
    if (!incomingCall) return;

    const checkStatus = async () => {
      try {
        const signals = await base44.entities.CallSignal.filter({ id: incomingCall.id });
        if (signals.length > 0 && signals[0].status !== 'ringing') {
          stopRingtone();
          setIncomingCall(null);
        }
      } catch {}
    };

    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [incomingCall]);

  const handleDecline = async () => {
    stopRingtone();
    if (incomingCall) {
      dismissedRef.current.add(incomingCall.id);
      try {
        await base44.entities.CallSignal.update(incomingCall.id, { status: 'declined' });
      } catch {}
      setIncomingCall(null);
    }
  };

  const handleAccept = () => {
    stopRingtone();
    if (incomingCall) {
      onAcceptCall(incomingCall);
      setIncomingCall(null);
    }
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[90vw] max-w-sm"
        >
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/50 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 rounded-full bg-green-500/25"
                  style={{ margin: '-6px' }}
                />
                <UserAvatar name={incomingCall.callerName} avatarUrl={incomingCall.callerAvatar} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{incomingCall.callerName}</p>
                <p className="text-xs text-gray-400 animate-pulse">Incoming call...</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDecline}
                  className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all"
                >
                  <PhoneOff className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={handleAccept}
                  className="w-10 h-10 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-all"
                >
                  <Phone className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}