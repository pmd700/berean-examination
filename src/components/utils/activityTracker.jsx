import { base44 } from '@/api/base44Client';

let _debounceTimer = null;
let _lastPayload = null;

/**
 * Track user activity. Debounced to avoid spamming.
 * Stores a single JSON string on the User entity — zero extra DB records.
 */
export function trackActivity(activity) {
  const payload = JSON.stringify({
    ...activity,
    timestamp: new Date().toISOString(),
  });

  if (payload === _lastPayload) return;
  _lastPayload = payload;

  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(async () => {
    try {
      await base44.auth.updateMe({ last_activity: payload });
    } catch (e) {
      console.warn('Failed to track activity:', e);
    }
  }, 2000);
}

/**
 * Get the stored last activity for the current user.
 */
export function getLastActivity(user) {
  if (!user?.last_activity) return null;
  try {
    return JSON.parse(user.last_activity);
  } catch {
    return null;
  }
}

/**
 * Build a full URL from an activity object.
 */
export function buildActivityUrl(activity, createPageUrlFn) {
  if (!activity?.page) return null;
  let url = createPageUrlFn(activity.page);
  if (activity.url_params) {
    url += (url.includes('?') ? '&' : '?') + activity.url_params;
  }
  return url;
}