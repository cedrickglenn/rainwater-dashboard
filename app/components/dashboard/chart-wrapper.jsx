/**
 * ChartWrapper Component
 * Wrapper for Recharts with responsive container and theming
 */

import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { formatChartLabel } from '~/lib/date-utils';

/**
 * Chart color configurations for different sensor types
 */
const CHART_COLORS = {
  ph: {
    stroke: '#8b5cf6',
    fill: 'rgba(139, 92, 246, 0.2)',
  },
  turbidity: {
    stroke: '#f59e0b',
    fill: 'rgba(245, 158, 11, 0.2)',
  },
  tds: {
    stroke: '#0ea5e9',
    fill: 'rgba(14, 165, 233, 0.2)',
  },
  temperature: {
    stroke: '#ef4444',
    fill: 'rgba(239, 68, 68, 0.2)',
  },
  default: {
    stroke: '#6366f1',
    fill: 'rgba(99, 102, 241, 0.2)',
  },
};

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label, labelFormatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-lg border bg-popover p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-2">
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.stroke || entry.color }}
          />
          <span className="capitalize">{entry.dataKey}:</span>
          <span className="font-medium">
            {typeof entry.value === 'number'
              ? entry.value.toFixed(2)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * SensorLineChart Component
 * Line chart for sensor data over time
 * @param {Object} props - Component props
 * @param {string} props.title - Chart title
 * @param {Array} props.data - Chart data
 * @param {string} props.dataKey - Key for Y-axis data
 * @param {string} props.xAxisKey - Key for X-axis data
 * @param {string} props.sensorType - Type of sensor for styling
 * @param {number} props.height - Chart height
 * @param {string} props.className - Additional CSS classes
 */
export function SensorLineChart({
  title,
  data,
  dataKey,
  xAxisKey = 'timestamp',
  sensorType = 'default',
  height = 300,
  showGrid = true,
  className,
}) {
  const colors = CHART_COLORS[sensorType] || CHART_COLORS.default;

  return (
    <Card className={cn('', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? '' : 'pt-6')}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={(value) => formatChartLabel(value, 'hour')}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={
                <CustomTooltip
                  labelFormatter={(value) =>
                    formatChartLabel(value, 'hour')
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colors.stroke}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: colors.stroke }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * SensorAreaChart Component
 * Area chart for sensor data with fill
 */
export function SensorAreaChart({
  title,
  data,
  dataKey,
  xAxisKey = 'timestamp',
  sensorType = 'default',
  height = 300,
  showGrid = true,
  className,
}) {
  const colors = CHART_COLORS[sensorType] || CHART_COLORS.default;

  return (
    <Card className={cn('', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? '' : 'pt-6')}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={(value) => formatChartLabel(value, 'hour')}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={
                <CustomTooltip
                  labelFormatter={(value) =>
                    formatChartLabel(value, 'hour')
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={colors.stroke}
              fill={colors.fill}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * MultiLineChart Component
 * Multiple lines for comparing different sensors
 */
export function MultiLineChart({
  title,
  data,
  lines,
  xAxisKey = 'timestamp',
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
}) {
  return (
    <Card className={cn('', className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(title ? '' : 'pt-6')}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-muted"
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={(value) => formatChartLabel(value, 'hour')}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={false}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              content={
                <CustomTooltip
                  labelFormatter={(value) =>
                    formatChartLabel(value, 'hour')
                  }
                />
              }
            />
            {showLegend && <Legend />}
            {lines.map((line) => {
              const colors = CHART_COLORS[line.type] || CHART_COLORS.default;
              return (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name || line.dataKey}
                  stroke={line.color || colors.stroke}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
