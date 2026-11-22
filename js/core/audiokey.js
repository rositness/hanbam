// Общие правила для готовой озвучки (используются и приложением, и генератором tools/tts/generate.mjs).
// Файл озвучки ищется по ключу: голос + нормализованный текст → короткий хеш.

export const VOICES = {
  F: { name: 'ko-KR-SunHiNeural', label: 'Сонхи' },
  F2: { name: 'ko-KR-SunHiNeural', label: 'Сонхи (другой тембр)', pitch: '-9%', rate: 0.96 },
  M: { name: 'ko-KR-InJoonNeural', label: 'Инджун' },
  M2: { name: 'ko-KR-HyunsuMultilingualNeural', label: 'Хёнсу' },
};

// Текст, который реально произносится: подсказка произношения [..] → её содержимое,
// пропуск ___ убирается, стрелка «→» превращается в паузу.
export function speechText(t) {
  let s = String(t ?? '');
  const m = s.match(/\[([^\]]+)\]/);
  if (m) s = m[1];
  return s.replace(/___/g, ' ').replace(/\s*→\s*/g, ', ').replace(/\s+/g, ' ').trim();
}

// FNV-1a, 32 бита → 8 hex-символов.
export function audioKey(voice, text) {
  const str = voice + '|' + speechText(text);
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export const audioPath = (voice, text) => `audio/${voice}/${audioKey(voice, text)}.mp3`;

// Голоса для участников диалога: по полу из content/voices.json,
// второй участник того же пола получает второй голос (F2 / M2).
export function dialogVoices(lines, genders) {
  const map = new Map();
  const used = { F: 0, M: 0 };
  for (const l of lines) {
    if (map.has(l.who)) continue;
    const g = genders.M?.includes(l.who) ? 'M' : 'F';
    map.set(l.who, used[g]++ % 2 === 0 ? g : g + '2');
  }
  return map;
}

// Токены предложения для упражнения «Собери фразу» (та же логика, что в генераторе упражнений).
export const tokenize = (ko) => ko.replace(/[.,!?~…]/g, '').split(/\s+/).filter(Boolean);
