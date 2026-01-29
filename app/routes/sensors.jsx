/**
 * Sensors Page
 * Detailed view of all sensor readings with charts
 */

import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
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
  SensorAreaChart,
  MultiLineChart,
} from '~/components/dashboard/chart-wrapper';
import {
  Droplets,
  Eye,
  Beaker,
  Thermometer,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Download,
  Info,
} from 'lucide-react';

// Data and utilities
import {
  currentSensorData,
  historicalData,
  sensorMetadata,
} from '~/data/mock-data';
import {
  SENSOR_THRESHOLDS,
  getSensorStatus,
  STATUS_CONFIG,
  getSafeRangePercentage,
} from '~/lib/water-quality';
import { formatDateTime, formatRelativeTime } from '~/lib/date-utils';

/**
 * Meta function for SEO
 */
export const meta = () => {
  return [
    { title: 'Sensors | RainWater Monitoring System' },
    { name: 'description', content: 'Detailed sensor readings and analysis' },
  ];
};

/**
 * Loader function
 */
export const loader = async () => {
  return json({
    sensors: currentSensorData,
    historical: historicalData,
  });
};

/**
 * Sensor icons mapping
 */
const SENSOR_ICONS = {
  ph: Droplets,
  turbidity: Eye,
  tds: Beaker,
  temperature: Thermometer,
};

/**
 * Sensor detail card with gauge-like visualization
 */
function SensorDetailCard({ type, value, data }) {
  const threshold = SENSOR_THRESHOLDS[type];
  const status = getSensorStatus(type, value);
  const statusConfig = STATUS_CONFIG[status];
  const percentage = getSafeRangePercentage(type, value);
  const Icon = SENSOR_ICONS[type];
  const metadata = sensorMetadata[type];

  // Determine trend from historical data
  const recentData = data.slice(-5);
  const avgRecent =
    recentData.reduce((sum, d) => sum + d[type], 0) / recentData.length;
  const trend = value > avgRecent ? 1 : value < avgRecent ? -1 : 0;
  const TrendIcon =
    trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div
              className="rounded-lg p-2"
              style={{ backgroundColor: `${metadata.color}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: metadata.color }} />
            </div>
            {threshold.name}
          </CardTitle>
          <Badge variant={status}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Value display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold">{value.toFixed(2)}</span>
          <span className="text-lg text-muted-foreground">
            {threshold.unit}
          </span>
          <div
            className={cn(
              'ml-auto flex items-center gap-1 text-sm',
              trend > 0 && 'text-green-500',
              trend < 0 && 'text-red-500',
              trend === 0 && 'text-muted-foreground'
            )}
          >
            <TrendIcon className="h-4 w-4" />
            <span>{trend > 0 ? 'Rising' : trend < 0 ? 'Falling' : 'Stable'}</span>
          </div>
        </div>

        {/* Progress bar showing position in range */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Safe Range: {threshold.safeRange}</span>
            <span>{percentage.toFixed(0)}%</span>
          </div>
          <Progress
            value={Math.min(percentage, 100)}
            className="h-2"
            indicatorClassName={cn(
              status === 'safe' && 'bg-green-500',
              status === 'warning' && 'bg-amber-500',
              status === 'unsafe' && 'bg-red-500'
            )}
          />
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {metadata.description}
        </p>

        {/* Mini chart */}
        <div className="h-32 -mx-2">
          <SensorAreaChart
            data={data.slice(-12)}
            dataKey={type}
            xAxisKey="timestamp"
            sensorType={type}
            height={120}
            showGrid={false}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Sensors Page Component
 */
export default function SensorsPage() {
  const { sensors, historical } = useLoaderData();
  const [timeRange, setTimeRange] = useState('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Sensors
          </h1>
          <p className="text-muted-foreground">
            Detailed sensor readings and historical data analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
          </Button>

          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Last updated info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
        </span>
        <span>
          Live data • Last updated {formatRelativeTime(sensors.lastUpdated)}
        </span>
      </div>

      {/* Sensor detail cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <SensorDetailCard type="ph" value={sensors.ph} data={historical} />
        <SensorDetailCard
          type="turbidity"
          value={sensors.turbidity}
          data={historical}
        />
        <SensorDetailCard type="tds" value={sensors.tds} data={historical} />
        <SensorDetailCard
          type="temperature"
          value={sensors.temperature}
          data={historical}
        />
      </div>

      {/* Comparison charts */}
      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <SensorAreaChart
              title="pH Level Trend"
              data={historical}
              dataKey="ph"
              xAxisKey="timestamp"
              sensorType="ph"
              height={250}
            />
            <SensorAreaChart
              title="Turbidity Trend"
              data={historical}
              dataKey="turbidity"
              xAxisKey="timestamp"
              sensorType="turbidity"
              height={250}
            />
            <SensorAreaChart
              title="TDS Trend"
              data={historical}
              dataKey="tds"
              xAxisKey="timestamp"
              sensorType="tds"
              height={250}
            />
            <SensorAreaChart
              title="Temperature Trend"
              data={historical}
              dataKey="temperature"
              xAxisKey="timestamp"
              sensorType="temperature"
              height={250}
            />
          </div>
        </TabsContent>

        <TabsContent value="comparison">
          <MultiLineChart
            title="All Sensors Comparison (Normalized)"
            data={historical}
            xAxisKey="timestamp"
            height={400}
            lines={[
              { dataKey: 'ph', name: 'pH', type: 'ph' },
              { dataKey: 'turbidity', name: 'Turbidity', type: 'turbidity' },
              { dataKey: 'temperature', name: 'Temperature', type: 'temperature' },
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Sensor thresholds reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sensor Thresholds Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(SENSOR_THRESHOLDS).map(([key, threshold]) => {
              const Icon = SENSOR_ICONS[key];
              const metadata = sensorMetadata[key];
              return (
                <div
                  key={key}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div
                    className="rounded-lg p-2"
                    style={{ backgroundColor: `${metadata.color}20` }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: metadata.color }}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{threshold.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Safe: {threshold.safeRange}
                    </p>
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
