/**
 * Dashboard Index Page (Home)
 *
 * Layout (top → bottom):
 *  1. Pipeline status strip  — hardware online, first-flush state, filter mode, backwash
 *  2. Container pipeline row — C2 / C5 / C6 side-by-side (level + pH/turbidity/temp chips)
 *  3. Water quality hero     — overall status based on C6 (the only output that matters)
 *  4. Trend chart            — pH across C2, C5, C6 (shows filtration working)
 *  5. Weather + Activity     — side-by-side on desktop, stacked on mobile
 */

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';

// Components
import { PipelineStatus }    from '~/components/dashboard/pipeline-status';
import { ContainerPanel }    from '~/components/dashboard/container-panel';
import { WaterQualityStatus } from '~/components/dashboard/water-quality-status';
import { ContainerLineChart } from '~/components/dashboard/chart-wrapper';
import { ActivityLog }       from '~/components/dashboard/activity-log';
import { WeatherWidget }     from '~/components/dashboard/weather-widget';
import { useActivityStream } from '~/lib/activity-stream';

// Data and utilities
import { getDb }                  from '~/lib/db.server';
import { getWeather }             from '~/lib/weather.server';
import { calculateWaterQuality }  from '~/lib/water-quality';
import { formatRelativeTime }     from '~/lib/date-utils';

export const meta = () => [
  { title: 'Dashboard | RainWater Monitoring System' },
  { name: 'description', content: 'Monitor your smart rainwater harvesting system in real-time' },
];

// ── Loader ────────────────────────────────────────────────────────────────
export const loader = async () => {
  const db    = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [latestDoc, historyDocs, logDocs, heartbeatDoc, weather] = await Promise.all([
    db.collection('sensor_readings').findOne({}, { sort: { timestamp: -1 } }),

    db.collection('sensor_readings')
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray(),

    db.collection('activity_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(30)
      .toArray(),

    db.collection('device_heartbeats').findOne({ source: 'esp32' }),

    getWeather(),
  ]);

  // ── Per-container sensor snapshot ───────────────────────────────────────
  // Level values from Mega are already calibrated percentages stored as 0–100.
  // If calibration hasn't been done yet they come back as raw cm; the panel
  // renders them as "—" when null, so no harm done.
  const containers = {
    C2: {
      levelPct:    latestDoc?.lvl_c2    ?? null,
      ph:          latestDoc?.ph_c2     ?? null,
      turbidity:   latestDoc?.turb_c2   ?? null,
      temperature: latestDoc?.temp_c2   ?? null,
    },
    C5: {
      levelPct:    latestDoc?.lvl_c5    ?? null,
      ph:          latestDoc?.ph_c5     ?? null,
      turbidity:   latestDoc?.turb_c5   ?? null,
      temperature: latestDoc?.temp_c5   ?? null,
    },
    C6: {
      levelPct:    latestDoc?.lvl_c6    ?? null,
      ph:          latestDoc?.ph_c6     ?? null,
      turbidity:   latestDoc?.turb_c6   ?? null,
      temperature: latestDoc?.temp_c6   ?? null,
    },
  };

  // ── Water quality — evaluated against C6 (final potable output) ─────────
  const waterQuality = calculateWaterQuality({
    ph:          containers.C6.ph,
    turbidity:   containers.C6.turbidity,
    temperature: containers.C6.temperature,
  });

  // ── Historical data for trend chart (all three containers) ───────────────
  const historical = historyDocs.map((doc) => ({
    timestamp: doc.timestamp,
    ph_c2:     doc.ph_c2     ?? null,
    ph_c5:     doc.ph_c5     ?? null,
    ph_c6:     doc.ph_c6     ?? null,
    turb_c2:   doc.turb_c2   ?? null,
    turb_c5:   doc.turb_c5   ?? null,
    turb_c6:   doc.turb_c6   ?? null,
    temp_c2:   doc.temp_c2   ?? null,
    temp_c5:   doc.temp_c5   ?? null,
    temp_c6:   doc.temp_c6   ?? null,
  }));

  // ── Pipeline state ───────────────────────────────────────────────────────
  const pipeline = {
    ffState:       latestDoc?.ff_state       ?? 0,
    filterMode:    latestDoc?.filter_mode    ?? 0,
    backwashState: latestDoc?.backwash_state ?? 0,
  };

  return json({
    containers,
    waterQuality,
    hasData:      !!latestDoc,
    lastUpdated:  latestDoc?.timestamp ?? null,
    pipeline,
    lastHeartbeat: heartbeatDoc?.lastSeen ?? null,
    historical,
    logs: logDocs.map((e) => ({
      id:        e._id.toString(),
      source:    e.source,
      level:     e.level,
      message:   e.message,
      type:      e.type ?? (e.level === 'WARN' ? 'warning' : e.level === 'ERR' ? 'error' : e.level === 'OK' ? 'success' : 'info'),
      category:  e.category ?? e.source,
      timestamp: e.timestamp,
    })),
    weather,
  });
};

// ── Page Component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const {
    containers,
    waterQuality,
    lastUpdated,
    pipeline,
    lastHeartbeat,
    historical,
    logs: initialLogs,
    weather,
  } = useLoaderData();

  const [logs, setLogs] = useState(initialLogs);
  const { liveStatus, subscribe } = useActivityStream();

  useEffect(() => {
    return subscribe((entry) => {
      setLogs((prev) => {
        if (prev.some((l) => l.id === entry.id)) return prev;
        const next = [entry, ...prev];
        return next.length > 50 ? next.slice(0, 50) : next;
      });
    });
  }, [subscribe]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Rainwater harvesting pipeline — live overview
        </p>
      </div>

      {/* 1. Pipeline status strip */}
      <PipelineStatus
        ffState={pipeline.ffState}
        filterMode={pipeline.filterMode}
        backwashState={pipeline.backwashState}
        lastHeartbeat={lastHeartbeat}
      />

      {/* 2. Container pipeline row: C2 → C5 → C6 */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
          Filtration Pipeline
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <ContainerPanel
            container="C2"
            levelPct={containers.C2.levelPct}
            ph={containers.C2.ph}
            turbidity={containers.C2.turbidity}
            temperature={containers.C2.temperature}
          />
          <ContainerPanel
            container="C5"
            levelPct={containers.C5.levelPct}
            ph={containers.C5.ph}
            turbidity={containers.C5.turbidity}
            temperature={containers.C5.temperature}
          />
          <ContainerPanel
            container="C6"
            levelPct={containers.C6.levelPct}
            ph={containers.C6.ph}
            turbidity={containers.C6.turbidity}
            temperature={containers.C6.temperature}
          />
        </div>
      </section>

      {/* 3. Water quality hero — based on C6 (final potable output) */}
      <WaterQualityStatus
        status={waterQuality.overall}
        lastChecked={lastUpdated ? formatRelativeTime(lastUpdated) : null}
      />

      {/* 4. Trend chart — pH across all three containers */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
          Trends — Last 24 Hours
        </h2>
        <ContainerLineChart
          title="pH — C2 vs C5 vs C6"
          data={historical}
          metric="ph"
          unit="pH"
          height={240}
          className="sm:h-[280px] lg:h-[300px]"
        />
      </section>

      {/* 5. Weather + Activity */}
      <div className="grid gap-5 lg:grid-cols-2 min-w-0 overflow-hidden lg:items-stretch">
        <section className="flex flex-col space-y-3 min-w-0">
          <h2 className="text-lg font-semibold">Weather</h2>
          <WeatherWidget weather={weather} className="flex-1" />
        </section>

        <section className="flex flex-col space-y-3 min-w-0">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ActivityLog logs={logs} liveStatus={liveStatus} className="flex-1 lg:min-h-0" />
        </section>
      </div>
    </div>
  );
}
