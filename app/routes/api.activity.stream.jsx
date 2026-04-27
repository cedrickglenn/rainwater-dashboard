// Resource route: /api/activity/stream
//
// GET — Server-Sent Events stream.
//       Proxies the Railway bridge SSE endpoint so Vercel serverless never
//       holds a long-lived polling connection to MongoDB.
//
// Event types forwarded from bridge:
//   ping           — keepalive, payload { ts }
//   log            — activity log entry, payload { id, source, level, type, message, category, timestamp }
//   device-status  — device liveness, payload { esp32: { online, lastSeen }, mega: { online, lastSeen } }
//   actuator-state — actuator snapshot, payload { states: { [id]: { state, type, confirmed } } }

export async function loader({ request }) {
  const { BRIDGE_URL } = process.env;
  if (!BRIDGE_URL) {
    return new Response('BRIDGE_URL not configured', { status: 503 });
  }

  const { signal } = request;

  let bridgeRes;
  try {
    bridgeRes = await fetch(`${BRIDGE_URL}/activity/stream`, { signal });
  } catch (err) {
    return new Response(`Bridge unreachable: ${err.message}`, { status: 502 });
  }

  if (!bridgeRes.ok) {
    return new Response(`Bridge error: ${bridgeRes.status}`, { status: 502 });
  }

  return new Response(bridgeRes.body, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
