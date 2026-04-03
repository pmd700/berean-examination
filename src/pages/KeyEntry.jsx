import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, ArrowRight, AlertCircle, BookOpen, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { LoadingScreen, LoadingSpinner } from '../components/ui/loading-screen';
import { getUserTimezone, formatMonthYear } from '../components/utils/timezoneUtils';
import ResumeCard from '../components/resume/ResumeCard';
import { useI18n } from '../components/utils/I18nContext';

export default function KeyEntry() {
  const { tr } = useI18n();
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
    }setChecking(false);
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedKey = key.trim().toUpperCase();

      const keys = await base44.entities.AccessKey.filter({ key: trimmedKey });

      if (!keys || keys.length === 0) {
        setError(tr('Invalid access key. Please check and try again.'));
        setLoading(false);
        return;
      }

      const accessKey = keys[0];

      if (accessKey.status === 'revoked') {
        setError(tr('This key has been revoked.'));
        setLoading(false);
        return;
      }

      if (accessKey.status === 'paused') {
        setError(tr('This key has been temporarily paused.'));
        setLoading(false);
        return;
      }

      if (accessKey.status === 'deleted') {
        setError(tr('This key is no longer valid.'));
        setLoading(false);
        return;
      }

      if (accessKey.claimed_by_email && accessKey.status === 'active') {
        setError(tr('This key is already in use. Please sign in with your account.'));
        setTimeout(() => {
          base44.auth.redirectToLogin(createPageUrl('Study'));
        }, 2000);
        setLoading(false);
        return;
      }

      // Store validated key with timestamp (expires in 15 minutes)
      const keyValidation = {
        key: trimmedKey,
        isGrandmaster: accessKey.is_grandmaster,
        timestamp: Date.now(),
        expires: Date.now() + 15 * 60 * 1000
      };
      sessionStorage.setItem('berean_key_validation', JSON.stringify(keyValidation));

      // If already authenticated (OAuth edge case), go straight to registration
      const isAlreadyAuth = await base44.auth.isAuthenticated();
      if (isAlreadyAuth) {
        window.location.href = createPageUrl('CompleteRegistration');
      } else {
        base44.auth.redirectToLogin(createPageUrl('CompleteRegistration'));
      }

    } catch (err) {
      setError(tr('Something went wrong. Please try again.'));
      setLoading(false);
    }
  };

  if (checking) {
    return <LoadingScreen message={tr('Preparing your workspace...')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900 flex flex-col relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      </div>

      {freshUser && <ResumeCard user={freshUser} />}

      {user &&
      <div className="relative z-10 bg-stone-800/90 backdrop-blur-sm border-b border-amber-600/30 px-4 h-16">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-center gap-8">
            <div className="absolute left-0 relative group">
              <button className="user-chip-shine flex items-center gap-2 px-3 py-2 rounded-full bg-amber-900/30 border border-amber-600/40 hover:border-amber-500/60 transition-all">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-700 to-orange-700 flex items-center justify-center text-amber-50 text-xs font-bold">
                  {(user.full_name || user.username || user.email || 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="text-amber-100 text-sm font-medium max-w-[120px] truncate hidden sm:block">
                  {user.full_name?.split(' ')[0] || user.username?.split(' ')[0] || 'User'}
                </span>
                <svg className="w-3 h-3 text-amber-400 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="user-dropdown absolute left-0 top-full mt-2 w-64 bg-gradient-to-br from-stone-800 to-amber-900/80 border-2 border-amber-600/50 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform group-hover:translate-y-0 -translate-y-2">
                <div className="p-4 border-b border-amber-600/30">
                  <div className="text-xs text-amber-400 mb-1">Signed in as</div>
                  <div className="text-base text-amber-50 font-medium break-words mb-1">
                    {user.full_name || user.username || user.email}
                  </div>
                  {user.email && user.full_name &&
                <div className="text-xs text-amber-300/70">{user.email}</div>
                }
                </div>
                <div className="p-2">
                  <button
                  onClick={() => window.location.href = createPageUrl('AccountCenter')}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-amber-200 hover:text-amber-50 hover:bg-amber-800/50 transition-colors">

                    {tr('Account Center')}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {(user?.is_admin || user?.role === 'admin') &&
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = createPageUrl('AdminPanel')}
              className="nav-link-shine text-amber-200 hover:text-amber-50 hover:bg-amber-800/50 h-8">

                  {tr('Go to Admin Panel')}
                </Button>
            }
              <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = createPageUrl('Study')}
              className="nav-link-shine text-amber-200 hover:text-amber-50 hover:bg-amber-800/50 h-8">

                {tr('Go to Study')}
              </Button>
              <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = createPageUrl('Keywords')}
              className="nav-link-shine text-amber-200 hover:text-amber-50 hover:bg-amber-800/50 h-8">

                {tr('Go to Keywords')}
              </Button>
              <Button
              variant="ghost"
              size="sm"
              onClick={() => base44.auth.logout(createPageUrl('KeyEntry'))}
              className="nav-link-shine text-amber-200 hover:text-amber-50 hover:bg-amber-800/50 h-8">

                {tr('Sign Out')}
              </Button>
            </div>
          </div>
        </div>
      }

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-800 to-orange-800 border-2 border-amber-600 mb-6 shadow-lg">
              <BookOpen className="w-10 h-10 text-amber-100" />
            </div>
            <h1 className="text-slate-50 mb-2 text-4xl font-bold drop-shadow-lg">Berean Examination

            </h1>
            <p className="text-amber-200 text-lg">
              In-depth Biblical Expository Study
            </p>
          </div>

          <div
            className="premium-panel bg-gradient-to-br from-stone-800 to-amber-900/80 backdrop-blur-lg border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl"
            onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              if (input && e.target !== input) {
                input.focus();
              }
            }}>

            <div className="flex items-center gap-3 mb-6">
              <div className="panel-icon p-2 rounded-lg bg-gradient-to-br from-amber-700 to-orange-700 border border-amber-500">
                <Key className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-amber-100">{tr('Enter Access Key')}</h2>
                    <p className="text-sm text-amber-300">{tr('Required for first-time access')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="premium-input-wrapper">
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase())}
                  placeholder="BRN-XXXX-XXXX-XXXX-XXXX"
                  className="premium-input bg-stone-900/50 border-2 border-amber-600/50 text-amber-100 placeholder:text-amber-600 h-12 text-center font-mono tracking-widest focus:border-amber-500 focus:ring-amber-500"
                  disabled={loading} />

                <div className="input-underline-accent"></div>
              </div>

              {error &&
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              }

              <Button
                type="submit"
                disabled={loading || !key.trim()}
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg">

                {loading ?
                <LoadingSpinner size="sm" /> :

                <>
                    {tr('Continue')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                }
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-amber-600/30">
              <button
                onClick={() => window.location.href = createPageUrl('SignInKeyEntry')}
                className="w-full text-center text-amber-300 hover:text-amber-100 text-sm transition-colors font-medium">

                {tr('Already have an account?')} <span className="underline">{tr('Sign In')}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-8 text-xs">
            <p className="text-amber-400/60">
              {tr('Access keys are provided by invitation only.')}
            </p>
            <span className="text-amber-400/30">•</span>
            <button
              onClick={() => window.location.href = createPageUrl('ContactFeedback')}
              className="text-amber-400/80 hover:text-amber-200 transition-colors underline">

              {tr('Contact Admin')}
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
    </div>);

}