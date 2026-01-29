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
 * Individual log entry
 */
function ActivityLogItem({ log }) {
  const Icon = LOG_ICONS[log.type] || Info;
  const styles = LOG_STYLES[log.type] || LOG_STYLES.info;

  return (
    <div
      className={cn(
        'flex gap-3 rounded-r-lg border-l-4 p-3 transition-colors hover:bg-muted/50',
        styles.border
      )}
    >
      {/* Icon */}
      <div className={cn('rounded-full p-1.5', styles.bg)}>
        <Icon className={cn('h-4 w-4', styles.icon)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-none truncate">
            {log.message}
          </p>
          <Badge
            variant={log.type}
            className="text-[10px] px-1.5 flex-shrink-0"
          >
            {log.category}
          </Badge>
        </div>
        {log.details && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {log.details}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatLogDate(log.timestamp)}
        </p>
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
export function ActivityLog({
  logs = [],
  maxHeight = 400,
  showTitle = true,
  className,
}) {
  return (
    <Card className={cn('', className)}>
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(showTitle ? '' : 'pt-6')}>
        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-2 pr-4">
            {logs.length > 0 ? (
              logs.map((log) => <ActivityLogItem key={log.id} log={log} />)
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
