/**
 * ActivityLog Component
 * Displays recent system activity and events
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import {
  Activity,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { formatLogDate } from '~/lib/date-utils';

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
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    border: 'border-l-blue-500',
  },
  success: {
    icon: 'text-green-500',
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-l-green-500',
  },
  warning: {
    icon: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-l-amber-500',
  },
  error: {
    icon: 'text-red-500',
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-l-red-500',
  },
};

/**
 * ActivityLogItem Component
 * Individual log entry with stacked layout for reliable responsiveness
 */
function ActivityLogItem({ log }) {
  const Icon = LOG_ICONS[log.type] || Info;
  const styles = LOG_STYLES[log.type] || LOG_STYLES.info;

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_1fr] gap-3 rounded-r-lg border-l-4 p-3 transition-colors hover:bg-muted/50',
        styles.border
      )}
    >
      {/* Icon - fixed size */}
      <div className={cn('shrink-0 rounded-full p-1.5', styles.bg)}>
        <Icon className={cn('h-4 w-4', styles.icon)} />
      </div>

      {/* Content - uses CSS Grid for predictable sizing */}
      <div className="min-w-0 space-y-1.5">
        {/* Message - allowed to wrap naturally */}
        <p className="break-words text-sm font-medium leading-snug">
          {log.message}
        </p>

        {/* Details row */}
        {log.details && (
          <p className="break-words text-xs text-muted-foreground">
            {log.details}
          </p>
        )}

        {/* Meta row: timestamp + badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatLogDate(log.timestamp)}
          </span>
          <Badge
            variant={log.type}
            className="px-1.5 py-0 text-[10px] uppercase tracking-wide"
          >
            {log.category}
          </Badge>
        </div>
      </div>
    </div>
  );
}

/**
 * ActivityLog Component
 * @param {Object} props - Component props
 * @param {Array} props.logs - Array of log entries
 * @param {number} props.maxHeight - Maximum height for scroll area
 * @param {boolean} props.showTitle - Whether to show the title
 * @param {string} props.className - Additional CSS classes
 */
export function ActivityLog({ logs = [], showTitle = true, className }) {
  return (
    <Card className={cn('grow overflow-hidden', className)}>
      {showTitle && (
        <CardHeader className="px-4 pb-3 pt-4 lg:px-6">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex grow flex-col px-4 pb-4 pt-0 lg:px-6 lg:pb-6">
        <ScrollArea className="h-[250px]">
          <div className="space-y-2 pr-3">
            {logs.length > 0 ? (
              logs.map((log) => <ActivityLogItem key={log.id} log={log} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
