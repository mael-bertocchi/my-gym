/**
 * @type ConflictResolution
 * @description The outcome of a last-write-wins comparison: apply the incoming change or keep the stored one.
 */
export type ConflictResolution = 'apply' | 'keep';

/**
 * @function resolveConflict
 * @description Last-write-wins decision for a pushed record. The client's change is applied when its modification time is at least as recent as the server's; otherwise the server version is kept. Ties favour the client so an idempotent re-push of the same edit still applies.
 *
 * @param {Date} serverUpdatedAt The stored record's last-modified time.
 * @param {Date} clientUpdatedAt The incoming record's client-supplied last-modified time.
 * @returns {ConflictResolution} 'apply' to overwrite with the client version, 'keep' to retain the server version.
 */
export function resolveConflict(serverUpdatedAt: Date, clientUpdatedAt: Date): ConflictResolution {
    return clientUpdatedAt.getTime() >= serverUpdatedAt.getTime() ? 'apply' : 'keep';
}
