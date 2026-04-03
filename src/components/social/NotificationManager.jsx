import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const NOTIF_THROTTLE_MS = 10000;
let lastNotifTime = 0;

export function isNotificationSupported() {
  return 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function getNotificationSettings(user) {
  try {
    const settings = user?.notification_settings;
    if (settings) {
      return typeof settings === 'string' ? JSON.parse(settings) : settings;
    }
  } catch {}
  return {
    dm_enabled: true,
    notify_in_app: false,
    show_preview: true,
    sound_enabled: true,
    quiet_start: null,
    quiet_end: null,
  };
}

export async function saveNotificationSettings(settings) {
  await base44.auth.updateMe({
    notification_settings: JSON.stringify(settings),
  });
}

function isQuietHours(settings) {
  if (!settings.quiet_start || !settings.quiet_end) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = settings.quiet_start.split(':').map(Number);
  const [endH, endM] = settings.quiet_end.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export async function showMessageNotification(senderName, newMessages, conversationKey, user) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  const now = Date.now();
  if (now - lastNotifTime < NOTIF_THROTTLE_MS) return;

  const settings = await getNotificationSettings(user);
  if (!settings.dm_enabled) return;
  if (!settings.notify_in_app && !document.hidden) return;
  if (isQuietHours(settings)) return;

  lastNotifTime = now;

  const count = newMessages.length;
  const title = count > 1
    ? `${count} new messages from ${senderName}`
    : senderName;
  const body = settings.show_preview && count === 1
    ? newMessages[0].text.slice(0, 100)
    : count > 1
      ? `Sent ${count} messages`
      : 'Sent you a message';

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    tag: `dm-${conversationKey}`,
    renotify: true,
    silent: !settings.sound_enabled,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = createPageUrl('Social') + `?tab=messages&conversation=${conversationKey}`;
    notification.close();
  };
}