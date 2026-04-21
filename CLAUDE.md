# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Related Firmware Projects

When investigating sensor behaviour, calibration, MQTT/serial protocol, or timing issues, also check these sibling projects (located alongside this repo):

| Project | Path | Role |
|---------|------|------|
| Arduino Mega firmware | `../rainwaterIOT/RainwaterIOT/` | Sensor reading, actuator control, calibration, EEPROM, serial protocol |
| ESP32 bridge firmware | `../RainwaterIOT-ESP32/` | WiFi/MQTT bridge between Mega and HiveMQ cloud |

Key files to reach for:
- `rainwaterIOT/RainwaterIOT/src/sensors.cpp` — ultrasonic & sensor reading
- `rainwaterIOT/RainwaterIOT/src/comms.cpp` — serial protocol, calibration command handlers
- `rainwaterIOT/RainwaterIOT/src/calibration.cpp` — EEPROM storage, cal apply functions
- `rainwaterIOT/RainwaterIOT/include/config.h` — timing constants
- `RainwaterIOT-ESP32/src/main.cpp` — MQTT callback, ACK drain window, command queue

## Project Overview

Rainwater Dashboard is a smart rainwater harvesting and filtration system monitoring application. It uses Remix (full-stack React framework) with MongoDB for storage and MQTT for real-time IoT device communication. The system monitors water quality sensors across three containers (C2, C5, C6) and controls filtration/sterilization equipment.

## Tech Stack

- **Framework**: Remix v2.15 (React + Node.js SSR)
- **Frontend**: React 18, Tailwind CSS, Radix UI / shadcn components
- **Database**: MongoDB Atlas (`MONGODB_URI` env var required)
- **Real-time**: MQTT via HiveMQ Cloud (commands to device, ACKs from device)
- **Auth**: bcryptjs + HTTP-only cookie sessions (7-day expiry)
- **Charts**: Recharts
- **Push Notifications**: Web Push API with VAPID keys

## Commands

```bash
npm run dev        # Dev server with HMR on localhost:5173
npm run build      # Production build (build/server + build/client)
npm start          # Run production build

npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run typecheck  # TypeScript check

npm run bridge     # MQTT→MongoDB bridge (persistent; run alongside dev server)
npm run seed       # Seed admin user to MongoDB
```

## Environment Variables

```
MONGODB_URI=mongodb+srv://...
DB_NAME=rainwateriot

HIVEMQ_HOST=...s1.eu.hivemq.cloud      # No protocol/port prefix
HIVEMQ_USERNAME=rainwaterIOT-DEV
HIVEMQ_PASSWORD=...
HIVEMQ_SUB_USERNAME=dashboard_subscriber
HIVEMQ_SUB_PASSWORD=...

SESSION_SECRET=<random-string>

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://...
```

Generate VAPID keys: `npx web-push generate-vapid-keys`

## Architecture

### Container Pipeline

Water flows C2 → C5 → C6:
- **C2**: Raw rainwater collection tank
- **C5**: Mechanical + carbon filtration tank
- **C6**: UV sterilization tank (final potable output)

Each container has: level sensor, pH, turbidity, temperature, and TDS sensors.

### Data Flow

**Sensor ingestion**: ESP32/Mega POSTs JSON to `POST /api/sensors` → stored in `sensor_readings` MongoDB collection → loaders fetch for dashboard/charts.

**Device commands**: UI form → `POST /api/commands` → MQTT publish to `rainwater/commands` → device applies state → device publishes ACK to `rainwater/acks`.

**ACK/log persistence**: `npm run bridge` (scripts/mqtt-bridge.js) maintains a persistent MQTT subscription and writes to `activity_logs` and `device_heartbeats` collections. The dashboard HTTP server itself does NOT hold a persistent MQTT connection.

**Calibration**: Pending commands stored in `calibration_commands` collection. Dashboard polls `GET /api/calibration.pending`. Device ACKs via `rainwater/calibration/acks`.

### Route Structure

Remix file-based routing in `app/routes/`. Key routes:

| File | Purpose |
|------|---------|
| `_index.jsx` | Dashboard home — aggregates sensors, weather, activity |
| `sensors.jsx` | Per-container sensor detail + historical charts |
| `actuators.jsx` | Pump, filter, UV lamp toggles |
| `calibration.jsx` | Level sensor calibration UI |
| `login.jsx` | Auth page |
| `api.*.jsx` | API endpoints (sensor ingest, commands, ACK polling) |

### Key Libraries (`app/lib/`)

- `db.server.js` — MongoDB client (global cache, safe for Vercel/serverless)
- `auth.server.js` — `requireAdmin()`, `requireOperator()`, `requireViewer()` guards
- `session.server.js` — Cookie session storage config
- `hivemq.server.js` — One-shot MQTT publish helper
- `weather.server.js` — Open-Meteo API (Davao City, 15-min in-memory cache, no API key needed)
- `water-quality.js` — Potability thresholds and `calculateWaterQuality()` returning `SAFE | WARNING | UNSAFE | UNKNOWN`

### Potability Thresholds (WHO/EPA, applied to C6 only)

| Sensor | Safe Range |
|--------|-----------|
| pH | 6.5 – 8.5 |
| Turbidity | < 5 NTU |
| TDS | < 500 mg/L |
| Temperature | 15 – 25 °C |

### Auth Roles

`admin` (3) > `operator` (2) > `viewer` (1). Guards throw redirect to `/login` if unauthorized.

### MQTT Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `rainwater/commands` | Dashboard → Device | Command batch (e.g. `C,PUMP,PUMP_ON,ON`) |
| `rainwater/acks` | Device → Bridge | Command acknowledgement |
| `rainwater/calibration/acks` | Device → Bridge | Calibration acknowledgement |
| `rainwater/logs` | Device → Bridge | Device system logs (`L,<LEVEL>,<CATEGORY>,<MESSAGE>`) |
| `rainwater/sensors` | Device → Bridge | Alternative sensor push (vs HTTP POST) |
| `rainwater/heartbeat` | Device → Bridge | Periodic heartbeat |

## Common Patterns

**Loader (server-side fetch):**
```js
export const loader = async ({ request }) => {
  const user = await requireOperator(request);
  const db = await getDb();
  const data = await db.collection('sensor_readings').findOne(...);
  return json({ user, data });
};
```

**Action (form submission):**
```js
export const action = async ({ request }) => {
  const formData = await request.formData();
  // process...
  return json({ ok: true });
};
```

**Publishing a command:**
```js
import { mqttPublish } from '~/lib/hivemq.server';
await mqttPublish('rainwater/commands', 'C,PUMP,PUMP_ON,ON');
```

## Local Development

1. Copy `.env` with valid MongoDB + HiveMQ credentials
2. `npm install`
3. `npm run dev` — dashboard on localhost:5173
4. In a second terminal: `npm run bridge` — connects MQTT and writes ACKs/logs to MongoDB

To simulate sensor data without hardware: `POST localhost:5173/api/sensors` with a JSON body containing fields like `ph_c6`, `turb_c6`, `lvl_c2`, etc.
