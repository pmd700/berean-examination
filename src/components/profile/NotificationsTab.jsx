import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, BellOff, Volume2, VolumeX, Eye, EyeOff, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
} from '../social/NotificationManager';

export default function NotificationsTab({ user, onUpdate }) {
  const [settings, setSettings] = useState({
    dm_enabled: true,
    notify_in_app: false,
    show_preview: true,
    sound_enabled: true,
    quiet_start: null,
    quiet_end: null,
  });
  const [permission, setPermission] = useState('default');
  const [saving, setSaving] = useState(false);
  const [supported] = useState(isNotificationSupported());

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    const s = await getNotificationSettings(user);
    setSettings(s);
    setPermission(getNotificationPermission());
  };

  const handleToggle = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    await saveNotificationSettings(updated);
    setSaving(false);
    if (onUpdate) onUpdate();
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      toast.success('Notifications enabled!');
    }
  };

  return (
    <div className="space-y-8">
      {/* Browser Permission Status */}
      <div className={`rounded-xl p-4 border ${
        !supported
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : permission === 'granted'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : permission === 'denied'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <div className="flex items-start gap-3">
          {!supported ? (
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          ) : permission === 'granted' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {!supported
                ? 'Browser Notifications Not Supported'
                : permission === 'granted'
                  ? 'Browser Notifications Active'
                  : permission === 'denied'
                    ? 'Browser Notifications Blocked'
                    : 'Browser Notifications Not Enabled'
              }
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {!supported
                ? 'Your browser does not support notifications.'
                : permission === 'granted'
                  ? 'You will receive DM notifications when the tab is backgrounded. Notifications do not work when the browser is fully closed.'
                  : permission === 'denied'
                    ? 'Notifications are blocked. Please enable them in your browser settings for this site.'
                    : 'Enable browser notifications to get alerts for new messages.'
              }
            </p>
            {supported && permission !== 'granted' && permission !== 'denied' && (
              <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700" onClick={handleRequestPermission}>
                <Bell className="w-3.5 h-3.5 mr-1.5" /> Enable Notifications
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* DM Notification Toggles */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Bell className="w-5 h-5" /> DM Notifications
        </h3>

        <SettingRow
          icon={settings.dm_enabled ? Bell : BellOff}
          label="Enable DM Notifications"
          description="Receive notifications when you get new direct messages"
          checked={settings.dm_enabled}
          onChange={(v) => handleToggle('dm_enabled', v)}
        />

        <SettingRow
          icon={Eye}
          label="Notify When App is Open"
          description="Show notifications even when you're using the app but not in the active thread"
          checked={settings.notify_in_app}
          onChange={(v) => handleToggle('notify_in_app', v)}
          disabled={!settings.dm_enabled}
        />

        <SettingRow
          icon={settings.show_preview ? Eye : EyeOff}
          label="Message Previews"
          description="Show message content in notifications"
          checked={settings.show_preview}
          onChange={(v) => handleToggle('show_preview', v)}
          disabled={!settings.dm_enabled}
        />

        <SettingRow
          icon={settings.sound_enabled ? Volume2 : VolumeX}
          label="Notification Sound"
          description="Play a sound when notifications arrive"
          checked={settings.sound_enabled}
          onChange={(v) => handleToggle('sound_enabled', v)}
          disabled={!settings.dm_enabled}
        />
      </div>

      {/* Quiet Hours */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Moon className="w-5 h-5" /> Do Not Disturb
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Silence notifications during specified hours.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Start</Label>
            <Input
              type="time"
              value={settings.quiet_start || ''}
              onChange={(e) => handleToggle('quiet_start', e.target.value || null)}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              disabled={!settings.dm_enabled}
            />
          </div>
          <span className="text-gray-400 mt-5">to</span>
          <div className="flex-1">
            <Label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">End</Label>
            <Input
              type="time"
              value={settings.quiet_end || ''}
              onChange={(e) => handleToggle('quiet_end', e.target.value || null)}
              className="bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              disabled={!settings.dm_enabled}
            />
          </div>
        </div>
        {settings.quiet_start && settings.quiet_end && (
          <p className="text-xs text-amber-500">
            Do Not Disturb: {settings.quiet_start} – {settings.quiet_end}
          </p>
        )}
      </div>

      {/* Transparency note */}
      <div className="rounded-xl bg-gray-100 dark:bg-gray-800/50 p-4 border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <strong>Note:</strong> DM notifications work when the app tab is open or backgrounded in your browser. 
          They do not work when the browser is fully closed. This is a browser limitation.
        </p>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <Label className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">{label}</Label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}