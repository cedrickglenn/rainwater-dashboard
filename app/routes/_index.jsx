/**
 * Dashboard Index Page (Home) — "Is the system working right now?"
 *
 * Layout (top → bottom):
 *   1. Pipeline status strip         — hardware online, FF state, filter mode, backwash
 *   2. Mode-aware pipeline diagram   — C2 → [C5] → C6, reflects active filter mode
 *   3. Before/after trend charts     — pH (C2 vs C6) + Turbidity (C2 vs C6), 24h
 *   4. Compact weather strip         — one-row weather, not a card
 *   5. Activity log                  — full width
 */

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState, useEffect } from 'react';

import { PipelineStatus }     from '~/components/dashboard/pipeline-status';
import { PipelineDiagram }    from '~/components/dashboard/pipeline-diagram';
import { ContainerLineChart } from '~/components/dashboard/chart-wrapper';
import { ActivityLog }        from '~/components/dashboard/activity-log';
import { WeatherStrip }       from '~/components/dashboard/weather-strip';
import { useActivityStream }  from '~/lib/activity-stream';

import { getDb }      from '~/lib/db.server';
import { getWeather } from '~/lib/weather.server';

export const meta = () => [
  { title: 'Dashboard | RainSense' },
  { name: 'description', content: 'Monitor your smart rainwater harvesting system in real-time' },
];

export const loader = async () => {
  const db    = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [latestDoc, historyDocs, logDocs, heartbeatDoc, weather] = await Promise.all([
    db.collection('sensor_readings').find({}).sort({ timestamp: -1 }).limit(1).next(),

    db.collection('sensor_readings').aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            $subtract: [
              { $toLong: '$timestamp' },
              { $mod: [{ $toLong: '$timestamp' }, 5 * 60 * 1000] },
            ],
          },
          timestamp: { $last: '$timestamp' },
          ph_c2:   { $last: '$ph_c2' },
          ph_c6:   { $last: '$ph_c6' },
          turb_c2: { $last: '$turb_c2' },
          turb_c6: { $last: '$turb_c6' },
        },
      },
      { $sort: { timestamp: 1 } },
    ]).toArray(),

    db.collection('activity_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(30)
      .toArray(),

    db.collection('device_heartbeats').findOne({ source: 'esp32' }),

    getWeather(),
  ]);

  const containers = {
    C2: {
      levelPct:    latestDoc?.lvl_c2  ?? null,
      ph:          latestDoc?.ph_c2   ?? null,
      turbidity:   latestDoc?.turb_c2 ?? null,
      temperature: latestDoc?.temp_c2 ?? null,
    },
    C5: {
      levelPct:    latestDoc?.lvl_c5  ?? null,
      ph:          latestDoc?.ph_c5   ?? null,
      turbidity:   latestDoc?.turb_c5 ?? null,
      temperature: latestDoc?.temp_c5 ?? null,
    },
    C6: {
      levelPct:    latestDoc?.lvl_c6  ?? null,
      ph:          latestDoc?.ph_c6   ?? null,
      turbidity:   latestDoc?.turb_c6 ?? null,
      temperature: latestDoc?.temp_c6 ?? null,
    },
  };

  const historical = historyDocs.map((doc) => ({
    timestamp: doc.timestamp,
    ph_c2:   doc.ph_c2   ?? null,
    ph_c6:   doc.ph_c6   ?? null,
    turb_c2: doc.turb_c2 ?? null,
    turb_c6: doc.turb_c6 ?? null,
  }));

  const pipeline = {
    ffState:       latestDoc?.ff_state       ?? 0,
    filterMode:    latestDoc?.filter_mode    ?? 0,
    backwashState: latestDoc?.backwash_state ?? 0,
  };

  return json({
    containers,
    hasData:       !!latestDoc,
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

export default function DashboardPage() {
  const {
    containers,
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

      {/* 2. Mode-aware pipeline diagram */}
      <PipelineDiagram containers={containers} filterMode={pipeline.filterMode} />

      {/* 3. Before/after trend charts — C2 raw vs C6 output */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Filtration Effectiveness — Last 24 Hours
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ContainerLineChart
            title="pH · Raw vs Output"
            data={historical}
            metric="ph"
            unit="pH"
            mode="beforeAfter"
            height={220}
          />
          <ContainerLineChart
            title="Turbidity · Raw vs Output"
            data={historical}
            metric="turb"
            unit="NTU"
            mode="beforeAfter"
            height={220}
          />
        </div>
      </section>

      {/* 4. Compact weather strip */}
      <WeatherStrip weather={weather} />

      {/* 5. Activity log — full width */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Activity
        </h2>
        <ActivityLog logs={logs} liveStatus={liveStatus} />
      </section>
    </div>
  );
}
