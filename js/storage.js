/* =========================================================
   storage.js — persistence layer
   Wraps localStorage behind a small async-friendly API so the
   backing store can later be swapped for a remote database
   (e.g. Firebase Realtime Database) without touching app.js.
   ========================================================= */

const Storage = (() => {
  const DB_KEY = 'bpst_data_v1';

  function readDb() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return { bp: [], glucose: [] };
      const parsed = JSON.parse(raw);
      return {
        bp: Array.isArray(parsed.bp) ? parsed.bp : [],
        glucose: Array.isArray(parsed.glucose) ? parsed.glucose : []
      };
    } catch (e) {
      console.error('Storage read failed', e);
      return { bp: [], glucose: [] };
    }
  }

  function writeDb(db) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error('Storage write failed', e);
      return false;
    }
  }

  function uid() {
    return 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function getAll(type) {
    const db = readDb();
    return (db[type] || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function add(type, entry) {
    const db = readDb();
    const record = Object.assign({ id: uid(), createdAt: new Date().toISOString() }, entry);
    db[type] = db[type] || [];
    db[type].push(record);
    writeDb(db);
    return record;
  }

  function update(type, id, updates) {
    const db = readDb();
    const list = db[type] || [];
    const idx = list.findIndex(r => r.id === id);
    if (idx === -1) return null;
    list[idx] = Object.assign({}, list[idx], updates, { updatedAt: new Date().toISOString() });
    writeDb(db);
    return list[idx];
  }

  function remove(type, id) {
    const db = readDb();
    db[type] = (db[type] || []).filter(r => r.id !== id);
    writeDb(db);
    return true;
  }

  function clearAll() {
    writeDb({ bp: [], glucose: [] });
  }

  function exportJson() {
    return JSON.stringify(readDb(), null, 2);
  }

  // ---- settings (units, reminders, etc.) ----
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

  return { getAll, add, update, remove, clearAll, exportJson, getSettings, setSettings };
})();
