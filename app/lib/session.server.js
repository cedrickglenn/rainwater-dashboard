import { createCookieSessionStorage, redirect } from '@remix-run/node';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__rw_session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET ?? 'fallback-dev-secret-change-in-prod'],
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export function getSession(request) {
  return sessionStorage.getSession(request.headers.get('Cookie'));
}

export function commitSession(session) {
  return sessionStorage.commitSession(session);
}

export function destroySession(session) {
  return sessionStorage.destroySession(session);
}
