/**
 * HiveMQ Cloud REST publish helper
 *
 * Uses HiveMQ's HTTP API to publish a single message to a topic.
 * This works from Vercel serverless functions — no persistent connection needed.
 *
 * Required env vars:
 *   HIVEMQ_HOST      — e.g. abc123.s1.eu.hivemq.cloud  (no protocol, no port)
 *   HIVEMQ_USERNAME  — MQTT credential username
 *   HIVEMQ_PASSWORD  — MQTT credential password
 *
 * HiveMQ REST API docs:
 *   POST https://{host}:8083/api/v1/mqtt/publish
 *   Payload field must be base64-encoded.
 */

export async function mqttPublish(topic, message) {
  const { HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD } = process.env;

  if (!HIVEMQ_HOST || !HIVEMQ_USERNAME || !HIVEMQ_PASSWORD) {
    console.warn('[hivemq] Missing env vars — command not published to MQTT');
    return;
  }

  const url = `https://${HIVEMQ_HOST}:8083/api/v1/mqtt/publish`;
  const credentials = Buffer.from(`${HIVEMQ_USERNAME}:${HIVEMQ_PASSWORD}`).toString('base64');
  const payload = Buffer.from(message).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
    },
    body: JSON.stringify({
      topic,
      payload,
      qos: 1,
      retain: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[hivemq] Publish failed (${res.status}): ${text}`);
  }
}
