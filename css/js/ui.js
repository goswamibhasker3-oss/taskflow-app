/** UI layer: all DOM reading/writing lives here. No business logic. */
const $ = (sel) => document.querySelector(sel);

const els = {
  list: $('#task-list'), empty: $('#empty'), emptyTitle: $('#empty-title'), emptyText: $('#empty-text'),
  emptyAdd: $('#empty-add-btn'), loading: $('#loading'), stats: $('#stats'), footer: $('#list-footer'),
  taskDialog: $('#task-dialog'), form: $('#task-form'), dialogTitle: $('#dialog-title'),
  saveBtn: $('#save-btn'), cancelBtn: $('#cancel-btn'),
  confirmDialog: $('#confirm-dialog'), confirmTitle: $('#confirm-title'), confirmText: $('#confirm-text'), confirmOk: $('#confirm-ok'),
  toast: $('#toast'), themeToggle: $('#theme-toggle'), themeIcon: $('#theme-icon')
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const parseLocal = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return new Date(y, m - 1, d); };
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k in node && k !== 'list') node[k] = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter(c => c != null));
  return node;
}

/* ---------- Rendering ---------- */
function buildCard(task) {
  const done = task.status === 'completed';
  const overdue = !done && task.dueDate && parseLocal(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const meta = h('div', { class: 'meta' },
    h('span', { class: `badge priority-${task.priority}` }, `${cap(task.priority)} priority`),
    h('span', { class: 'badge' }, cap(task.status)),
    task.dueDate ? h('span', { class: `badge${overdue ? ' overdue' : ''}` }, `${overdue ? 'Overdue: ' : 'Due '}${fmtDate(parseLocal(task.dueDate))}`) : null,
    h('span', { class: 'badge' }, `Created ${fmtDate(task.createdAt)}`)
  );

  return h('li', { class: `task-card p-${task.priority}${done ? ' done' : ''}`, 'data-id': task.id },
    h('input', { type: 'checkbox', checked: done, 'data-action': 'toggle', 'aria-label': `Mark "${task.title}" as ${done ? 'pending' : 'completed'}` }),
    h('div', {},
      h('h3', { class: 'task-title' }, task.title),
      task.description ? h('p', { class: 'task-desc' }, task.description) : null,
      meta,
      h('div', { class: 'card-actions' },
        h('button', { type: 'button', class: 'btn btn-sm', 'data-action': 'edit', 'aria-label': `Edit "${task.title}"` }, 'Edit'),
        h('button', { type: 'button', class: 'btn btn-sm btn-danger-ghost', 'data-action': 'delete', 'aria-label': `Delete "${task.title}"` }, 'Delete')
      )
    )
  );
}

export function renderTasks(tasks, stats, { filtersActive }) {
  els.list.replaceChildren(...tasks.map(buildCard));
  els.stats.textContent = stats.total
    ? `${stats.pending} pending · ${stats.completed} completed`
    : 'Nothing to do yet';
  els.footer.hidden = stats.completed === 0;

  const showEmpty = tasks.length === 0;
  els.empty.hidden = !showEmpty;
  if (showEmpty) {
    const noMatches = stats.total > 0 && filtersActive;
    els.emptyTitle.textContent = noMatches ? 'No matching tasks' : 'No tasks yet';
    els.emptyText.textContent = noMatches ? 'Try a different search or filter.' : 'Add your first task to get started.';
    els.emptyAdd.hidden = noMatches;
  }
}

export function showLoading(on) {
  els.loading.hidden = !on;
  if (on) { els.empty.hidden = true; els.list.replaceChildren(); }
}

let toastTimer;
export function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

/* ---------- Theme ---------- */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  els.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
  els.themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}
export const currentTheme = () => document.documentElement.dataset.theme || 'light';

/* ---------- Task form ---------- */
const FIELD_ERRORS = { title: '#err-title', description: '#err-description', dueDate: '#err-due', form: '#err-form' };

export function clearErrors() {
  Object.values(FIELD_ERRORS).forEach(sel => { $(sel).textContent = ''; });
  els.form.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
}

export function showErrors(errors) {
  clearErrors();
  for (const [field, msg] of Object.entries(errors)) {
    const target = FIELD_ERRORS[field] || FIELD_ERRORS.form;
    $(target).textContent = msg;
    const input = els.form.elements[field];
    if (input) input.setAttribute('aria-invalid', 'true');
  }
  const firstInvalid = els.form.querySelector('[aria-invalid="true"]');
  if (firstInvalid) firstInvalid.focus();
}

export function openTaskForm(task = null) {
  clearErrors();
  els.form.reset();
  els.form.dataset.editId = task ? task.id : '';
  els.dialogTitle.textContent = task ? 'Edit task' : 'Add task';
  els.saveBtn.textContent = task ? 'Save changes' : 'Add task';
  if (task) {
    for (const key of ['title', 'description', 'priority', 'dueDate', 'status']) els.form.elements[key].value = task[key];
  }
  els.taskDialog.showModal();
  els.form.elements.title.focus();
}

export const closeTaskForm = () => els.taskDialog.close();
export const readForm = () => Object.fromEntries(new FormData(els.form).entries());

export function setSaving(on) {
  els.saveBtn.disabled = on;
  els.saveBtn.setAttribute('aria-busy', String(on));
}

/* ---------- Confirm dialog ---------- */
export function confirmAction({ title, message, confirmLabel = 'Delete' }) {
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = message;
  els.confirmOk.textContent = confirmLabel;
  return new Promise(resolve => {
    els.confirmDialog.addEventListener('close', () => resolve(els.confirmDialog.returnValue === 'ok'), { once: true });
    els.confirmDialog.returnValue = 'cancel';
    els.confirmDialog.showModal();
    $('#confirm-cancel').focus();   // safe default: focus Cancel
  });
}

/* ---------- Event binding ---------- */
export function bindEvents(h_) {
  $('#add-task-btn').addEventListener('click', () => openTaskForm());
  els.emptyAdd.addEventListener('click', () => openTaskForm());
  els.cancelBtn.addEventListener('click', closeTaskForm);
  els.themeToggle.addEventListener('click', h_.onThemeToggle);
  $('#clear-completed').addEventListener('click', h_.onClearCompleted);
  $('#search').addEventListener('input', e => h_.onSearch(e.target.value));
  $('#sort').addEventListener('change', e => h_.onSort(e.target.value));

  document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    h_.onFilter(btn.dataset.filter);
  }));

  els.form.addEventListener('submit', e => { e.preventDefault(); h_.onSubmit(readForm(), els.form.dataset.editId || null); });

  els.list.addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('.task-card').dataset.id;
    if (btn.dataset.action === 'edit') h_.onEdit(id);
    if (btn.dataset.action === 'delete') h_.onDelete(id);
  });
  els.list.addEventListener('change', e => {
    if (e.target.dataset.action === 'toggle') h_.onToggle(e.target.closest('.task-card').dataset.id);
  });
}