// Resource route: /api/activity/stream
//
// GET — Server-Sent Events stream.
//       Polls MongoDB every 2 s for new activity_logs entries and pushes
//       them to the dashboard in real time.
//
// Event types:
//   ping  — keepalive, payload { ts }
//   log   — new log entry, payload matches ActivityLog item shape
//   error — unrecoverable server error
//
// Reconnection: SSE clients auto-reconnect. Each event carries an `id:`
// equal to the MongoDB _id string, so on reconnect the client sends
// Last-Event-ID and the stream resumes from that point.
//
// Note: SSE streams are long-lived connections. On serverless platforms
// (Vercel) the function will time out after ~30 s. The browser's SSE
// client reconnects automatically — just no live push during that gap.

import { getDb } from '~/lib/db.server';
import { ObjectId } from 'mongodb';

export async function loader({ request }) {
  const { signal } = request;

  // Resolve the starting cursor: honour Last-Event-ID for reconnections
  const lastEventId = request.headers.get('Last-Event-ID');
  let lastId;
  try {
    lastId = lastEventId ? new ObjectId(lastEventId) : null;
  } catch {
    lastId = null;
  }

  // If no cursor supplied, start from the most recent document so we only
  // push entries that arrive after the page finishes its initial load.
  if (!lastId) {
    const db     = await getDb();
    const latest = await db
      .collection('activity_logs')
      .findOne({}, { sort: { _id: -1 }, projection: { _id: 1 } });
    lastId = latest?._id ?? null;
  }

  const encoder  = new TextEncoder();
  let intervalId = null;

  const stream = new ReadableStream({
    async start(controller) {
      const db = await getDb();

      const enqueue = (eventType, data, id) => {
        try {
          let chunk = '';
          if (id)        chunk += `id: ${id}\n`;
          chunk += `event: ${eventType}\n`;
          chunk += `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed (client disconnected)
        }
      };

      // Initial ping so the client knows the stream is alive
      enqueue('ping', { ts: Date.now() });

      intervalId = setInterval(async () => {
        if (signal.aborted) {
          clearInterval(intervalId);
          try { controller.close(); } catch {}
          return;
        }

        try {
          const query  = lastId ? { _id: { $gt: lastId } } : {};
          const entries = await db
            .collection('activity_logs')
            .find(query)
            .sort({ _id: 1 })
            .limit(20)
            .toArray();

          for (const entry of entries) {
            lastId = entry._id;
            enqueue(
              'log',
              {
                id:        entry._id.toString(),
                source:    entry.source,
                level:     entry.level,
                message:   entry.message,
                type:      entry.type     ?? 'info',
                category:  entry.category ?? entry.source,
                timestamp: entry.timestamp,
              },
              entry._id.toString()
            );
          }

          // Keepalive ping when nothing new
          if (entries.length === 0) {
            enqueue('ping', { ts: Date.now() });
          }
        } catch {
          // Transient DB error — keep the interval running
        }
      }, 2000);

      signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      clearInterval(intervalId);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx / Vercel edge buffering
    },
  });
}
