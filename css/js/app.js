/** Entry point: connects storage, task logic and UI. */
import { LocalStorageAdapter, themeStorage } from './storage.js';
import { TaskManager } from './taskmanager.js';
import * as ui from './ui.js';

// To use a backend later, swap this adapter for one that calls your API.
const manager = new TaskManager(new LocalStorageAdapter());
const view = { filter: 'all', search: '', sort: 'created' };
let saving = false;

function render() {
  const filtersActive = view.filter !== 'all' || view.search.trim() !== '';
  ui.renderTasks(manager.query(view), manager.stats(), { filtersActive });
}

async function safely(action, errorMessage) {
  try { return await action(); }
  catch (err) { console.error(err); ui.toast(err.message || errorMessage); }
}

const handlers = {
  onSearch(value) { view.search = value; render(); },
  onSort(value) { view.sort = value; render(); },
  onFilter(value) { view.filter = value; render(); },

  onThemeToggle() {
    const next = ui.currentTheme() === 'dark' ? 'light' : 'dark';
    ui.applyTheme(next);
    themeStorage.set(next);
  },

  async onSubmit(data, editId) {
    if (saving) return;                  // block double submissions
    saving = true; ui.setSaving(true);
    try {
      const result = editId ? await manager.update(editId, data) : await manager.add(data);
      if (!result.ok) { ui.showErrors(result.errors); return; }
      ui.closeTaskForm();
      render();
      ui.toast(editId ? 'Task updated' : 'Task added');
    } catch (err) {
      ui.showErrors({ form: err.message });
    } finally {
      saving = false; ui.setSaving(false);
    }
  },

  onEdit(id) { const task = manager.get(id); if (task) ui.openTaskForm(task); },

  async onToggle(id) {
    const task = await safely(() => manager.toggleStatus(id), 'Could not update task');
    render();
    if (task) ui.toast(task.status === 'completed' ? 'Marked as completed' : 'Marked as pending');
  },

  async onDelete(id) {
    const task = manager.get(id);
    if (!task) return;
    const ok = await ui.confirmAction({ title: 'Delete task?', message: `"${task.title}" will be permanently deleted.` });
    if (!ok) return;
    await safely(() => manager.remove(id), 'Could not delete task');
    render();
    ui.toast('Task deleted');
  },

  async onClearCompleted() {
    const count = manager.stats().completed;
    const ok = await ui.confirmAction({
      title: 'Clear completed tasks?',
      message: `${count} completed task${count === 1 ? '' : 's'} will be permanently deleted.`,
      confirmLabel: 'Clear all'
    });
    if (!ok) return;
    await safely(() => manager.clearCompleted(), 'Could not clear tasks');
    render();
    ui.toast('Completed tasks cleared');
  }
};

async function init() {
  ui.applyTheme(ui.currentTheme());
  ui.bindEvents(handlers);
  ui.showLoading(true);
  await safely(() => manager.init(), 'Could not load tasks');
  await new Promise(r => setTimeout(r, 300));   // brief delay so the loading state is visible
  ui.showLoading(false);
  render();
}

init();