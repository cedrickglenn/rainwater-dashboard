// Resource route: /api/logs/stream
//
// GET — Server-Sent Events stream.
//       Subscribes to the HiveMQ rainwater/logs topic using the
//       read-only subscriber credential and forwards each message
//       to the browser. Credentials never leave the server.
//
// Event types:
//   ping   — keepalive, payload { ts }
//   status — MQTT connection state, payload { connected, error? }
//   log    — parsed log line, payload { raw, level, source, message, ts }

import mqtt from 'mqtt';

// Frame formats in use:
//   Format A (Mega):  L,<SOURCE>,<LEVEL>,<MESSAGE>
//   Format B (ESP32): L,<LEVEL>,<CATEGORY>,<MESSAGE>
// Detected by checking whether parts[1] is a known level token.
const LEVEL_TOKENS = new Set(['INFO', 'WARN', 'ERR', 'OK']);

function parseLogLine(raw) {
  const s = raw.trim();
  if (s.startsWith('L,')) {
    const parts = s.split(',');
    if (parts.length >= 4) {
      let level, source, message;
      if (LEVEL_TOKENS.has(parts[1])) {
        // Format B: L,LEVEL,CATEGORY,MESSAGE
        level   = parts[1];
        source  = parts[2];
        message = parts.slice(3).join(',');
      } else {
        // Format A: L,SOURCE,LEVEL,MESSAGE
        source  = parts[1];
        level   = parts[2];
        message = parts.slice(3).join(',');
      }
      return { raw: s, level, source, message };
    }
  }
  // Unstructured line (raw debug output)
  return { raw: s, level: 'INFO', source: null, message: s };
}

export async function loader({ request }) {
  // Auth guard — requireAdmin throws a redirect, so we catch it here
  // because EventSource can't follow a redirect.
  try {
    const { requireAdmin } = await import('~/lib/auth.server');
    await requireAdmin(request);
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const { HIVEMQ_HOST, HIVEMQ_SUB_USERNAME, HIVEMQ_SUB_PASSWORD } = process.env;
  if (!HIVEMQ_HOST || !HIVEMQ_SUB_USERNAME || !HIVEMQ_SUB_PASSWORD) {
    return new Response('MQTT subscriber credentials not configured', { status: 503 });
  }

  const { signal } = request;
  const encoder   = new TextEncoder();
  let   client    = null;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (eventType, data) => {
        try {
          const chunk = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Client already disconnected
        }
      };

      // Initial ping so EventSource knows the stream is alive
      enqueue('ping', { ts: Date.now() });

      client = mqtt.connect(`mqtts://${HIVEMQ_HOST}:8883`, {
        username:        HIVEMQ_SUB_USERNAME,
        password:        HIVEMQ_SUB_PASSWORD,
        clientId:        `rw_log_stream_${Math.random().toString(16).slice(2, 10)}`,
        connectTimeout:  8000,
        reconnectPeriod: 3000,
        clean:           true,
      });

      client.on('connect', () => {
        enqueue('status', { connected: true });
        client.subscribe('rainwater/logs', { qos: 0 });
      });

      client.on('message', (_topic, payload) => {
        const raw   = payload.toString();
        const entry = parseLogLine(raw);
        enqueue('log', { ...entry, ts: Date.now() });
      });

      client.on('error', (err) => {
        enqueue('status', { connected: false, error: err.message });
      });

      client.on('offline', () => {
        enqueue('status', { connected: false });
      });

      client.on('reconnect', () => {
        enqueue('status', { connected: false, reconnecting: true });
      });

      // Clean up when the browser disconnects
      signal.addEventListener('abort', () => {
        if (client) { client.end(true); client = null; }
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      if (client) { client.end(true); client = null; }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
