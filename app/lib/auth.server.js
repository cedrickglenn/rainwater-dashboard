import { redirect } from '@remix-run/node';
import bcrypt from 'bcryptjs';
import { getSession, commitSession, destroySession } from './session.server';

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

export const ROLES = { admin: 3, operator: 2, viewer: 1 };

function hasRole(user, minRole) {
  return user && (ROLES[user.role] ?? 0) >= (ROLES[minRole] ?? 0);
}

// ---------------------------------------------------------------------------
// User lookup (MongoDB)
// ---------------------------------------------------------------------------

async function findUser(username) {
  const { getDb } = await import('./db.server');
  const db = await getDb();
  return db.collection('users').findOne({ username });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function login({ username, password }) {
  const user = await findUser(username);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  // Update last login
  const { getDb } = await import('./db.server');
  const db = await getDb();
  await db.collection('users').updateOne(
    { username },
    { $set: { lastLoginAt: new Date() } }
  );

  return { username: user.username, role: user.role };
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export async function createUserSession(request, user, redirectTo = '/') {
  const session = await getSession(request);
  session.set('user', user);
  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await commitSession(session) },
  });
}

export async function getUser(request) {
  const session = await getSession(request);
  return session.get('user') ?? null;
}

export async function logout(request) {
  const session = await getSession(request);
  return redirect('/login', {
    headers: { 'Set-Cookie': await destroySession(session) },
  });
}

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

export async function requireRole(request, minRole) {
  const user = await getUser(request);
  if (!hasRole(user, minRole)) {
    const url = new URL(request.url);
    throw redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
  }
  return user;
}

export const requireAdmin    = (req) => requireRole(req, 'admin');
export const requireOperator = (req) => requireRole(req, 'operator');

export async function requireGuest(request) {
  const user = await getUser(request);
  if (user) throw redirect('/');
}

// ---------------------------------------------------------------------------
// User management (admin only)
// ---------------------------------------------------------------------------

export async function listUsers() {
  const { getDb } = await import('./db.server');
  const db = await getDb();
  return db.collection('users')
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function createUser({ username, password, role, createdBy }) {
  const { getDb } = await import('./db.server');
  const db = await getDb();

  const existing = await db.collection('users').findOne({ username });
  if (existing) return { error: 'Username already taken' };

  const passwordHash = await bcrypt.hash(password, 12);
  await db.collection('users').insertOne({
    username, passwordHash, role,
    createdBy, createdAt: new Date(), lastLoginAt: null,
  });
  return { ok: true };
}

export async function updateUserRole({ username, role, requestingUser }) {
  if (username === requestingUser) return { error: "Cannot change your own role" };
  const { getDb } = await import('./db.server');
  const db = await getDb();
  await db.collection('users').updateOne({ username }, { $set: { role } });
  return { ok: true };
}

export async function deleteUser({ username, requestingUser }) {
  if (username === requestingUser) return { error: "Cannot delete your own account" };
  const { getDb } = await import('./db.server');
  const db = await getDb();
  await db.collection('users').deleteOne({ username });
  return { ok: true };
}

export async function changePassword({ username, currentPassword, newPassword }) {
  const user = await findUser(username);
  if (!user) return { error: 'User not found' };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { error: 'Current password is incorrect' };

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const { getDb } = await import('./db.server');
  const db = await getDb();
  await db.collection('users').updateOne({ username }, { $set: { passwordHash } });
  return { ok: true };
}
