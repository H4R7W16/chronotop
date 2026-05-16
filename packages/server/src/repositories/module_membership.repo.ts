import { get, run } from '../dbHelper.js';

export const ROLE_LEVEL: Record<string, number> = {
  viewer: 0,
  learner: 1,
  author: 2,
  framework_dev: 3,
};

export function findMembershipRole(userId: string, moduleId: string): string | null {
  const row = get(
    'SELECT role FROM module_membership WHERE user_id = ? AND module_id = ?',
    [userId, moduleId],
  );
  return row?.role ?? null;
}

/** Liefert die effektive Rolle: max(globalRole, Mitgliedschaftsrolle). */
export function getEffectiveRole(userId: string, globalRole: string, moduleId: string): string {
  // framework_dev hat überall vollen Zugriff
  if ((ROLE_LEVEL[globalRole] ?? 0) >= ROLE_LEVEL.framework_dev) return globalRole;
  const memberRole = findMembershipRole(userId, moduleId);
  if (memberRole && (ROLE_LEVEL[memberRole] ?? 0) > (ROLE_LEVEL[globalRole] ?? 0)) {
    return memberRole;
  }
  return globalRole;
}

/** Setzt (oder überschreibt) die Rolle eines Users für ein Modul. */
export function grant(userId: string, moduleId: string, role: string): void {
  run(
    `INSERT INTO module_membership (user_id, module_id, role) VALUES (?, ?, ?)
     ON CONFLICT(user_id, module_id) DO UPDATE SET role = excluded.role`,
    [userId, moduleId, role],
  );
}

/** Entzieht die Modul-Mitgliedschaft. */
export function revoke(userId: string, moduleId: string): void {
  run('DELETE FROM module_membership WHERE user_id = ? AND module_id = ?', [userId, moduleId]);
}
