import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, ArrowRight, AlertCircle, BookOpen, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { LoadingScreen, LoadingSpinner } from '../components/ui/loading-screen';
import ResumeCard from '../components/resume/ResumeCard';

export default function SignInKeyEntry() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [freshUser, setFreshUser] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  const checkExistingAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFreshUser(currentUser);
      }
    } catch (e) {
      // Not authenticated - this is fine for public landing page
    }
    setChecking(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedKey = key.trim().toUpperCase();
      
      const keys = await base44.entities.AccessKey.filter({ key: trimmedKey });
      
      if (!keys || keys.length === 0) {
        setError('Invalid access key. Please check and try again.');
        setLoading(false);
        return;
      }

      const accessKey = keys[0];

      if (accessKey.status === 'revoked') {
        setError('This key has been revoked.');
        setLoading(false);
        return;
      }

      if (accessKey.status === 'paused') {
        setError('This key has been temporarily paused.');
        setLoading(false);
        return;
      }

      if (accessKey.status === 'deleted') {
        setError('This key is no longer valid.');
        setLoading(false);
        return;
      }

      // Valid key, redirect to login
      base44.auth.redirectToLogin(createPageUrl('Study'));
      
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return <LoadingScreen message="Preparing your workspace..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900 flex flex-col relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-md relative">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-serif font-bold text-amber-100 mb-2 drop-shadow-lg">
              Berean Examination
            </h1>
            <p className="text-amber-200 text-lg">
              Sign in with Access Key
            </p>
          </div>

          <div 
            className="premium-panel bg-gradient-to-br from-stone-800 to-amber-900/80 backdrop-blur-lg border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl"
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              if (input && e.target !== input) {
                input.focus();
              }
            }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="panel-icon p-2 rounded-lg bg-gradient-to-br from-amber-700 to-orange-700 border border-amber-500">
                <Key className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-100">Sign In Key</h2>
                <p className="text-sm text-amber-300">Enter your key to proceed</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="premium-input-wrapper">
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="BRN-XXXX-XXXX-XXXX-XXXX"
                  className="premium-input bg-stone-900/50 border-2 border-amber-600/50 text-amber-100 placeholder:text-amber-600 h-12 text-center font-mono tracking-widest focus:border-amber-500 focus:ring-amber-500"
                  disabled={loading}
                />
                <div className="input-underline-accent"></div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !key.trim()}
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

          </div>
          
          <div className="mt-8 text-center">
            <button
              onClick={() => window.location.href = createPageUrl('ContactFeedback')}
              className="text-amber-500/50 hover:text-amber-300 text-xs transition-colors underline"
            >
              Contact Admin
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* Premium Panel Lift + Tactile Interaction */
        .premium-panel {
          position: relative;
          overflow: hidden;
          cursor: text;
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: transform, box-shadow, border-color;
        }

        .premium-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(251, 191, 36, 0.08) 25%,
            rgba(245, 158, 11, 0.18) 50%,
            rgba(251, 191, 36, 0.08) 75%,
            transparent 100%
          );
          pointer-events: none;
          opacity: 0;
          transition: left 0s, opacity 0s;
        }

        .premium-panel:focus-within,
        .premium-panel.is-active {
          transform: translateY(-3px) scale(1.008);
          box-shadow: 
            0 8px 24px rgba(120, 53, 15, 0.45),
            0 2px 8px rgba(251, 191, 36, 0.15),
            inset 0 1px 0 rgba(251, 191, 36, 0.25);
          border-color: rgba(251, 191, 36, 0.75);
        }

        .premium-panel:focus-within::before,
        .premium-panel.is-active::before {
          left: 100%;
          opacity: 1;
          transition: left 0.58s cubic-bezier(0.16, 1, 0.3, 1), opacity 0s;
        }

        .premium-panel:focus-within::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 1rem;
          padding: 2px;
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(251, 191, 36, 0.10));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: glowPulse 2s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.85; }
        }

        /* Book Icon Ink Settle */
        .premium-panel:focus-within .panel-icon,
        .premium-panel.is-active .panel-icon {
          animation: inkSettle 0.16s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes inkSettle {
          0% { transform: rotate(0deg); }
          40% { transform: rotate(-1deg); }
          100% { transform: rotate(0deg); }
        }

        /* Premium Input Field */
        .premium-input-wrapper {
          position: relative;
        }

        .premium-input {
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .premium-input:focus {
          border-color: rgba(251, 191, 36, 0.8);
          box-shadow: 
            0 0 0 3px rgba(251, 191, 36, 0.12),
            0 2px 8px rgba(245, 158, 11, 0.2);
        }

        .input-underline-accent {
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.8), transparent);
          border-radius: 1px;
          pointer-events: none;
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.12s 0.22s;
          opacity: 0;
        }

        .premium-input:focus ~ .input-underline-accent {
          transform: translateX(-50%) scaleX(1);
          opacity: 1;
        }

        /* Reduced motion: static glow only */
        @media (prefers-reduced-motion: reduce) {
          .premium-panel {
            transition: border-color 0.2s, box-shadow 0.2s;
          }

          .premium-panel:focus-within,
          .premium-panel.is-active {
            transform: none;
            box-shadow: 
              0 0 0 3px rgba(251, 191, 36, 0.2),
              0 2px 8px rgba(120, 53, 15, 0.3);
          }

          .premium-panel::before {
            display: none;
          }

          .premium-panel:focus-within::after {
            animation: none;
            opacity: 0.7;
          }

          .premium-panel:focus-within .panel-icon,
          .premium-panel.is-active .panel-icon {
            animation: none;
          }

          .input-underline-accent {
            transition: opacity 0.2s;
          }
        }

        /* Premium Metallic Shine Animation for Nav Links */
        .nav-link-shine {
          position: relative;
          overflow: hidden;
          transition: transform 0.15s ease;
        }

        .nav-link-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.15) 25%,
            rgba(255, 248, 220, 0.3) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 100%
          );
          transition: left 0.5s ease-out;
          pointer-events: none;
        }

        .nav-link-shine:hover::before {
          left: 100%;
        }

        .nav-link-shine:hover {
          text-shadow: 0 0 8px rgba(255, 248, 220, 0.4);
        }

        .nav-link-shine:active {
          transform: scale(0.98);
          filter: brightness(0.9);
          transition: transform 0.12s ease, filter 0.12s ease;
        }

        .nav-link-shine:focus-visible {
          outline: 2px solid rgba(217, 145, 96, 0.6);
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* User Chip Shine Animation */
        .user-chip-shine {
          position: relative;
          overflow: hidden;
        }

        .user-chip-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 25%,
            rgba(255, 248, 220, 0.2) 50%,
            rgba(255, 255, 255, 0.1) 75%,
            transparent 100%
          );
          transition: left 0.5s ease-out;
          pointer-events: none;
        }

        .user-chip-shine:hover::before {
          left: 100%;
        }

        .user-chip-shine:active {
          transform: scale(0.98);
          transition: transform 0.12s ease;
        }

        /* User Dropdown Animation */
        .user-dropdown {
          animation: dropdownFadeIn 0.2s ease-out;
        }

        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .nav-link-shine::before,
          .user-chip-shine::before {
            display: none;
          }
          
          .nav-link-shine:hover {
            text-decoration: underline;
            text-decoration-color: rgba(255, 248, 220, 0.5);
            text-decoration-thickness: 1px;
            text-underline-offset: 4px;
            text-shadow: none;
          }
          
          .nav-link-shine:active,
          .user-chip-shine:active {
            transform: none;
            filter: brightness(0.95);
          }

          .user-dropdown {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}