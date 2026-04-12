/**
 * Dashboard Index Page (Home)
 * Main overview page showing water quality status and sensor readings
 *
 * Mobile-first layout principles:
 * - Water quality status first (most critical info)
 * - Stacked layout on mobile, grid on larger screens
 * - Generous spacing for thumb-friendly scrolling
 * - Key info visible without scrolling
 */

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { Droplets, Activity, Zap, Calendar } from 'lucide-react';

// Components
import { SensorCard } from '~/components/dashboard/sensor-card';
import { WaterQualityStatus } from '~/components/dashboard/water-quality-status';
import { TankLevel } from '~/components/dashboard/tank-level';
import { SensorAreaChart } from '~/components/dashboard/chart-wrapper';
import { ActivityLog } from '~/components/dashboard/activity-log';
import { WeatherWidget } from '~/components/dashboard/weather-widget';
import { useActivityStream } from '~/lib/activity-stream';
import { StatCard } from '~/components/dashboard/stat-card';

// Data and utilities
import { getDb } from '~/lib/db.server';
import { getWeather } from '~/lib/weather.server';
import { calculateWaterQuality } from '~/lib/water-quality';
import { formatRelativeTime } from '~/lib/date-utils';

/**
 * Meta function for SEO
 */
export const meta = () => {
  return [
    { title: 'Dashboard | RainWater Monitoring System' },
    {
      name: 'description',
      content: 'Monitor your smart rainwater harvesting system in real-time',
    },
  ];
};

export const loader = async () => {
  const db    = await getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [latestDoc, historyDocs, logDocs, actuatorDocs, alertCount, todayFlowDocs, weather] =
    await Promise.all([
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
      db.collection('actuator_states').find({}).toArray(),
      db.collection('activity_logs').countDocuments({
        level: { $in: ['WARN', 'ERR'] },
        timestamp: { $gte: since },
      }),
      db.collection('sensor_readings')
        .find({ timestamp: { $gte: since } }, { projection: { flow: 1, _id: 0 } })
        .toArray(),
      getWeather(),
    ]);

  // C6 = clean storage (final output) — primary display container.
  const sensors = {
    ph:          latestDoc?.ph_c6       ?? null,
    turbidity:   latestDoc?.turb_c6     ?? null,
    temperature: latestDoc?.temp_c6     ?? null,
    tds:         null, // no TDS sensor in this hardware build
    lastUpdated: latestDoc?.timestamp   ?? null,
    lvl_c6:      latestDoc?.lvl_c6      ?? 0,
    filterMode:  latestDoc?.filter_mode ?? 0,
  };

  const historical = historyDocs.map((doc) => ({
    timestamp:   doc.timestamp,
    ph:          doc.ph_c6   ?? null,
    turbidity:   doc.turb_c6 ?? null,
    temperature: doc.temp_c6 ?? null,
  }));

  const waterQuality = calculateWaterQuality({
    ph:          sensors.ph,
    turbidity:   sensors.turbidity,
    temperature: sensors.temperature,
  });

  // Potability score: % of known sensors currently in safe range
  const knownStatuses = Object.values(waterQuality.sensors).filter((s) => s !== 'unknown');
  const potabilityScore = knownStatuses.length
    ? Math.round((knownStatuses.filter((s) => s === 'safe').length / knownStatuses.length) * 100)
    : null;

  // Water collected today: sum flow field if sensor data is present, otherwise null
  const hasFlowData = todayFlowDocs.some((d) => d.flow != null);
  const todayWaterCollected = hasFlowData
    ? Math.round(todayFlowDocs.reduce((sum, d) => sum + (d.flow ?? 0), 0))
    : null;

  // Pump status: any pump currently commanded ON
  const pumpStatus = actuatorDocs.some((d) => d.type === 'PUMP' && d.state === 'ON');

  return json({
    sensors,
    historical,
    waterQuality,
    hasData: !!latestDoc,
    system: {
      tankLevel:    sensors.lvl_c6,
      filterStatus: sensors.filterMode > 0,
      uvStatus:     false,       // no UV lamp in this hardware build
      pumpStatus,
      systemHealth: waterQuality.overall === 'unsafe'  ? 'critical'
                  : waterQuality.overall === 'warning' ? 'warning'
                  : 'good',
    },
    logs: logDocs.reverse().map((e) => ({
      id:        e._id.toString(),
      source:    e.source,
      level:     e.level,
      message:   e.message,
      type:      e.type ?? (e.level === 'WARN' ? 'warning' : e.level === 'ERR' ? 'error' : e.level === 'OK' ? 'success' : 'info'),
      category:  e.category ?? e.source,
      timestamp: e.timestamp,
    })),
    stats: {
      potabilityScore,
      todayWaterCollected,
      weeklyWaterCollected: null,  // requires flow meter data over 7 days
      systemUptime:         null,  // requires uptime telemetry from firmware
      alertsCount:          alertCount,
    },
    weather,
  });
};

/**
 * Dashboard Page Component
 *
 * Layout structure (mobile-first):
 * 1. Hero section: Water quality status (most important, always visible first)
 * 2. Tank level (quick glance at water availability)
 * 3. Stats grid (key metrics in compact cards)
 * 4. Sensor readings (detailed sensor data)
 * 5. Chart (historical data visualization)
 * 6. System controls & activity log
 */
export default function DashboardPage() {
  const { sensors, system, historical, logs: initialLogs, stats, waterQuality, weather } =
    useLoaderData();

  const [logs, setLogs] = useState(initialLogs);
  const { liveStatus, subscribe } = useActivityStream();

  useEffect(() => {
    return subscribe((entry) => {
      setLogs((prev) => {
        if (prev.some((l) => l.id === entry.id)) return prev;
        const next = [...prev, entry];
        return next.length > 50 ? next.slice(next.length - 50) : next;
      });
    });
  }, [subscribe]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page header - compact on mobile */}
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Rainwater quality and system status
        </p>
      </div>

      {/* 
        HERO SECTION: Water quality status
        Most critical info - shows first on mobile
        Full width for maximum visibility
      */}
      <WaterQualityStatus
        status={waterQuality.overall}
        score={stats.potabilityScore}
        lastChecked={sensors.lastUpdated ? formatRelativeTime(sensors.lastUpdated) : 'No data yet'}
      />

      {/* 
        QUICK GLANCE SECTION
        Tank level + 2 key stats on mobile
        Horizontal scroll or stacked layout
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tank level - key visual indicator */}
        <TankLevel level={system.tankLevel} capacity={1000} trend={1} />

        {/* Key stats - potability and today's collection */}
        <StatCard
          title="Water Today"
          value={stats.todayWaterCollected}
          unit="L"
          icon={Droplets}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          title="Potability"
          value={stats.potabilityScore}
          unit="%"
          icon={Activity}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
        />
      </div>

      {/* 
        ADDITIONAL STATS (collapsed on mobile, expanded on desktop)
        Less critical stats appear below the fold
      */}
      <div className="grid grid-cols-2 gap-4 lg:hidden">
        <StatCard
          title="Uptime"
          value={stats.systemUptime}
          unit="%"
          icon={Zap}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
        />
        <StatCard
          title="This Week"
          value={stats.weeklyWaterCollected}
          unit="L"
          icon={Calendar}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
        />
      </div>

      {/* Desktop-only: full stats row */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-4">
        <StatCard
          title="Water Collected Today"
          value={stats.todayWaterCollected}
          unit="L"
          icon={Droplets}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          title="Potability Score"
          value={stats.potabilityScore}
          unit="%"
          icon={Activity}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
        />
        <StatCard
          title="System Uptime"
          value={stats.systemUptime}
          unit="%"
          icon={Zap}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400"
        />
        <StatCard
          title="This Week"
          value={stats.weeklyWaterCollected}
          unit="L"
          icon={Calendar}
          iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400"
        />
      </div>

      {/* 
        SENSOR READINGS SECTION
        Stacked on mobile, 2-column grid on tablet+
        Each card is touch-friendly with adequate spacing
      */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Sensor Readings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <SensorCard
            type="ph"
            value={sensors.ph}
            trend={0}
            lastUpdated={sensors.lastUpdated}
          />
          <SensorCard
            type="turbidity"
            value={sensors.turbidity}
            trend={-1}
            lastUpdated={sensors.lastUpdated}
          />
          <SensorCard
            type="tds"
            value={sensors.tds}
            trend={1}
            lastUpdated={sensors.lastUpdated}
          />
          <SensorCard
            type="temperature"
            value={sensors.temperature}
            trend={0}
            lastUpdated={sensors.lastUpdated}
          />
        </div>
      </section>

      {/* 
        HISTORICAL DATA SECTION
        Chart with responsive height
      */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Trends</h2>
        <SensorAreaChart
          title="pH Level - Last 24 Hours"
          data={historical}
          dataKey="ph"
          xAxisKey="timestamp"
          sensorType="ph"
          height={200}
          className="sm:h-[250px] lg:h-[300px]"
        />
      </section>

      {/*
        WEATHER + ACTIVITY SECTION
        Stacked on mobile, 2-column on desktop
      */}
      <div className="grid gap-5 lg:grid-cols-2 min-w-0 overflow-hidden">
        <section className="flex flex-col space-y-3 min-w-0">
          <h2 className="text-lg font-semibold">Weather</h2>
          <WeatherWidget weather={weather} className="flex-1" />
        </section>

        <section className="flex flex-col space-y-3 min-w-0">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ActivityLog logs={logs} liveStatus={liveStatus} />
        </section>
      </div>
    </div>
  );
}
