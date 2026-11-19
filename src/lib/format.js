import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInCalendarDays,
  parseISO,
  isValid,
} from "date-fns";

/** Accepts an ISO string or Date; returns a Date or null. */
export function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(String(value));
  return isValid(date) ? date : null;
}

export function fmtTime(value) {
  const date = toDate(value);
  return date ? format(date, "h:mm a") : "";
}

export function fmtDate(value, pattern = "EEE, MMM d") {
  const date = toDate(value);
  return date ? format(date, pattern) : "";
}

export function fmtDayLong(value) {
  const date = toDate(value);
  return date ? format(date, "EEEE, MMMM d") : "";
}

export function dayKey(value = new Date()) {
  const date = value instanceof Date ? value : toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

/** Human, non-judgemental due label. */
export function dueLabel(value) {
  const date = toDate(value);
  if (!date) return "";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  const diff = differenceInCalendarDays(date, new Date());
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`;
  if (diff < 7) return format(date, "EEEE");
  return format(date, "MMM d");
}

export function isOverdue(value) {
  const date = toDate(value);
  if (!date) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date.getTime() < endOfToday.getTime() && !isToday(date);
}

export function fmtDuration(minutes) {
  if (!minutes && minutes !== 0) return "";
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "Still awake";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** ISO string for a local date+time, used when building events/reminders. */
export function combineDateTime(dateValue, timeValue) {
  const date = toDate(dateValue) || new Date();
  const [hours, minutes] = String(timeValue || "09:00").split(":").map(Number);
  const next = new Date(date);
  next.setHours(hours || 0, minutes || 0, 0, 0);
  return next.toISOString();
}

export function timeInputValue(value) {
  const date = toDate(value);
  return date ? format(date, "HH:mm") : "09:00";
}

export function dateInputValue(value) {
  const date = toDate(value);
  return date ? format(date, "yyyy-MM-dd") : "";
}

export const nowIso = () => new Date().toISOString();