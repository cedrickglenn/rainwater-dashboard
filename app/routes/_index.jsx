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
import { Droplets, Activity, Zap, Calendar } from 'lucide-react';

// Components
import { SensorCard } from '~/components/dashboard/sensor-card';
import { WaterQualityStatus } from '~/components/dashboard/water-quality-status';
import { SystemControls } from '~/components/dashboard/system-controls';
import { TankLevel } from '~/components/dashboard/tank-level';
import { SensorAreaChart } from '~/components/dashboard/chart-wrapper';
import { ActivityLog } from '~/components/dashboard/activity-log';
import { StatCard } from '~/components/dashboard/stat-card';

// Data and utilities
import {
  currentSensorData,
  systemStatus,
  historicalData,
  systemLogs,
  dashboardStats,
} from '~/data/mock-data';
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

/**
 * Loader function to fetch data server-side
 * In production, this would fetch from your API
 */
export const loader = async () => {
  // Calculate water quality status
  const waterQuality = calculateWaterQuality(currentSensorData);

  return json({
    sensors: currentSensorData,
    system: systemStatus,
    historical: historicalData,
    logs: systemLogs.slice(0, 5), // Latest 5 logs
    stats: dashboardStats,
    waterQuality,
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
  const { sensors, system, historical, logs, stats, waterQuality } =
    useLoaderData();

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
        lastChecked={formatRelativeTime(sensors.lastUpdated)}
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
          change={12}
          icon={Droplets}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          title="Potability"
          value={stats.potabilityScore}
          unit="%"
          change={2}
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
          change={8}
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
          change={12}
          icon={Droplets}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
        />
        <StatCard
          title="Potability Score"
          value={stats.potabilityScore}
          unit="%"
          change={2}
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
          change={8}
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
        CONTROLS & ACTIVITY SECTION
        Stacked on mobile, side-by-side on desktop
      */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">System Controls</h2>
          <SystemControls initialStatus={system} />
        </section>

        <section className="flex flex-col space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <ActivityLog logs={logs} />
        </section>
      </div>
    </div>
  );
}
