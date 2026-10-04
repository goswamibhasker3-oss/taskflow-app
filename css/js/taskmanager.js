/** Task management: business logic only. No DOM access. */
import { validateTask } from './validation.js';

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export class TaskManager {
  constructor(storage) {
    this.storage = storage;
    this.tasks = [];
  }

  async init() {
    this.tasks = await this.storage.getAll();
  }

  async #persist() {
    await this.storage.saveAll(this.tasks);
  }

  #normalize(data) {
    return {
      title: data.title.trim(),
      description: (data.description ?? '').trim(),
      priority: data.priority,
      dueDate: data.dueDate || '',
      status: data.status
    };
  }

  /** Same title + same due date as another task = duplicate. */
  #isDuplicate(fields, ignoreId) {
    return this.tasks.some(t =>
      t.id !== ignoreId &&
      t.title.toLowerCase() === fields.title.toLowerCase() &&
      t.dueDate === fields.dueDate
    );
  }

  async add(data) {
    const { valid, errors } = validateTask(data);
    if (!valid) return { ok: false, errors };
    const fields = this.#normalize(data);
    if (this.#isDuplicate(fields)) {
      return { ok: false, errors: { form: 'A task with this title and due date already exists.' } };
    }
    const task = { id: newId(), ...fields, createdAt: new Date().toISOString() };
    this.tasks.push(task);
    await this.#persist();
    return { ok: true, task };
  }

  async update(id, data) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return { ok: false, errors: { form: 'This task no longer exists.' } };
    const { valid, errors } = validateTask(data);
    if (!valid) return { ok: false, errors };
    const fields = this.#normalize(data);
    if (this.#isDuplicate(fields, id)) {
      return { ok: false, errors: { form: 'A task with this title and due date already exists.' } };
    }
    Object.assign(task, fields);
    await this.#persist();
    return { ok: true, task };
  }

  async remove(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    await this.#persist();
  }

  async toggleStatus(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    await this.#persist();
    return task;
  }

  async clearCompleted() {
    this.tasks = this.tasks.filter(t => t.status !== 'completed');
    await this.#persist();
  }

  get(id) { return this.tasks.find(t => t.id === id); }

  stats() {
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    return { total: this.tasks.length, completed, pending: this.tasks.length - completed };
  }

  /** Apply filter, search and sort. Returns a new array. */
  query({ filter = 'all', search = '', sort = 'created' } = {}) {
    const term = search.trim().toLowerCase();
    let list = this.tasks.filter(t => {
      if (filter === 'active' && t.status !== 'pending') return false;
      if (filter === 'completed' && t.status !== 'completed') return false;
      if (filter === 'high' && t.priority !== 'high') return false;
      if (term && !`${t.title} ${t.description}`.toLowerCase().includes(term)) return false;
      return true;
    });

    const byCreated = (a, b) => b.createdAt.localeCompare(a.createdAt);
    const sorters = {
      created: byCreated,
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byCreated(a, b),
      due: (a, b) => {
        if (!a.dueDate && !b.dueDate) return byCreated(a, b);
        if (!a.dueDate) return 1;   // tasks without a due date go last
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate) || byCreated(a, b);
      }
    };
    return list.sort(sorters[sort] || byCreated);
  }
}