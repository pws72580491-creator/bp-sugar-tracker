/* =========================================================
   storage.js — persistence layer (Firebase Realtime Database)
   Keeps the same public API the app was already built against
   (getAll/add/update/remove/clearAll/exportJson/getSettings/
   setSettings) so app.js barely has to change. Reads are served
   from an in-memory cache kept in sync via Firebase's realtime
   `on('value', ...)` listeners; writes go straight to Firebase.
   Whenever the cache changes (locally or from another device),
   a 'bpst:data-changed' event fires on window so the UI re-renders.

   Note: readings are shared across every device pointed at this
   Firebase project (there's no per-user auth in this app yet).
   Personal preferences (unit display) stay in localStorage since
   those are per-device, not health data.
   ========================================================= */

const Storage = (() => {
  const READING_TYPES = ['bp', 'glucose'];
  const cache = { bp: {}, glucose: {} };
  const loaded = { bp: false, glucose: false };
  const failed = { bp: false, glucose: false };

  const db = window.FirebaseDB || null;
  const available = !!db;

  function notifyChange() {
    window.dispatchEvent(new CustomEvent('bpst:data-changed'));
  }

  function attachListener(type) {
    db.ref('readings/' + type).on('value',
      snapshot => {
        cache[type] = snapshot.val() || {};
        loaded[type] = true;
        failed[type] = false;
        notifyChange();
      },
      error => {
        console.error('Firebase read failed for ' + type, error);
        loaded[type] = true;
        failed[type] = true;
        notifyChange();
      }
    );
  }

  if (available) {
    READING_TYPES.forEach(attachListener);
  } else {
    console.error('Storage: Firebase가 연결되지 않아 읽기/쓰기를 사용할 수 없습니다.');
    READING_TYPES.forEach(t => { loaded[t] = true; failed[t] = true; });
  }

  function isReady() {
    return loaded.bp && loaded.glucose;
  }
  function isAvailable() {
    return available && !failed.bp && !failed.glucose;
  }

  function getAll(type) {
    const obj = cache[type] || {};
    return Object.keys(obj)
      .map(id => Object.assign({ id }, obj[id]))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function add(type, entry) {
    if (!available) return Promise.reject(new Error('Firebase not available'));
    const ref = db.ref('readings/' + type).push();
    const record = Object.assign({ createdAt: new Date().toISOString() }, entry);
    return ref.set(record).then(() => Object.assign({ id: ref.key }, record));
  }

  function update(type, id, updates) {
    if (!available) return Promise.reject(new Error('Firebase not available'));
    const record = Object.assign({}, updates, { updatedAt: new Date().toISOString() });
    return db.ref('readings/' + type + '/' + id).update(record).then(() => true);
  }

  function remove(type, id) {
    if (!available) return Promise.reject(new Error('Firebase not available'));
    return db.ref('readings/' + type + '/' + id).remove().then(() => true);
  }

  function clearAll() {
    if (!available) return Promise.reject(new Error('Firebase not available'));
    return Promise.all(READING_TYPES.map(t => db.ref('readings/' + t).remove()));
  }

  function exportJson() {
    return JSON.stringify({ bp: getAll('bp'), glucose: getAll('glucose') }, null, 2);
  }

  // ---- settings (units, reminders, etc.) — stays device-local ----
  const SETTINGS_KEY = 'bpst_settings_v1';
  const DEFAULT_SETTINGS = { glucoseUnit: 'mgdl', bpUnit: 'mmHg' };

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : Object.assign({}, DEFAULT_SETTINGS);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function setSettings(updates) {
    const current = getSettings();
    const next = Object.assign({}, current, updates);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  return {
    getAll, add, update, remove, clearAll, exportJson,
    getSettings, setSettings, isReady, isAvailable
  };
})();
