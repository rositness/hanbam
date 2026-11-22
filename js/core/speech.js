// Распознавание речи (если браузер поддерживает). Используется в упражнении «Скажи вслух».

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
export const canRecognize = !!SR;

let active = null;

export function listen({ lang = 'ko-KR', timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!SR) { reject(new Error('unsupported')); return; }
    stopListening();
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    active = rec;
    let settled = false;
    const finish = (fn, v) => { if (settled) return; settled = true; clearTimeout(t); active = null; fn(v); };
    const t = setTimeout(() => { try { rec.stop(); } catch { /* ignore */ } }, timeout);
    rec.onresult = (e) => {
      const alts = [];
      for (const res of e.results) for (const a of res) alts.push(a.transcript);
      finish(resolve, alts);
    };
    rec.onerror = (e) => finish(reject, new Error(e.error || 'error'));
    rec.onend = () => finish(resolve, []);
    try { rec.start(); } catch (e) { finish(reject, e); }
  });
}

export function stopListening() {
  if (active) { try { active.abort(); } catch { /* ignore */ } active = null; }
}
