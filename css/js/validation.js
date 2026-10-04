/** Validation rules. Pure functions: no DOM, no storage. */
export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['pending', 'completed'];

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 500;

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2025-02-30). */
export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  if (y < 2000 || y > 2100) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Returns { valid, errors } where errors maps field name -> message. */
export function validateTask(data) {
  const errors = {};
  const title = (data.title ?? '').trim();
  const description = (data.description ?? '').trim();

  if (!title) errors.title = 'Enter a title for the task.';
  else if (title.length > MAX_TITLE) errors.title = `Title must be ${MAX_TITLE} characters or fewer.`;

  if (description.length > MAX_DESCRIPTION) errors.description = `Description must be ${MAX_DESCRIPTION} characters or fewer.`;
  if (!PRIORITIES.includes(data.priority)) errors.priority = 'Choose Low, Medium or High.';
  if (!STATUSES.includes(data.status)) errors.status = 'Choose Pending or Completed.';
  if (data.dueDate && !isValidDate(data.dueDate)) errors.dueDate = 'Enter a valid due date.';

  return { valid: Object.keys(errors).length === 0, errors };
}