/**
 * Dashboard Index Page (Home)
 * Main overview page showing water quality status and sensor readings
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
      content:
        'Monitor your smart rainwater harvesting system in real-time',
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
 */
export default function DashboardPage() {
  const { sensors, system, historical, logs, stats, waterQuality } =
    useLoaderData();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your rainwater quality and system status in real-time.
        </p>
      </div>

      {/* Quick stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Water quality and sensors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Water quality status */}
          <WaterQualityStatus
            status={waterQuality.overall}
            score={stats.potabilityScore}
            lastChecked={formatRelativeTime(sensors.lastUpdated)}
          />

          {/* Sensor cards grid */}
          <div className="grid gap-4 sm:grid-cols-2">
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

          {/* Historical chart */}
          <SensorAreaChart
            title="pH Level - Last 24 Hours"
            data={historical}
            dataKey="ph"
            xAxisKey="timestamp"
            sensorType="ph"
            height={250}
          />
        </div>

        {/* Right column - Controls and activity */}
        <div className="space-y-6">
          {/* Tank level */}
          <TankLevel
            level={system.tankLevel}
            capacity={1000}
            trend={1}
          />

          {/* System controls */}
          <SystemControls initialStatus={system} />

          {/* Activity log */}
          <ActivityLog logs={logs} maxHeight={300} />
        </div>
      </div>
    </div>
  );
}
