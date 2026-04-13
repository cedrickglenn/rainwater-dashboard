/**
 * Sensors Page
 * Detailed view of all sensor readings across the three instrumented containers:
 *   C2 (Raw Rainwater), C5 (After Filter), C6 (Final Storage)
 */

import { json } from '@remix-run/node';
import { useLoaderData, useNavigate, useRevalidator } from '@remix-run/react';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Progress } from '~/components/ui/progress';
import {
  ContainerLineChart,
  SensorAreaChart,
} from '~/components/dashboard/chart-wrapper';
import { PipelineStatus } from '~/components/dashboard/pipeline-status';
import {
  Droplets,
  Eye,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
} from 'lucide-react';

import { sensorMetadata } from '~/data/mock-data';
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip';
import { getDb } from '~/lib/db.server';
import {
  SENSOR_THRESHOLDS,
  getSensorStatus,
  STATUS_CONFIG,
  getSafeRangePercentage,
} from '~/lib/water-quality';
import { formatRelativeTime } from '~/lib/date-utils';

export const meta = () => [
  { title: 'Sensors | RainWater Monitoring System' },
  { name: 'description', content: 'Detailed sensor readings across all containers' },
];

const RANGE_HOURS = { '1h': 1, '24h': 24, '7d': 168, '30d': 720 };

// ── Loader ────────────────────────────────────────────────────────────────
export const loader = async ({ request }) => {
  const url   = new URL(request.url);
  const range = url.searchParams.get('range') ?? '24h';
  const hours = RANGE_HOURS[range] ?? 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const db = await getDb();
  const [latestDoc, historyDocs, heartbeatDoc] = await Promise.all([
    db.collection('sensor_readings').findOne({}, { sort: { timestamp: -1 } }),
    db.collection('sensor_readings')
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray(),
    db.collection('device_heartbeats').findOne({ source: 'esp32' }),
  ]);

  // Per-container snapshot
  const containers = {
    C2: {
      ph:          latestDoc?.ph_c2   ?? null,
      turbidity:   latestDoc?.turb_c2 ?? null,
      temperature: latestDoc?.temp_c2 ?? null,
    },
    C5: {
      ph:          latestDoc?.ph_c5   ?? null,
      turbidity:   latestDoc?.turb_c5 ?? null,
      temperature: latestDoc?.temp_c5 ?? null,
    },
    C6: {
      ph:          latestDoc?.ph_c6   ?? null,
      turbidity:   latestDoc?.turb_c6 ?? null,
      temperature: latestDoc?.temp_c6 ?? null,
    },
  };

  // Historical shaped for ContainerLineChart (all three containers per metric)
  const historical = historyDocs.map((doc) => ({
    timestamp: doc.timestamp,
    ph_c2:     doc.ph_c2   ?? null,
    ph_c5:     doc.ph_c5   ?? null,
    ph_c6:     doc.ph_c6   ?? null,
    turb_c2:   doc.turb_c2 ?? null,
    turb_c5:   doc.turb_c5 ?? null,
    turb_c6:   doc.turb_c6 ?? null,
    temp_c2:   doc.temp_c2 ?? null,
    temp_c5:   doc.temp_c5 ?? null,
    temp_c6:   doc.temp_c6 ?? null,
    // Single-container keys for per-container SensorAreaChart
    ph:          doc.ph_c6   ?? null,
    turbidity:   doc.turb_c6 ?? null,
    temperature: doc.temp_c6 ?? null,
  }));

  const pipeline = {
    ffState:       latestDoc?.ff_state       ?? 0,
    filterMode:    latestDoc?.filter_mode    ?? 0,
    backwashState: latestDoc?.backwash_state ?? 0,
  };

  return json({
    containers,
    historical,
    pipeline,
    lastHeartbeat: heartbeatDoc?.lastSeen ?? null,
    lastUpdated:   latestDoc?.timestamp   ?? null,
    range,
  });
};

// ── Container metadata for the detail view ────────────────────────────────
const CONTAINER_META = {
  C2: { label: 'C2', title: 'Raw Rainwater',  color: '#3b82f6' },
  C5: { label: 'C5', title: 'After Filter',   color: '#f59e0b' },
  C6: { label: 'C6', title: 'Final Storage',  color: '#22c55e' },
};

const SENSOR_ICONS = {
  ph:          Droplets,
  turbidity:   Eye,
  temperature: Thermometer,
};

// ── Per-sensor detail row inside a container tab ──────────────────────────
function SensorRow({ type, value, data, containerColor }) {
  const threshold   = SENSOR_THRESHOLDS[type];
  const hasValue    = value != null;
  const status      = getSensorStatus(type, value);
  const statusCfg   = STATUS_CONFIG[status];
  const percentage  = hasValue ? getSafeRangePercentage(type, value) : 0;
  const Icon        = SENSOR_ICONS[type];
  const meta        = sensorMetadata[type];

  const recentData = data.slice(-5).filter((d) => d[type] != null);
  const avgRecent  = recentData.length
    ? recentData.reduce((s, d) => s + d[type], 0) / recentData.length
    : null;
  const trend = hasValue && avgRecent != null
    ? value > avgRecent ? 1 : value < avgRecent ? -1 : 0
    : 0;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-2" style={{ backgroundColor: `${meta.color}20` }}>
            <Icon className="h-4 w-4" style={{ color: meta.color }} />
          </div>
          <span className="text-sm font-medium">{threshold.name}</span>
        </div>
        <Badge variant={status} className="text-xs">{statusCfg.label}</Badge>
      </div>

      {/* Value + trend */}
      <div className="flex items-baseline gap-2">
        <span className={cn('text-3xl font-bold', !hasValue && 'text-muted-foreground')}>
          {hasValue ? value.toFixed(type === 'ph' ? 2 : 1) : '—'}
        </span>
        {hasValue && (
          <span className="text-sm text-muted-foreground">{threshold.unit}</span>
        )}
        <div className={cn(
          'ml-auto flex items-center gap-1 text-xs',
          trend > 0 && 'text-green-500',
          trend < 0 && 'text-red-500',
          trend === 0 && 'text-muted-foreground',
        )}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>{trend > 0 ? 'Rising' : trend < 0 ? 'Falling' : 'Stable'}</span>
        </div>
      </div>

      {/* Safe range progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Safe: {threshold.safeRange}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <Progress
          value={Math.min(percentage, 100)}
          className="h-1.5"
          indicatorClassName={cn(
            status === 'safe'    && 'bg-green-500',
            status === 'warning' && 'bg-amber-500',
            status === 'unsafe'  && 'bg-red-500',
          )}
        />
      </div>

      {/* Description */}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        {meta.description}
      </p>
    </div>
  );
}

// ── Per-container tab panel ───────────────────────────────────────────────
function ContainerTab({ container, sensors, historical, containerColor }) {
  const sensorTypes = ['ph', 'turbidity', 'temperature'];

  // Remap historical to single-container keys for SensorAreaChart
  const containerKey = container.toLowerCase(); // c2, c5, c6
  const containerData = historical.map((d) => ({
    timestamp:   d.timestamp,
    ph:          d[`ph_${containerKey}`]   ?? null,
    turbidity:   d[`turb_${containerKey}`] ?? null,
    temperature: d[`temp_${containerKey}`] ?? null,
  }));

  return (
    <div className="space-y-4">
      {/* Sensor rows */}
      <div className="grid gap-3 sm:grid-cols-3">
        {sensorTypes.map((type) => (
          <SensorRow
            key={type}
            type={type}
            value={sensors[type]}
            data={containerData}
            containerColor={containerColor}
          />
        ))}
      </div>

      {/* Per-container trend charts */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SensorAreaChart
          title="pH Trend"
          data={containerData}
          dataKey="ph"
          xAxisKey="timestamp"
          sensorType="ph"
          height={180}
        />
        <SensorAreaChart
          title="Turbidity Trend"
          data={containerData}
          dataKey="turbidity"
          xAxisKey="timestamp"
          sensorType="turbidity"
          height={180}
        />
        <SensorAreaChart
          title="Temperature Trend"
          data={containerData}
          dataKey="temperature"
          xAxisKey="timestamp"
          sensorType="temperature"
          height={180}
        />
      </div>
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────────
export default function SensorsPage() {
  const { containers, historical, pipeline, lastHeartbeat, lastUpdated, range } =
    useLoaderData();

  const [timeRange, setTimeRange] = useState(range);
  const navigate    = useNavigate();
  const revalidator = useRevalidator();

  const handleRangeChange = (value) => {
    setTimeRange(value);
    navigate(`?range=${value}`);
  };

  const isRefreshing = revalidator.state === 'loading';

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sensors</h1>
          <p className="text-muted-foreground">
            Live readings across all three instrumented containers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-[140px] sm:w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => revalidator.revalidate()}
                disabled={isRefreshing}
                aria-label="Refresh data"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Pipeline status strip (same as dashboard) */}
      <PipelineStatus
        ffState={pipeline.ffState}
        filterMode={pipeline.filterMode}
        backwashState={pipeline.backwashState}
        lastHeartbeat={lastHeartbeat}
      />

      {/* Last updated */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span>
          {lastUpdated
            ? `Live data · Last updated ${formatRelativeTime(lastUpdated)}`
            : 'Awaiting first sensor reading…'}
        </span>
      </div>

      {/* Per-container tabs */}
      <Tabs defaultValue="C6" className="space-y-4">
        <TabsList>
          {Object.entries(CONTAINER_META).map(([key, meta]) => (
            <TabsTrigger key={key} value={key}>
              <span className="font-bold">{meta.label}</span>
              <span className="ml-1.5 hidden sm:inline text-muted-foreground font-normal">
                {meta.title}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(CONTAINER_META).map(([key, meta]) => (
          <TabsContent key={key} value={key}>
            <ContainerTab
              container={key}
              sensors={containers[key]}
              historical={historical}
              containerColor={meta.color}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Pipeline comparison charts */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Pipeline Comparison — All Containers</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ContainerLineChart
            title="pH — C2 vs C5 vs C6"
            data={historical}
            metric="ph"
            unit="pH"
            height={220}
          />
          <ContainerLineChart
            title="Turbidity — C2 vs C5 vs C6"
            data={historical}
            metric="turb"
            unit="NTU"
            height={220}
          />
          <ContainerLineChart
            title="Temperature — C2 vs C5 vs C6"
            data={historical}
            metric="temp"
            unit="°C"
            height={220}
          />
        </div>
      </section>

      {/* Thresholds reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PNSDW 2017 Thresholds Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['ph', 'turbidity', 'temperature']).map((key) => {
              const threshold = SENSOR_THRESHOLDS[key];
              const Icon      = SENSOR_ICONS[key];
              const meta      = sensorMetadata[key];
              return (
                <div key={key} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="rounded-lg p-2" style={{ backgroundColor: `${meta.color}20` }}>
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{threshold.name}</p>
                    <p className="text-xs text-muted-foreground">Safe: {threshold.safeRange}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
