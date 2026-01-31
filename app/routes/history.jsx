/**
 * History / Logs Page
 * View system logs, events, and historical data
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
import { Separator } from '~/components/ui/separator';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  History,
  Filter,
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

// Data and utilities
import { systemLogs, weeklyData } from '~/data/mock-data';
import { formatDateTime, formatLogDate, formatDate } from '~/lib/date-utils';

/**
 * Meta function for SEO
 */
export const meta = () => {
  return [
    { title: 'History | RainWater Monitoring System' },
    { name: 'description', content: 'System logs and historical data' },
  ];
};

/**
 * Loader function
 */
export const loader = async () => {
  return json({
    logs: systemLogs,
    weeklyStats: weeklyData,
  });
};

/**
 * Log type icons
 */
const LOG_ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

/**
 * Log type styles
 */
const LOG_STYLES = {
  info: {
    icon: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    badge: 'info',
  },
  success: {
    icon: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/50',
    badge: 'success',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    badge: 'warning',
  },
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/50',
    badge: 'error',
  },
};

/**
 * Log entry component
 */
function LogEntry({ log, isExpanded, onToggle }) {
  const Icon = LOG_ICONS[log.type] || Info;
  const styles = LOG_STYLES[log.type] || LOG_STYLES.info;

  return (
    <div
      className={cn(
        'cursor-pointer rounded-lg border p-4 transition-all hover:shadow-sm',
        styles.bg
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="mt-0.5">
          <Icon className={cn('h-5 w-5', styles.icon)} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{log.message}</p>
            <Badge variant={styles.badge} className="flex-shrink-0">
              {log.type}
            </Badge>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(log.timestamp)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatLogDate(log.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs">
              {log.category}
            </Badge>
          </div>

          {/* Expanded details */}
          {isExpanded && log.details && (
            <div className="mt-3 rounded-md bg-background/50 p-3 text-sm">
              <p className="text-muted-foreground">{log.details}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Daily summary card
 */
function DailySummary({ data }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {formatDate(data.date, 'EEEE, MMM dd')}
            </p>
            <p className="text-2xl font-bold">
              {data.potabilityScore.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Potability Score</p>
          </div>
          <div className="space-y-1 text-right text-sm">
            <p>
              pH: <span className="font-medium">{data.avgPh.toFixed(2)}</span>
            </p>
            <p>
              Turb:{' '}
              <span className="font-medium">
                {data.avgTurbidity.toFixed(1)}
              </span>
            </p>
            <p>
              TDS: <span className="font-medium">{data.avgTds.toFixed(0)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * History Page Component
 */
export default function HistoryPage() {
  const { logs, weeklyStats } = useLoaderData();
  const [expandedLog, setExpandedLog] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 5;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (filterCategory !== 'all' && log.category !== filterCategory)
      return false;
    if (
      searchQuery &&
      !log.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Paginate logs
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  // Get unique categories
  const categories = [...new Set(logs.map((log) => log.category))];

  // Count logs by type
  const logCounts = logs.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            History & Logs
          </h1>
          <p className="text-muted-foreground">
            View system events, alerts, and historical data.
          </p>
        </div>

        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex items-center gap-3 p-4">
            <Info className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{logCounts.info || 0}</p>
              <p className="text-sm text-muted-foreground">Info</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{logCounts.success || 0}</p>
              <p className="text-sm text-muted-foreground">Success</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{logCounts.warning || 0}</p>
              <p className="text-sm text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="flex items-center gap-3 p-4">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{logCounts.error || 0}</p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs" className="gap-2">
            <FileText className="h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="daily" className="gap-2">
            <Calendar className="h-4 w-4" />
            Daily Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:gap-4">
                {/* Search - full width on mobile */}
                <div className="col-span-2 flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 sm:col-span-1 sm:flex-1">
                  <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {/* Type filter */}
                <Select value={filterType} onValueChange={setFilterType}>
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

                {/* Category filter */}
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Logs list */}
          <div className="space-y-3">
            {paginatedLogs.length > 0 ? (
              paginatedLogs.map((log) => (
                <LogEntry
                  key={log.id}
                  log={log}
                  isExpanded={expandedLog === log.id}
                  onToggle={() =>
                    setExpandedLog(expandedLog === log.id ? null : log.id)
                  }
                />
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    No logs found matching your filters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * logsPerPage + 1} to{' '}
                {Math.min(currentPage * logsPerPage, filteredLogs.length)} of{' '}
                {filteredLogs.length} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {weeklyStats.map((day, index) => (
                  <DailySummary key={index} data={day} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
