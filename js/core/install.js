// Установка приложения на телефон (PWA).
// Android/Chrome: ловим событие beforeinstallprompt и показываем свою кнопку «Установить».
// iPhone: системной кнопки нет — показываем короткую инструкцию.

let deferred = null;
const listeners = new Set();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((fn) => fn());
});
window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((fn) => fn()); });

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPrompt = () => !!deferred;
export const onInstallChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  return outcome === 'accepted';
}

const KEY = 'hb-install-dismissed';
export function installDismissed() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
export function dismissInstall() { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } }

// Показывать ли карточку «Установить приложение» на главной.
export const shouldOfferInstall = () => !isStandalone() && !installDismissed() && (canPrompt() || isIOS());
