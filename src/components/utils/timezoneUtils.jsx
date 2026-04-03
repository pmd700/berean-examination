/**
 * Get the user's timezone from their profile, with fallbacks.
 * @param {object} user - The user object from base44.auth.me()
 * @returns {string} IANA timezone string
 */
export const getUserTimezone = (user) => {
  return user?.timezone_str || user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

/**
 * Format a UTC timestamp into the user's local timezone.
 * Uses native Intl.DateTimeFormat — no external package needed.
 *
 * @param {Date|string|number} date - The timestamp to format
 * @param {string} timezone - IANA timezone (e.g. 'America/Chicago')
 * @param {object} [opts] - Intl.DateTimeFormat options override
 * @returns {string} Formatted date string in user's timezone
 */
export const formatInTz = (date, timezone, opts) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const tz = timezone || 'UTC';

  const defaults = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  };

  return new Intl.DateTimeFormat('en-US', opts ? { ...opts, timeZone: tz } : defaults).format(d);
};

/**
 * Short date format: "MMM d" in user's timezone
 */
export const formatShortDate = (date, timezone) => {
  return formatInTz(date, timezone, {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Date-only format: "MMM d, yyyy" in user's timezone
 */
export const formatDateOnly = (date, timezone) => {
  return formatInTz(date, timezone, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Short month + year: "Jan 2026"
 */
export const formatMonthYear = (date, timezone) => {
  return formatInTz(date, timezone, {
    month: 'short',
    year: 'numeric',
  });
};