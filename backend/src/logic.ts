import { DateTime } from 'luxon';
import { db } from './db';

export function getTimezone(): string {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('timezone') as { value: string };
  return row ? row.value : 'Europe/Bucharest';
}

export function setTimezone(tz: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run('timezone', tz);
}

export function getNow(xNowHeader?: string): DateTime {
  if (xNowHeader) {
    const dt = DateTime.fromISO(xNowHeader);
    if (dt.isValid) return dt;
  }
  return DateTime.now();
}

export function calculateBaseXp(difficulty: string, dueDate: string | null, completionDate: DateTime): number {
  let standard = 10;
  if (difficulty === 'medium') standard = 25;
  if (difficulty === 'hard') standard = 50;

  if (dueDate) {
    const completionDay = completionDate.toISODate()!;
    if (completionDay > dueDate) {
      return Math.floor(standard / 2);
    }
  }
  return standard;
}

export function getStats(now: DateTime) {
  const tz = getTimezone();
  const currentDay = now.setZone(tz).toISODate()!;
  const yesterday = now.setZone(tz).minus({ days: 1 }).toISODate()!;

  const activeCompletions = db.prepare(`
    SELECT * FROM completions 
    WHERE undone = 0 
    ORDER BY created_at ASC
  `).all() as Array<{ id: string; quest_id: string; day: string; base_xp: number; created_at: string }>;

  const dayMap = new Map<string, Array<any>>();
  for (const c of activeCompletions) {
    if (!dayMap.has(c.day)) dayMap.set(c.day, []);
    dayMap.get(c.day)!.push(c);
  }

  const distinctDays = Array.from(dayMap.keys()).sort();

  let totalXp = 0;
  let streakCounter = 0;
  let prevDate: DateTime | null = null;

  for (const day of distinctDays) {
    const d = DateTime.fromISO(day);
    if (!prevDate) {
      streakCounter = 1;
    } else {
      const diff = d.diff(prevDate, 'days').days;
      if (diff === 1) {
        streakCounter += 1;
      } else {
        streakCounter = 1;
      }
    }
    prevDate = d;

    const comps = dayMap.get(day)!;
    const dayBaseXp = comps.reduce((acc, curr) => acc + curr.base_xp, 0);
    const bonus = Math.min(streakCounter * 2, 14);
    totalXp += dayBaseXp + bonus;
  }

  let currentStreak = 0;
  if (dayMap.has(currentDay)) {
    let cursor = DateTime.fromISO(currentDay);
    while (dayMap.has(cursor.toISODate()!)) {
      currentStreak++;
      cursor = cursor.minus({ days: 1 });
    }
  } else if (dayMap.has(yesterday)) {
    let cursor = DateTime.fromISO(yesterday);
    while (dayMap.has(cursor.toISODate()!)) {
      currentStreak++;
      cursor = cursor.minus({ days: 1 });
    }
  } else {
    currentStreak = 0;
  }

    let level = 1;
  while (totalXp >= 50 * (level + 1) * level) {
    level++;
  }
  const thresholdCurrent = 50 * level * (level - 1);
  const xpIntoLevel = totalXp - thresholdCurrent;
  const xpToNextLevel = (level * 100) - xpIntoLevel;

  return {
    timezone: tz,
    xp: totalXp,
    level,
    xp_into_level: xpIntoLevel,
    xp_to_next_level: xpToNextLevel,
    streak: currentStreak
  };
}