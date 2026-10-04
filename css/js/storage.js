/**
 * Storage layer.
 * Any storage adapter only needs these two async methods:
 *   getAll()          -> Promise<Task[]>
 *   saveAll(tasks)    -> Promise<void>
 * To add a backend later, write an adapter with the same methods
 * (e.g. one that calls a REST API) and pass it to TaskManager in app.js.
 */
const TASKS_KEY = 'taskboard:tasks';
const THEME_KEY = 'taskboard:theme';

export class LocalStorageAdapter {
  async getAll() {
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Could not read tasks from localStorage:', err);
      return [];
    }
  }

  async saveAll(tasks) {
    try {
      localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (err) {
      throw new Error('Could not save tasks. Browser storage may be full or disabled.');
    }
  }
}

export const themeStorage = {
  get() {
    try { return localStorage.getItem(THEME_KEY); } catch { return null; }
  },
  set(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }
};