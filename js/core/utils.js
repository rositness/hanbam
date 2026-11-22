export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (arr, n) => shuffle(arr).slice(0, n);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function uniqueBy(arr, key) {
  const seen = new Set();
  return arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

// Варианты-обманки: уникальные, не совпадающие с правильным ответом.
export function distractors(correct, pool, n = 3, key = (x) => x) {
  const ck = correct == null ? undefined : key(correct);
  const cand = uniqueBy(shuffle(pool).filter((x) => key(x) !== ck), key);
  return cand.slice(0, n);
}

export function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
export const pl = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;

export function greeting() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Доброй ночи';
  if (hr < 12) return 'Доброе утро';
  if (hr < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
