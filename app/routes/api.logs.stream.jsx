// Resource route: /api/logs/stream
//
// GET — Server-Sent Events stream.
//       Proxies the Railway bridge SSE endpoint so Vercel serverless never
//       holds a direct MQTT connection (which leaks clients on EMQX).
//
// Event types forwarded from bridge:
//   ping   — keepalive, payload { ts }
//   status — MQTT connection state, payload { connected, error? }
//   log    — parsed log line, payload { raw, level, source, message, ts, channel }
//            channel: 'logs' | 'debug'

export async function loader({ request }) {
  try {
    const { requireAdmin } = await import('~/lib/auth.server');
    await requireAdmin(request);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { BRIDGE_URL } = process.env;
  if (!BRIDGE_URL) {
    return new Response('BRIDGE_URL not configured', { status: 503 });
  }

  const { signal } = request;

  let bridgeRes;
  try {
    bridgeRes = await fetch(`${BRIDGE_URL}/logs/stream`, { signal });
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
