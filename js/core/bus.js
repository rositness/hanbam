// Шина событий приложения: «xp», «levelup», «achievement», «goal», «toast».
const target = new EventTarget();

export function emit(type, detail) { target.dispatchEvent(new CustomEvent(type, { detail })); }
export function on(type, fn) {
  const handler = (e) => fn(e.detail);
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}
