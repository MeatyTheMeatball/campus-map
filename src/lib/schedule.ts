import type { ClassMeeting, Weekday } from "../types";

const STORAGE_KEY = "claflin-campus-map-schedule";

const JS_TO_WEEKDAY: Weekday[] = ["U", "M", "T", "W", "R", "F", "S"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

export function loadSchedule(): ClassMeeting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClassMeeting[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSchedule(classes: ClassMeeting[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
}

export function todayWeekday(date = new Date()): Weekday {
  return JS_TO_WEEKDAY[date.getDay()];
}

function minutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function classesOnDay(classes: ClassMeeting[], day: Weekday): ClassMeeting[] {
  return [...classes]
    .filter((c) => c.days.includes(day))
    .sort((a, b) => minutes(a.startTime) - minutes(b.startTime));
}

export function nextClass(
  classes: ClassMeeting[],
  now = new Date(),
): ClassMeeting | null {
  const day = todayWeekday(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = classesOnDay(classes, day);
  return today.find((c) => minutes(c.endTime) > nowMin) ?? null;
}

export function isClassNow(meeting: ClassMeeting, now = new Date()): boolean {
  if (!meeting.days.includes(todayWeekday(now))) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= minutes(meeting.startTime) && nowMin <= minutes(meeting.endTime);
}

export function formatDays(days: Weekday[]): string {
  return days.map((d) => WEEKDAY_LABEL[d]).join(" · ");
}

export function newClassId(): string {
  return crypto.randomUUID();
}
