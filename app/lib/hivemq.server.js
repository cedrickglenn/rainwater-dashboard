/**
 * HiveMQ Cloud MQTT publish helper
 *
 * Opens one connection per call, publishes all messages, then disconnects.
 * Works in Vercel serverless functions — no persistent connection needed.
 *
 * Required env vars:
 *   HIVEMQ_HOST      — e.g. abc123.s1.eu.hivemq.cloud  (no protocol, no port)
 *   HIVEMQ_USERNAME  — MQTT credential username
 *   HIVEMQ_PASSWORD  — MQTT credential password
 */

import mqtt from 'mqtt';

/**
 * Publish one or more messages to the broker using a single connection.
 * @param {string} topic
 * @param {string | string[]} messages  — one string or an array of strings
 */
export function mqttPublish(topic, messages) {
  const list = Array.isArray(messages) ? messages : [messages];

  return new Promise((resolve, reject) => {
    const { HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD } = process.env;

    if (!HIVEMQ_HOST || !HIVEMQ_USERNAME || !HIVEMQ_PASSWORD) {
      console.warn('[hivemq] Missing env vars — commands not published');
      return resolve();
    }

    const client = mqtt.connect(`mqtts://${HIVEMQ_HOST}:8883`, {
      username: HIVEMQ_USERNAME,
      password: HIVEMQ_PASSWORD,
      clientId: `rainwater_dash_${Math.random().toString(16).slice(2, 10)}`,
      connectTimeout: 8000,
      reconnectPeriod: 0,
    });

    client.once('connect', () => {
      // Publish all messages sequentially, then disconnect
      let i = 0;
      const publishNext = () => {
        if (i >= list.length) {
          client.end();
          return resolve();
        }
        const msg = list[i++];
        client.publish(topic, msg, { qos: 1 }, (err) => {
          if (err) {
            console.error('[hivemq] Publish error:', err.message);
            client.end(true);
            return reject(err);
          }
          publishNext();
        });
      };
      publishNext();
    });

    client.once('error', (err) => {
      console.error('[hivemq] Connection error:', err.message);
      client.end(true);
      reject(err);
    });
  });
}
