/**
 * History / Logs Page
 * View activity logs and historical sensor summaries
 */

import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { useActivityStream } from '~/lib/activity-stream';
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
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip';
import {
  History,
  Download,
  Search,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

import { getDb } from '~/lib/db.server';
import { getSensorStatus, WATER_STATUS } from '~/lib/water-quality';
import { formatDate, formatLogDate } from '~/lib/date-utils';

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

export const meta = () => [
  { title: 'History | RainWater Monitoring System' },
  { name: 'description', content: 'Activity logs and historical sensor data' },
];

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

const RANGE_MS = {
  today: 24 * 60 * 60 * 1000,
  '7d':  7  * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const loader = async ({ request }) => {
  const url   = new URL(request.url);
  const range = url.searchParams.get('range') ?? '7d';

  const since       = RANGE_MS[range] ? new Date(Date.now() - RANGE_MS[range]) : null;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const db = await getDb();

  const [logDocs, dailyDocs] = await Promise.all([
    // Activity logs — up to 500 entries within the selected range
    db.collection('activity_logs')
      .find(since ? { timestamp: { $gte: since } } : {})
      .sort({ timestamp: -1 })
      .limit(500)
      .toArray(),

    // Daily aggregated sensor averages for the last 7 days
    db.collection('sensor_readings').aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            year:  { $year:       '$timestamp' },
            month: { $month:      '$timestamp' },
            day:   { $dayOfMonth: '$timestamp' },
          },
          date:         { $first: '$timestamp' },
          avgPh:        { $avg: '$ph_c6' },
          avgTurbidity: { $avg: '$turb_c6' },
          avgTemp:      { $avg: '$temp_c6' },
          count:        { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]).toArray(),
  ]);

  const logs = logDocs.map((e) => ({
    id:        e._id.toString(),
    type:      e.type     ?? 'info',
    source:    e.source   ?? 'SYSTEM',
    category:  e.category ?? e.source ?? 'SYSTEM',
    message:   e.message  ?? '',
    raw:       e.raw      ?? null,
    timestamp: e.timestamp,
  }));

  // Derive unique sources for the filter dropdown
  const sources = [...new Set(logDocs.map((e) => e.source).filter(Boolean))].sort();

  // Count by type for quick-stats cards
  const counts = logs.reduce((acc, l) => {
    acc[l.type] = (acc[l.type] ?? 0) + 1;
    return acc;
  }, {});

  const weeklyStats = dailyDocs.map((day) => {
    const phOk   = day.avgPh        != null && getSensorStatus('ph',        day.avgPh)        === WATER_STATUS.SAFE;
    const turbOk = day.avgTurbidity != null && getSensorStatus('turbidity', day.avgTurbidity) === WATER_STATUS.SAFE;
    const score  = phOk && turbOk ? 100 : phOk || turbOk ? 70 : 40;
    return {
      date:           day.date,
      avgPh:          day.avgPh        ?? null,
      avgTurbidity:   day.avgTurbidity ?? null,
      avgTemperature: day.avgTemp      ?? null,
      potabilityScore: score,
      readingCount:   day.count,
    };
  });

  return json({ logs, sources, counts, weeklyStats, range });
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOG_ICONS = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
};

const LOG_STYLES = {
  info:    { icon: 'text-blue-500',  bg: 'bg-blue-50  dark:bg-blue-950/40'  },
  success: { icon: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/40' },
  warning: { icon: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  error:   { icon: 'text-red-500',   bg: 'bg-red-50   dark:bg-red-950/40'   },
};

function exportCsv(logs) {
  const header = 'timestamp,type,source,message,raw\n';
  const rows = logs.map((l) => {
    const ts  = l.timestamp ? new Date(l.timestamp).toISOString() : '';
    const msg = `"${(l.message ?? '').replace(/"/g, '""')}"`;
    const raw = `"${(l.raw     ?? '').replace(/"/g, '""')}"`;
    return `${ts},${l.type},${l.source},${msg},${raw}`;
  });
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LogEntry({ log, isExpanded, onToggle }) {
  const Icon   = LOG_ICONS[log.type] ?? Info;
  const styles = LOG_STYLES[log.type] ?? LOG_STYLES.info;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border p-4 transition-all hover:shadow-sm',
        styles.bg
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', styles.icon)} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium leading-snug">{log.message}</p>
            <Badge variant={log.type} className="shrink-0 text-xs uppercase">
              {log.type}
            </Badge>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(log.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatLogDate(log.timestamp)}
            </span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
              {log.source}
            </Badge>
          </div>

          {/* Raw frame — shown on expand.
               stopPropagation prevents clicking/selecting text from collapsing the card. */}
          {isExpanded && log.raw && (
            <div
              className="mt-3 cursor-text select-text rounded-md bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {log.raw}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DailySummary({ data }) {
  const scoreColor =
    data.potabilityScore >= 90 ? 'text-green-600 dark:text-green-400'
    : data.potabilityScore >= 60 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {formatDate(data.date, 'EEEE, MMM dd')}
            </p>
            <p className={cn('text-2xl font-bold', scoreColor)}>
              {data.potabilityScore}%
            </p>
            <p className="text-xs text-muted-foreground">Potability</p>
          </div>
          <div className="space-y-1 text-right text-sm">
            <p>pH: <span className="font-medium">{data.avgPh        != null ? data.avgPh.toFixed(2)        : '—'}</span></p>
            <p>Turb: <span className="font-medium">{data.avgTurbidity != null ? data.avgTurbidity.toFixed(1) : '—'}</span></p>
            <p>Temp: <span className="font-medium">{data.avgTemperature != null ? `${data.avgTemperature.toFixed(1)} °C` : '—'}</span></p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{data.readingCount} reading{data.readingCount !== 1 ? 's' : ''}</p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const LOGS_PER_PAGE = 10;

export default function HistoryPage() {
  const { logs: initialLogs, sources: initialSources, counts: initialCounts, weeklyStats, range } = useLoaderData();
  const navigate = useNavigate();
  const { liveStatus, subscribe } = useActivityStream();

  const [logs,    setLogs]    = useState(initialLogs);
  const [sources, setSources] = useState(initialSources);
  const [counts,  setCounts]  = useState(initialCounts);

  // Sync when loader re-fetches (date range change)
  useEffect(() => { setLogs(initialLogs);    }, [initialLogs]);
  useEffect(() => { setSources(initialSources); }, [initialSources]);
  useEffect(() => { setCounts(initialCounts);  }, [initialCounts]);

  // Subscribe to live entries — prepend to list and update counts
  useEffect(() => {
    return subscribe((entry) => {
      setLogs((prev) => {
        if (prev.some((l) => l.id === entry.id)) return prev;
        return [entry, ...prev].slice(0, 500);
      });
      setSources((prev) =>
        prev.includes(entry.source) ? prev : [...prev, entry.source].sort()
      );
      setCounts((prev) => ({
        ...prev,
        [entry.type]: (prev[entry.type] ?? 0) + 1,
      }));
    });
  }, [subscribe]);

  // URL-driven date range (re-fetches from server)
  const handleRangeChange = useCallback(
    (value) => navigate(`?range=${value}`),
    [navigate]
  );

  // Client-side filters
  const [filterType,   setFilterType]   = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [currentPage,  setCurrentPage]  = useState(1);
  const [expandedLog,  setExpandedLog]  = useState(null);

  // Reset page when filters change
  const applyFilter = useCallback((setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  // Filter
  const filtered = logs.filter((l) => {
    if (filterType   !== 'all' && l.type   !== filterType)   return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    if (searchQuery && !l.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalPages    = Math.max(1, Math.ceil(filtered.length / LOGS_PER_PAGE));
  const safePage      = Math.min(currentPage, totalPages);
  const paginated     = filtered.slice((safePage - 1) * LOGS_PER_PAGE, safePage * LOGS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">History & Logs</h1>
          <p className="text-muted-foreground">Activity logs and daily sensor summaries.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date range — server-side re-fetch */}
          <Select value={range} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => exportCsv(filtered)}
                aria-label="Export filtered logs as CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export filtered logs as CSV</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Quick-stat cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { type: 'info',    label: 'Info',     Icon: Info,         classes: 'border-blue-200  bg-blue-50  dark:border-blue-900  dark:bg-blue-950/30',  iconClass: 'text-blue-500'  },
          { type: 'success', label: 'Success',  Icon: CheckCircle2, classes: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30', iconClass: 'text-green-500' },
          { type: 'warning', label: 'Warnings', Icon: AlertTriangle, classes: 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30', iconClass: 'text-amber-500' },
          { type: 'error',   label: 'Errors',   Icon: XCircle,      classes: 'border-red-200   bg-red-50   dark:border-red-900   dark:bg-red-950/30',   iconClass: 'text-red-500'   },
        ].map(({ type, label, Icon, classes, iconClass }) => (
          <Card key={type} className={cn('cursor-pointer transition-all hover:shadow-sm', classes, filterType === type && 'ring-2 ring-ring')}
            onClick={() => applyFilter(setFilterType)(filterType === type ? 'all' : type)}>
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={cn('h-7 w-7 shrink-0', iconClass)} />
              <div>
                <p className="text-2xl font-bold">{counts[type] ?? 0}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            Activity Logs
            {logs.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {logs.length}
              </Badge>
            )}
            {liveStatus === 'live' && (
              <span className="relative ml-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <Calendar className="h-4 w-4" />
            Daily Summary
          </TabsTrigger>
        </TabsList>

        {/* ---- Activity Logs tab ---- */}
        <TabsContent value="logs" className="space-y-4">

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:gap-3">
                {/* Search */}
                <div className="col-span-2 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 sm:flex-1">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search messages…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {/* Type filter */}
                <Select value={filterType} onValueChange={applyFilter(setFilterType)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>

                {/* Source filter */}
                <Select value={filterSource} onValueChange={applyFilter(setFilterSource)}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources.map((src) => (
                      <SelectItem key={src} value={src}>{src}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results count */}
          {(filterType !== 'all' || filterSource !== 'all' || searchQuery) && (
            <p className="text-sm text-muted-foreground">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
              {filtered.length !== logs.length && ` (of ${logs.length} total)`}
            </p>
          )}

          {/* Log entries */}
          <div className="space-y-2">
            {paginated.length > 0 ? (
              paginated.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  isExpanded={expandedLog === log.id}
                  onToggle={() => setExpandedLog((prev) => prev === log.id ? null : log.id)}
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="mt-4 text-muted-foreground">
                    {logs.length === 0
                      ? 'No activity logs yet. Waiting for firmware data…'
                      : 'No logs match your current filters.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {(safePage - 1) * LOGS_PER_PAGE + 1}–{Math.min(safePage * LOGS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous page</TooltipContent>
                </Tooltip>
                <span className="min-w-[6rem] text-center text-sm">
                  Page {safePage} of {totalPages}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next page</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ---- Daily Summary tab ---- */}
        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Last 7 Days — Sensor Averages</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {weeklyStats.map((day, i) => (
                    <DailySummary key={i} data={day} />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Calendar className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>No sensor data recorded in the last 7 days.</p>
                  <p className="mt-1 text-sm opacity-70">
                    Data will appear here once the ESP32 starts posting readings.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
