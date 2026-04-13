/**
 * POST /api/push/subscribe   — save a push subscription for the logged-in admin
 * DELETE /api/push/subscribe — remove a push subscription by endpoint
 */

import { json } from '@remix-run/node';

export const action = async ({ request }) => {
  const { requireAdmin, getUser } = await import('~/lib/auth.server');
  await requireAdmin(request);
  const user = await getUser(request);

  const { getDb } = await import('~/lib/db.server');
  const db = await getDb();
  const col = db.collection('push_subscriptions');

  if (request.method === 'DELETE') {
    const { endpoint } = await request.json();
    if (!endpoint) return json({ error: 'endpoint required' }, { status: 400 });
    await col.deleteOne({ endpoint });
    return json({ ok: true });
  }

  if (request.method === 'POST') {
    const sub = await request.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return json({ error: 'invalid subscription object' }, { status: 400 });
    }
    // Upsert by endpoint so re-subscribing on the same device doesn't duplicate
    await col.updateOne(
      { endpoint: sub.endpoint },
      { $set: { ...sub, userId: user.username, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
    return json({ ok: true });
  }

  return json({ error: 'method not allowed' }, { status: 405 });
};
