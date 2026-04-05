/**
 * Shared Outbox utilities for all LocalRepositories.
 * Single source of truth for ID generation and outbox event recording.
 */

/** Generates a cryptographically random UUID */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const recordOutboxEvent = async (
  db: any,
  entityType: string,
  action: string,
  payload: object
): Promise<void> => {
  const id = generateId();
  await db.execute(
    `INSERT INTO outbox_events (id, entity_type, action, payload_json, status) VALUES ($1, $2, $3, $4, 'pending')`,
    [id, entityType, action, JSON.stringify(payload)]
  );
};
