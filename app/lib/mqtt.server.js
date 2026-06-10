/**
 * MQTT publish helper
 *
 * Opens one connection per call, publishes all messages, then disconnects.
 * Works in Vercel serverless functions — no persistent connection needed.
 *
 * Required env vars:
 *   MQTT_HOST      — broker hostname (no protocol, no port)
 *   MQTT_USERNAME  — MQTT credential username
 *   MQTT_PASSWORD  — MQTT credential password
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
    const { MQTT_HOST, MQTT_USERNAME, MQTT_PASSWORD } = process.env;

    if (!MQTT_HOST || !MQTT_USERNAME || !MQTT_PASSWORD) {
      console.warn('[mqtt] Missing env vars — commands not published');
      return resolve();
    }

    const client = mqtt.connect(`mqtts://${MQTT_HOST}:8883`, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: `rainwater_dash_${Math.random().toString(16).slice(2, 10)}`,
      connectTimeout: 8000,
      reconnectPeriod: 0,
    });

    client.once('connect', () => {
      let i = 0;
      const publishNext = () => {
        if (i >= list.length) {
          client.end();
          return resolve();
        }
        const msg = list[i++];
        client.publish(topic, msg, { qos: 1 }, (err) => {
          if (err) {
            console.error('[mqtt] Publish error:', err.message);
            client.end(true);
            return reject(err);
          }
          publishNext();
        });
      };
      publishNext();
    });

    client.once('error', (err) => {
      console.error('[mqtt] Connection error:', err.message);
      client.end(true);
      reject(err);
    });
  });
}
