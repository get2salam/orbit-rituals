const DAY_MS = 86_400_000;

export function todayISO(offset = 0, baseDate = new Date()) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysFromToday(value, baseDate = new Date()) {
  if (!value) return 999;
  const today = new Date(`${todayISO(0, baseDate)}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / DAY_MS);
}

export function bumpDate(value, days, baseDate = new Date()) {
  const date = new Date(`${value || todayISO(0, baseDate)}T00:00:00`);
  date.setDate(date.getDate() + days);
  return todayISO(0, date);
}

export function cadenceDays(category) {
  if (category === 'Daily') return 1;
  if (category === 'Weekly') return 7;
  if (category === 'Monthly') return 30;
  return 2;
}

export function priority(item, options = {}) {
  const daysUntilDue = daysFromToday(item.nextDue, options.baseDate);
  const dueBoost = Math.max(0, 3 - Math.max(daysUntilDue, 0)) * 5;
  const streakBoost = item.state === 'Archived' ? 0 : item.streak * 3;
  const stateBoost = item.state === 'Active' ? 8 : item.state === 'Needs work' ? 4 : item.state === 'Draft' ? 2 : -8;
  return item.score * 6 + streakBoost + dueBoost + stateBoost - item.effort * 4;
}
