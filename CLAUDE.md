# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Getting Started

DO NOT begin a new chat by doing an extensive exploration of the entire codebase. Instead, read the README and use an Explore agent to read the documentation if you want to get the lay of the land. Of course, once you have a specific need, you can explore as much of the code as you require.

## Related Firmware Projects

When investigating sensor behaviour, calibration, MQTT/serial protocol, or timing issues, also check these sibling projects (located alongside this repo):

| Project | Path | Role |
|---------|------|------|
| Arduino Mega firmware | `../rainwaterIOT/RainwaterIOT/` | Sensor reading, actuator control, calibration, EEPROM, serial protocol |
| ESP32 bridge firmware | `../RainwaterIOT-ESP32/` | WiFi/MQTT bridge between Mega and EMQX cloud |

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
- **Real-time**: MQTT via EMQX Cloud (commands to device, ACKs from device)
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

MQTT_HOST=...emqx.cloud      # No protocol/port prefix — used by bridge as MQTT_HOST
MQTT_USERNAME=...
MQTT_PASSWORD=...

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

---

## Design System — "Deep Water"

All UI work must follow this design system. Do not deviate without explicit instruction.

### Philosophy

Monochromatic teal-based palette. Hierarchy comes from spacing and weight, not color variety. Color is reserved for meaning (status), not decoration. Smart and minimal — works first on mobile, scales cleanly to desktop.

### App Name

**RainSense** — used in sidebar, topbar, page titles, footer, PWA manifest, and login page.

### Typography

- **UI font**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) — replaces Inter. Geometric, clean, excellent on mobile at small sizes.
- **Monospace / numbers**: [DM Mono](https://fonts.google.com/specimen/DM+Mono) — replaces JetBrains Mono. Used for all sensor values, numeric readouts, timestamps.
- Both loaded from Google Fonts. They share a design family — do not mix in other fonts.

### Color Palette

**CSS variable names follow shadcn/ui convention (HSL values in `tailwind.css`).**

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#F4F7F9` | `#0C1A24` | Page background |
| `--card` | `#FFFFFF` | `#132130` | Card surfaces |
| `--card-elevated` | `#EEF3F7` | `#1A2E3F` | Nested panels, inputs |
| `--border` | `#DDE4EB` | `#253D52` | All borders |
| `--primary` | `#1A6B8A` | `#38B2D4` | Brand color, interactive elements |
| `--primary-light` | `#E8F4F9` | `#0F2A38` | Active/hover tinted backgrounds |
| `--foreground` | `#0F1F2B` | `#E8F3F8` | Primary text |
| `--muted-foreground` | `#5E7A8A` | `#6E96AA` | Labels, captions, secondary text |

**Status / water quality colors** (same in both modes, kept consistent):

| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| Safe | Teal-green | `#16A876` | SAFE water quality, online indicators |
| Warning | Amber | `#D97706` | WARNING quality, caution states |
| Unsafe / Error | Rose | `#DC2645` | UNSAFE quality, errors, destructive actions |
| Unknown | Muted grey | use `--muted-foreground` | No data / sensor offline |

### Border Radius

`--radius: 0.75rem` (12px) base. Cards, buttons, inputs all use this or derived values (`calc(var(--radius) - 2px)` for inner elements). Do not use fully rounded (`rounded-full`) for content containers — only for badges, avatars, and status dots.

### Sensor Card Coloring

**Do not assign per-sensor-type colors** (no purple-for-pH, amber-for-turbidity, etc.).

Sensor cards use a neutral tinted background by default. The **only** color on a sensor reading is its **status color** (safe/warning/unsafe). This makes status immediately legible and prevents the UI from looking like a color sampler.

Example: a pH card showing 7.2 (safe) gets a subtle `#16A876` tint. The same card showing pH 9.1 (unsafe) gets a `#DC2645` tint. The icon and label identify the sensor type — color communicates health.

### Navigation Structure

Sidebar nav items (in order):
1. **Dashboard** — `/` — all roles
2. **Sensors** — `/sensors` — all roles
3. **History** — `/history` — all roles
4. **Settings** — `/settings` — admin only

Actuators and Calibration are **tabs within Settings**, not top-level nav items. Routes `/actuators` and `/calibration` redirect to `/settings?tab=actuators` and `/settings?tab=calibration`.

### Settings Tabs (in order)

Only include tabs that have real backend persistence or hardware integration:
1. **Actuators** — pump/valve control (operator+)
2. **Calibration** — sensor calibration (admin)
3. **First Flush** — flow threshold + duration, sends MQTT to Mega (admin)
4. **Users** — user management + password change (admin)
5. **Notifications** — push notifications only (admin); email/SMS are not implemented and must not appear

Tabs with no real persistence (Display preferences, Sensor offsets, Data logging) are **removed**. Theme toggle lives in the topbar only.

### Logo & Icons

**Concept:** A teardrop shape with a flat ECG-style pulse line across the lower interior. The drop = rain/water. The pulse = sensing/measurement. Together they read as "water being monitored."

**Rules:**
- Flat, no gradient, no highlight blob, no drop shadow
- Single color: `#1A6B8A` on light backgrounds, `#38B2D4` on dark, white when on a colored background
- The pulse line is rendered as a `stroke` path (not filled), white or `currentColor`
- The teardrop is geometric and symmetrical — not the freehand blob in the old icon

**Files:**
- `public/favicon.svg` — 32×32 or 100×100 viewBox, no background, transparent, single teal color
- `public/icons/icon.svg` — 512×512, rounded-square teal background (`#1A6B8A`), white mark centered (for PWA home screen)
- Sidebar badge: inline `<svg>` of the mark (not Lucide `<Droplets>`), `fill="currentColor"`, inside the existing `bg-primary rounded-xl` badge

**Do not** use the Lucide `<Droplets>` icon as the app logo anywhere. It's a generic multi-droplet icon with no connection to the RainSense mark.

### Homepage Philosophy

The homepage answers one question: **is the system working right now?**

Layout order reflects operational priority:
1. Pipeline status strip — hardware online, first-flush state, filter mode
2. Mode-aware pipeline diagram — shows the *active* flow path, not all containers equally
3. Before/after trend charts — pH and turbidity: C2 (raw) vs C6 (output), 24h
4. Compact weather strip — single row, not a card
5. Activity log — full width, operationally the most relevant content

**Mode-aware pipeline rule:** The diagram always shows all containers (C2, C5, C6), but reflects the active `filter_mode`:
- `Charcoal only (1)`: C2 → C6 active (teal), C5 dimmed with "Bypassed" label
- `Charcoal + RO (2)`: C2 → C5 → C6 all active
- `Off (0)`: all dimmed

**C6 is the output node** and should be visually distinct — it carries the overall potability status. The standalone "Water Quality Hero" card is gone; that status lives inside the C6 node itself.

**Charts on the homepage are focused on filtration effectiveness** — C2 vs C6 comparison for pH and turbidity only. Full per-container, multi-metric charts live on the Sensors page.

### What Not to Do

- Do not use `sky-*`, `blue-*`, or default shadcn primary colors anywhere
- Do not use four different colors to distinguish sensor types
- Do not add gradient text (`bg-clip-text`) to headings
- Do not use card hover lift effects (`hover:-translate-y-1`) on data cards — these are dashboards, not marketing pages
- Do not use glass morphism (`backdrop-blur` + transparency) on primary content surfaces — only on the sticky topbar
- Do not add decorative elements (wave SVGs, water drop illustrations, etc.) — the data is the design
