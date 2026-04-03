import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Loader2, AlertCircle, BookOpen, Check } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CompleteRegistration() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.href = createPageUrl('KeyEntry');
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // SECURITY: If user already has access_key, they've completed registration
      if (currentUser?.access_key) {
        if (currentUser.is_admin) {
          window.location.href = createPageUrl('AdminPanel');
        } else {
          window.location.href = createPageUrl('Study');
        }
        return;
      }

      // SECURITY: Validate key session
      const keyValidationStr = sessionStorage.getItem('berean_key_validation');
      if (!keyValidationStr) {
        // OAuth user without key validation - force logout
        alert('Please enter your access key to complete registration.');
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const keyValidation = JSON.parse(keyValidationStr);
      
      // Check expiration (15 minutes)
      if (Date.now() > keyValidation.expires) {
        sessionStorage.removeItem('berean_key_validation');
        alert('Your key validation has expired. Please enter your key again.');
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      // Verify the key is still valid and unclaimed
      const keys = await base44.entities.AccessKey.filter({ key: keyValidation.key });
      if (!keys || keys.length === 0 || keys[0].status !== 'active') {
        sessionStorage.removeItem('berean_key_validation');
        alert('Invalid or inactive key. Please contact support.');
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const accessKey = keys[0];
      
      // Check if key was claimed by someone else during validation window
      if (accessKey.claimed_by_email && accessKey.claimed_by_email !== currentUser.email) {
        sessionStorage.removeItem('berean_key_validation');
        alert('This key has been claimed by another user.');
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      setChecking(false);
    } catch (e) {
      window.location.href = createPageUrl('KeyEntry');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);

    try {
      const keyValidationStr = sessionStorage.getItem('berean_key_validation');
      if (!keyValidationStr) {
        setError('Session expired. Please start over.');
        setLoading(false);
        return;
      }

      const keyValidation = JSON.parse(keyValidationStr);
      
      // Double-check expiration
      if (Date.now() > keyValidation.expires) {
        setError('Key validation expired. Please start over.');
        sessionStorage.removeItem('berean_key_validation');
        setLoading(false);
        return;
      }

      const keys = await base44.entities.AccessKey.filter({ key: keyValidation.key });
      
      if (!keys || keys.length === 0) {
        setError('Invalid access key. Please start over.');
        sessionStorage.removeItem('berean_key_validation');
        setLoading(false);
        return;
      }

      const accessKey = keys[0];

      // Final check: ensure key is still unclaimed and active
      if (accessKey.claimed_by_email && accessKey.claimed_by_email !== user.email) {
        setError('This key has already been claimed by another user.');
        sessionStorage.removeItem('berean_key_validation');
        setLoading(false);
        return;
      }

      if (accessKey.status !== 'active') {
        setError('This key is no longer active.');
        sessionStorage.removeItem('berean_key_validation');
        setLoading(false);
        return;
      }

      // Claim the key
      await base44.entities.AccessKey.update(accessKey.id, {
        claimed_by_email: user.email,
        claimed_by_username: username.trim(),
        claimed_at: new Date().toISOString(),
        status: 'active'
      });

      // Link key to user profile
      await base44.auth.updateMe({
        username: username.trim(),
        access_key: keyValidation.key,
        is_admin: keyValidation.isGrandmaster
      });

      // IMMEDIATELY clear validation to prevent reuse
      sessionStorage.removeItem('berean_key_validation');

      if (keyValidation.isGrandmaster) {
        window.location.href = createPageUrl('AdminPanel');
      } else {
        window.location.href = createPageUrl('Study');
      }

    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-900 to-stone-900 flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-800 to-orange-800 border-2 border-amber-600 mb-6 shadow-lg">
              <BookOpen className="w-10 h-10 text-amber-100" />
            </div>
            <h1 className="text-4xl font-serif font-bold text-amber-100 mb-2">
              Almost There!
            </h1>
            <p className="text-amber-200 text-lg">
              Complete your registration
            </p>
          </div>

          <div className="bg-gradient-to-br from-stone-800 to-amber-900/80 backdrop-blur-lg border-2 border-amber-600/50 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-400/30 rounded-lg mb-6">
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-green-300 font-medium">Key Verified</p>
                <p className="text-xs text-green-300/60">{user?.email}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-amber-200">Choose a Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-10 bg-stone-900/50 border-2 border-amber-600/50 text-amber-100 placeholder:text-amber-600 h-12"
                    disabled={loading}
                  />
                </div>
                <p className="text-xs text-amber-300/50">This will be displayed to other users</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-400/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-sm text-red-300">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !username.trim()}
                className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-medium shadow-lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
}