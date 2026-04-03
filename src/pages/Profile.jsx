import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, LogOut, Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';
import ProfileTab from '../components/profile/ProfileTab.jsx';
import SettingsTab from '../components/profile/SettingsTab.jsx';
import PrivacyTab from '../components/profile/PrivacyTab.jsx';
import { LoadingScreen } from '../components/ui/loading-screen';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        window.location.href = createPageUrl('KeyEntry');
        return;
      }

      const currentUser = await base44.auth.me();

      // SECURITY: Block users who authenticated but never completed key validation
      if (!currentUser?.access_key) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      // SECURITY: Verify key is still valid
      const keys = await base44.entities.AccessKey.filter({ key: currentUser.access_key });
      if (keys.length === 0) {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      const userKey = keys[0];
      if (userKey.status === 'paused' || userKey.status === 'revoked' || userKey.status === 'deleted') {
        await base44.auth.logout(createPageUrl('KeyEntry'));
        return;
      }

      setUser(currentUser);
      setTheme(currentUser.theme || 'light');
    } catch (e) {
      window.location.href = createPageUrl('KeyEntry');
    }
    setLoading(false);
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    await base44.auth.updateMe({ theme: newTheme });
  };

  const handleUserUpdate = async (updates) => {
    const updated = await base44.auth.updateMe(updates);
    setUser(updated);
  };

  if (loading) {
    return <LoadingScreen message="Loading Profile..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => base44.auth.logout(createPageUrl('KeyEntry'))}
              className="text-gray-500">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 dark:bg-gray-900 dark:border-gray-800">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-8">
            <ProfileTab user={user} onUserUpdate={handleUserUpdate} />
          </TabsContent>

          <TabsContent value="settings" className="mt-8">
            <SettingsTab user={user} theme={theme} onThemeChange={handleThemeChange} onUserUpdate={handleUserUpdate} />
          </TabsContent>

          <TabsContent value="privacy" className="mt-8">
            <PrivacyTab user={user} onUserUpdate={handleUserUpdate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}