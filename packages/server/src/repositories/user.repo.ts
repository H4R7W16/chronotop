import { all, get, run } from '../dbHelper.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export function findById(id: string): UserRow | null {
  return get('SELECT * FROM users WHERE id = ?', [id]) ?? null;
}

export function findByEmail(email: string): UserRow | null {
  return get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]) ?? null;
}

export function countAll(): number {
  const row = get('SELECT COUNT(*) as c FROM users');
  return (row?.c as number) ?? 0;
}

export function create(
  id: string,
  email: string,
  passwordHash: string,
  displayName: string,
  role?: string,
): PublicUser {
  // Erster User wird automatisch framework_dev (Bootstrap)
  const actualRole = role ?? (countAll() === 0 ? 'framework_dev' : 'viewer');
  run(
    'INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
    [id, email.toLowerCase(), passwordHash, displayName, actualRole],
  );
  return toPublic(findById(id)!);
}

export { toPublic };
