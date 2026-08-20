/**
 * Formats a 24-hour time string (e.g. "10:30", "13:00", "16:45") into a 12-hour AM/PM string.
 * Examples:
 *   "10:30" -> "10:30 AM"
 *   "12:00" -> "12:00 PM"
 *   "13:00" -> "01:00 PM"
 *   "16:00" -> "04:00 PM"
 *   "20:30" -> "08:30 PM"
 */
export function format12Hour(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|ص|م))?/i);
  if (!match) return clean;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const suppliedSuffix = match[3]?.toUpperCase();
  const isPM = suppliedSuffix === 'PM' || suppliedSuffix === 'م' || (!suppliedSuffix && hour >= 12);
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }
  const hourStr = String(hour).padStart(2, '0');
  return `${hourStr}:${minute} ${isPM ? 'PM' : 'AM'}`;
}

export function formatTimeRange12(startTime, endTime) {
  if (!startTime && !endTime) return '';
  if (!endTime) return format12Hour(startTime);
  if (!startTime) return format12Hour(endTime);
  return `${format12Hour(startTime)} — ${format12Hour(endTime)}`;
}

export function formatDateTime12(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const dateLabel = date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeLabel = format12Hour(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
  return `${dateLabel} ${timeLabel}`;
}

export function parseTimeInput(timeStr) {
  const clean = String(timeStr || '').trim();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|ص|م))?$/i);
  if (!match) return clean;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const suffix = match[3]?.toUpperCase();
  if (suffix === 'PM' || suffix === 'م') {
    if (hour < 12) hour += 12;
  } else if (suffix === 'AM' || suffix === 'ص') {
    if (hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${minute}`;
}
