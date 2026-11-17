/**
 * Status constants for LocoMuv task statuses.
 * Matches the values used across the app: 'pending', 'accepted', 'picked-up',
 * 'in-transit', 'arriving', 'completed', 'cancelled', 'deleted'.
 */
export const ACTIVE_STATUSES = ['accepted', 'picked-up', 'in-transit', 'arriving'];
export const PENDING_STATUSES = ['pending', 'open'];
export const DONE_STATUSES = ['delivered', 'completed'];
export const CANCELLED_STATUSES = ['cancelled'];

/**
 * Groups tasks by status into a single source of truth.
 * Deduplicates by id so no task appears twice.
 */
export const groupTasks = (tasks) => {
  const unique = Array.from(new Map(tasks.map((t) => [t._id || t.id, t])).values());
  return {
    all: unique,
    pending: unique.filter((t) => PENDING_STATUSES.includes(t.status)),
    active: unique.filter((t) => ACTIVE_STATUSES.includes(t.status)),
    completed: unique.filter((t) => DONE_STATUSES.includes(t.status)),
    cancelled: unique.filter((t) => CANCELLED_STATUSES.includes(t.status)),
  };
};
