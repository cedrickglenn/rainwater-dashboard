/**
 * SystemControls Component
 * Control panel for system components (filter, UV, pump)
 */

import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import {
  Filter,
  Sun,
  Zap,
  Settings2,
  Power,
} from 'lucide-react';

/**
 * Control item configuration
 */
const CONTROLS = [
  {
    id: 'filter',
    name: 'Filtration System',
    description: 'Multi-stage water filter',
    icon: Filter,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/50',
  },
  {
    id: 'uv',
    name: 'UV Sterilization',
    description: 'Ultraviolet water treatment',
    icon: Sun,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/50',
  },
  {
    id: 'pump',
    name: 'Water Pump',
    description: 'Main circulation pump',
    icon: Zap,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/50',
  },
];

/**
 * SystemControls Component
 * @param {Object} props - Component props
 * @param {Object} props.initialStatus - Initial status of controls
 * @param {function} props.onControlChange - Callback when control changes
 * @param {string} props.className - Additional CSS classes
 */
export function SystemControls({
  initialStatus = {},
  onControlChange,
  className,
}) {
  // State for each control
  const [controlStates, setControlStates] = useState({
    filter: initialStatus.filterStatus ?? true,
    uv: initialStatus.uvStatus ?? true,
    pump: initialStatus.pumpStatus ?? true,
  });

  /**
   * Handle toggle change
   * @param {string} controlId - ID of the control to toggle
   */
  const handleToggle = (controlId) => {
    const newState = !controlStates[controlId];
    setControlStates((prev) => ({
      ...prev,
      [controlId]: newState,
    }));

    // Call parent callback if provided
    if (onControlChange) {
      onControlChange(controlId, newState);
    }
  };

  // Count active controls
  const activeCount = Object.values(controlStates).filter(Boolean).length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="h-5 w-5 text-primary" />
            System Controls
          </CardTitle>
          <Badge variant="outline" className="font-normal">
            <Power className="mr-1 h-3 w-3" />
            {activeCount}/{CONTROLS.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {CONTROLS.map((control) => {
          const Icon = control.icon;
          const isActive = controlStates[control.id];

          return (
            <div
              key={control.id}
              className={cn(
                'flex items-center justify-between rounded-lg border p-3 sm:p-4 transition-all',
                isActive
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-muted/30'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', control.bgColor)}>
                  <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', control.color)} />
                </div>
                <div>
                  <Label
                    htmlFor={control.id}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {control.name}
                  </Label>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {control.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {isActive ? 'ON' : 'OFF'}
                </span>
                <Switch
                  id={control.id}
                  checked={isActive}
                  onCheckedChange={() => handleToggle(control.id)}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
