import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { LoadingScreen } from '../components/ui/loading-screen';
import { 
  User, Settings, Shield, Bell, Lock, Eye, Moon, Sun, 
  LogOut, ChevronRight, Save, X, AlertTriangle 
} from 'lucide-react';
import { getUserTimezone, formatMonthYear } from '../components/utils/timezoneUtils';
import { Button } from '@/components/ui/button';
import ProfileTab from '../components/profile/ProfileTab';
import SettingsTab from '../components/profile/SettingsTab';
import PrivacyTab from '../components/profile/PrivacyTab';
import NotificationsTab from '../components/profile/NotificationsTab';
import UnsavedChangesDialog from '../components/editor/UnsavedChangesDialog';
import { trackActivity } from '../components/utils/activityTracker';
import { useI18n } from '../components/utils/I18nContext';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User, description: 'Manage your personal information' },
  { id: 'preferences', label: 'Preferences', icon: Settings, description: 'Customize your experience' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password and authentication' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and app alerts' },
  { id: 'privacy', label: 'Privacy', icon: Eye, description: 'Privacy and data settings' },
];

export default function AccountCenter() {
  const { tr } = useI18n();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

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
      if (!currentUser?.access_key) {
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

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await base44.auth.updateMe({ theme: newTheme });
  };

  const handleTabChange = (tabId) => {
    if (hasUnsavedChanges) {
      setPendingTab(tabId);
      setShowUnsavedDialog(true);
      return;
    }
    setActiveTab(tabId);
    trackActivity({
      type: 'account_center',
      page: 'AccountCenter',
      title: 'Continue in Account Center?',
      subtitle: tabs.find(t => t.id === tabId)?.label,
      icon: 'account',
    });
  };

  const confirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
      setHasUnsavedChanges(false);
    }
    setShowUnsavedDialog(false);
  };

  const tabs = [
    { id: 'profile', label: tr('Profile'), icon: User, description: tr('Manage your personal information') },
    { id: 'preferences', label: tr('Preferences'), icon: Settings, description: tr('Customize your experience') },
    { id: 'security', label: tr('Security'), icon: Shield, description: tr('Password and authentication') },
    { id: 'notifications', label: tr('Notifications'), icon: Bell, description: tr('Email and app alerts') },
    { id: 'privacy', label: tr('Privacy'), icon: Eye, description: tr('Privacy and data settings') },
  ];

  const renderTabContent = () => {
    const props = {
      user,
      onUpdate: () => checkAuth(),
      onUnsavedChange: setHasUnsavedChanges,
    };

    switch (activeTab) {
      case 'profile':
        return <ProfileTab {...props} />;
      case 'preferences':
        return <SettingsTab {...props} />;
      case 'privacy':
        return <PrivacyTab {...props} />;
      case 'notifications':
        return <NotificationsTab {...props} />;
      case 'security':
        return (
          <div className="text-center py-12">
            <div className="inline-flex p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
              <Shield className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {tr('Security Settings')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {tr('Coming soon - Advanced security features')}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <LoadingScreen message={tr('Loading Account Center...')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{tr('Account Center')}</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => base44.auth.logout(createPageUrl('KeyEntry'))}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[280px_1fr_300px] gap-6">
          {/* Left Sidebar - Navigation */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                       isActive
                         ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-medium'
                         : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{tab.label}</span>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1' : ''}`} />
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tabs.find(t => t.id === activeTab)?.description}
              </p>
            </div>
            {renderTabContent()}
          </div>

          {/* Right Sidebar - Account Snapshot */}
          <div className="lg:sticky lg:top-24 h-fit space-y-4">
            {/* User Card */}
            <div className="bg-gradient-to-br from-orange-700 to-amber-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                    {(user?.full_name || user?.username || user?.email || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{user?.full_name || user?.username || 'User'}</h3>
                  <p className="text-sm text-purple-200 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/20">
                <div className="text-sm">
                  <div className="text-amber-200">{tr('Role')}</div>
                  <div className="font-semibold">{user?.is_admin ? tr('Admin') : tr('User')}</div>
                </div>
                <div className="text-sm text-right">
                  <div className="text-amber-200">{tr('Member since')}</div>
                  <div className="font-semibold">{formatMonthYear(user?.created_date, getUserTimezone(user))}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{tr('Quick Actions')}</h3>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = createPageUrl('Study')}
                >
                  {tr('Go to Study')}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  onClick={() => window.location.href = createPageUrl('Keywords')}
                >
                  Keywords Library
                </Button>
                {user?.is_admin && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm"
                    onClick={() => window.location.href = createPageUrl('AdminPanel')}
                  >
                    {tr('Go to Admin Panel')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onStay={() => {
          setShowUnsavedDialog(false);
          setPendingTab(null);
        }}
        onLeave={() => {
          confirmTabChange();
        }}
        onSaveAndLeave={() => {
          // No save needed for tab switches - just confirm
          confirmTabChange();
        }}
        isSaving={false}
      />
    </div>
  );
}