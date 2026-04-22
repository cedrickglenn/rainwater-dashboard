# RainSense Dashboard

A full-stack monitoring and control dashboard for a smart rainwater harvesting and filtration system. Built as a capstone/thesis project, it provides real-time visibility into water quality across a three-stage filtration pipeline and remote control of pumps, valves, and UV sterilization equipment.

## System Overview

Water flows through three containers in sequence:

```
C2 (Raw Collection) → C5 (Filtration) → C6 (UV Sterilization / Potable Output)
```

Each container is instrumented with level, pH, turbidity, temperature, and TDS sensors. The dashboard aggregates this data, evaluates potability against WHO/EPA thresholds, and allows operators to issue commands to the physical hardware in real time.

The hardware layer consists of an **Arduino Mega** (sensor reading, actuator control, EEPROM calibration) connected via serial to an **ESP32** (WiFi/MQTT bridge to the cloud). Sibling firmware repositories are documented in [CLAUDE.md](CLAUDE.md).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Remix v2.15 (React + Node.js SSR) |
| Frontend | React 18, Tailwind CSS, Radix UI / shadcn components |
| Database | MongoDB Atlas |
| Real-time comms | MQTT via EMQX Cloud |
| Charts | Recharts |
| Auth | bcryptjs + HTTP-only cookie sessions |
| Push notifications | Web Push API (VAPID) |

## Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster
- An EMQX Cloud (or compatible) MQTT broker
- VAPID keys for push notifications (see below)

## Getting Started

**1. Clone and install dependencies:**

```bash
git clone <repo-url>
cd rainwater-dashboard
npm install
```

**2. Configure environment variables:**

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
DB_NAME=rainwateriot

MQTT_HOST=<broker>.emqx.cloud
MQTT_USERNAME=<username>
MQTT_PASSWORD=<password>

SESSION_SECRET=<long-random-string>

VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_SUBJECT=https://<your-domain>
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

**3. Seed the admin user:**

```bash
npm run seed
```

**4. Start the development server:**

```bash
# Terminal 1 — Remix dev server with HMR
npm run dev

# Terminal 2 — MQTT bridge (writes ACKs and logs to MongoDB)
npm run bridge
```

The dashboard is available at `http://localhost:5173`.

## Available Commands

```bash
npm run dev        # Dev server with HMR
npm run build      # Production build
npm start          # Run production build
npm run bridge     # Persistent MQTT → MongoDB bridge
npm run seed       # Seed admin user to MongoDB
npm run lint       # ESLint
npm run lint:fix   # ESLint with auto-fix
npm run typecheck  # TypeScript check
```

## Architecture

### Data Flow

**Sensor ingestion:** The ESP32 POSTs JSON sensor payloads to `POST /api/sensors`. Data is stored in the `sensor_readings` MongoDB collection and served to the dashboard via Remix loaders.

**Device commands:** The UI submits forms to `POST /api/commands`, which publishes MQTT messages to `rainwater/commands`. The Mega applies the command and publishes an acknowledgement to `rainwater/acks`.

**MQTT bridge:** `npm run bridge` (`scripts/mqtt-bridge.js`) maintains a persistent MQTT subscription and writes ACKs, device logs, and heartbeats to MongoDB. The Remix HTTP server does not hold a persistent MQTT connection.

**Calibration:** Pending calibration commands are stored in the `calibration_commands` MongoDB collection. The dashboard polls `GET /api/calibration.pending`; the device ACKs via `rainwater/calibration/acks`.

### Key MQTT Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `rainwater/commands` | Dashboard → Device | Command batch |
| `rainwater/acks` | Device → Bridge | Command acknowledgement |
| `rainwater/calibration/acks` | Device → Bridge | Calibration acknowledgement |
| `rainwater/logs` | Device → Bridge | Device system logs |
| `rainwater/sensors` | Device → Bridge | Sensor data push |
| `rainwater/heartbeat` | Device → Bridge | Periodic heartbeat |

### Route Structure

| File | Purpose |
|------|---------|
| `app/routes/_index.jsx` | Dashboard home |
| `app/routes/sensors.jsx` | Per-container sensor detail and history charts |
| `app/routes/settings.jsx` | Actuators, calibration, first flush, user management, notifications |
| `app/routes/history.jsx` | Historical data browser |
| `app/routes/login.jsx` | Authentication |
| `app/routes/api.*.jsx` | API endpoints |

### Auth Roles

`admin` > `operator` > `viewer`. Route guards (`requireAdmin`, `requireOperator`, `requireViewer`) in `app/lib/auth.server.js` redirect unauthenticated requests to `/login`.

## Potability Thresholds (C6 output only)

| Sensor | Safe Range |
|--------|-----------|
| pH | 6.5 – 8.5 |
| Turbidity | < 5 NTU |
| TDS | < 500 mg/L |
| Temperature | 15 – 25 °C |

## Simulating Sensor Data

Without hardware, POST sensor readings directly:

```bash
curl -X POST http://localhost:5173/api/sensors \
  -H "Content-Type: application/json" \
  -d '{"ph_c6": 7.2, "turb_c6": 1.4, "tds_c6": 210, "temp_c6": 22, "lvl_c2": 75}'
```

## Design System

The UI follows the **Deep Water** design system — a monochromatic teal palette where color carries meaning (safe/warning/unsafe), not decoration. Typography uses DM Sans (UI) and DM Mono (numeric readouts). Full design guidelines are in [CLAUDE.md](CLAUDE.md).
