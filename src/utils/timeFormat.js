/**
 * Formats a 24-hour time string (e.g. "10:30", "13:00", "16:45") into a 12-hour AM/PM string.
 * Examples:
 *   "10:30" -> "10:30 ص"
 *   "12:00" -> "12:00 م"
 *   "13:00" -> "01:00 م"
 *   "16:00" -> "04:00 م"
 *   "20:30" -> "08:30 م"
 */
export function format12Hour(timeStr) {
  if (!timeStr) return '';
  const clean = String(timeStr).trim();
  if (clean.includes('ص') || clean.includes('م') || clean.includes('AM') || clean.includes('PM')) {
    return clean;
  }
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return clean;
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const isPM = hour >= 12;
  const suffix = isPM ? 'م' : 'ص';
  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour = hour - 12;
  }
  const hourStr = String(hour).padStart(2, '0');
  return `${hourStr}:${minute} ${suffix}`;
}

export function formatTimeRange12(startTime, endTime) {
  if (!startTime && !endTime) return '';
  if (!endTime) return format12Hour(startTime);
  if (!startTime) return format12Hour(endTime);
  return `${format12Hour(startTime)} — ${format12Hour(endTime)}`;
}
