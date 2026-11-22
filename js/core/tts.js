// Озвучка через Web Speech API (ko-KR). Бесплатно, работает офлайн, если голос установлен в системе.

import { state } from './store.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
let current = null;
let keepAlive = null;

export const ttsSupported = !!synth;

function refresh() {
  if (!synth) return;
  voices = synth.getVoices().filter((v) => /^ko([-_]|$)/i.test(v.lang));
}

export function initTTS() {
  if (!synth) return;
  refresh();
  synth.addEventListener?.('voiceschanged', refresh);
  if (!synth.addEventListener) synth.onvoiceschanged = refresh;
}

export function koreanVoices() { refresh(); return voices; }

export function hasKoreanVoice() { refresh(); return voices.length > 0; }

function pickVoice() {
  if (!voices.length) refresh();
  const pref = state.settings.voice;
  return voices.find((v) => v.voiceURI === pref)
    || voices.find((v) => /google/i.test(v.name))
    || voices.find((v) => /yuna|heami|sunhi|injoon|seoyeon/i.test(v.name))
    || voices[0] || null;
}

// Скобки вида [한구거] — подсказка произношения: озвучиваем то, что внутри.
function clean(text) {
  const m = String(text).match(/\[([^\]]+)\]/);
  return (m ? m[1] : String(text)).replace(/___/g, ' ').trim();
}

export function speak(text, { rate, onstart, onend } = {}) {
  return new Promise((resolve) => {
    if (!synth || !text) { onend?.(); resolve(false); return; }
    synth.cancel();
    clearInterval(keepAlive);
    const u = new SpeechSynthesisUtterance(clean(text));
    u.lang = 'ko-KR';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = rate ?? state.settings.rate ?? 0.9;
    u.pitch = 1;
    current = u;
    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      clearInterval(keepAlive);
      if (current === u) current = null;
      onend?.();
      resolve(ok);
    };
    u.onstart = () => onstart?.();
    u.onend = () => done(true);
    u.onerror = () => done(false);
    // Chrome иногда «засыпает» на длинных фразах — подталкиваем.
    keepAlive = setInterval(() => { if (synth.speaking && !synth.paused) { synth.pause(); synth.resume(); } }, 10000);
    // Страховка: если событие окончания не пришло.
    setTimeout(() => done(true), 4000 + clean(text).length * 450 / (u.rate || 1));
    synth.speak(u);
  });
}

export function stopSpeaking() { if (synth) synth.cancel(); clearInterval(keepAlive); }
export const isSpeaking = () => !!(synth && synth.speaking);

// Кнопка-динамик: подсвечивается, пока звучит.
export function bindSpeakButton(btn, getText, opts = {}) {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = typeof getText === 'function' ? getText() : getText;
    btn.classList.add('playing');
    speak(text, { ...opts, onend: () => btn.classList.remove('playing') });
  });
  return btn;
}
