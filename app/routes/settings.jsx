/**
 * Settings Page
 * System configuration and preferences
 */

import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Settings,
  Bell,
  Gauge,
  Palette,
  Database,
  Shield,
  Save,
  RotateCcw,
  Mail,
  Smartphone,
  MessageSquare,
  Sun,
  Moon,
  Monitor,
  Clock,
  HardDrive,
  Wifi,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// Data
import { defaultSettings, systemStatus } from '~/data/mock-data';
import { SENSOR_THRESHOLDS } from '~/lib/water-quality';
import { formatDate } from '~/lib/date-utils';

/**
 * Meta function for SEO
 */
export const meta = () => {
  return [
    { title: 'Settings | RainWater Monitoring System' },
    { name: 'description', content: 'Configure your monitoring system' },
  ];
};

/**
 * Loader function
 */
export const loader = async () => {
  return json({
    settings: defaultSettings,
    system: systemStatus,
  });
};

/**
 * Action function for form submissions
 */
export const action = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get('intent');

  // In production, save settings to database
  // For now, just return success
  return json({ success: true, message: `${intent} updated successfully` });
};

/**
 * Settings section component
 */
function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/**
 * Settings toggle row
 */
function SettingToggle({ id, label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

/**
 * Settings Page Component
 */
export default function SettingsPage() {
  const { settings, system } = useLoaderData();
  const fetcher = useFetcher();

  // Local state for settings
  const [notifications, setNotifications] = useState(settings.notifications);
  const [display, setDisplay] = useState(settings.display);
  const [systemControls, setSystemControls] = useState(settings.systemControls);
  const [dataLogging, setDataLogging] = useState(settings.dataLogging);
  const [calibration, setCalibration] = useState(settings.sensorCalibration);

  // Handle notification toggle
  const handleNotificationChange = (key, value) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  // Handle display change
  const handleDisplayChange = (key, value) => {
    setDisplay((prev) => ({ ...prev, [key]: value }));
  };

  // Handle system controls change
  const handleSystemControlChange = (key, value) => {
    setSystemControls((prev) => ({ ...prev, [key]: value }));
  };

  // Handle data logging change
  const handleDataLoggingChange = (key, value) => {
    setDataLogging((prev) => ({ ...prev, [key]: value }));
  };

  // Handle calibration change
  const handleCalibrationChange = (key, value) => {
    setCalibration((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  // Save settings
  const handleSave = (section) => {
    fetcher.submit({ intent: section }, { method: 'post' });
  };

  const isLoading = fetcher.state === 'submitting';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your rainwater monitoring system preferences.
        </p>
      </div>

      {/* System status banner */}
      <Card
        className={cn(
          'border-2',
          system.systemHealth === 'good'
            ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
            : 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/20'
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {system.systemHealth === 'good' ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <AlertCircle className="h-8 w-8 text-amber-500" />
              )}
              <div>
                <p className="font-medium">System Status: {system.systemHealth === 'good' ? 'Operational' : 'Needs Attention'}</p>
                <p className="text-sm text-muted-foreground">
                  Last maintenance: {formatDate(system.lastMaintenance)} • Next maintenance: {formatDate(system.nextMaintenance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
              <Badge variant="outline" className="gap-1">
                <HardDrive className="h-3 w-3" />
                Tank {system.tankLevel}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings tabs */}
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </TabsTrigger>
          <TabsTrigger value="sensors" className="gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">Sensors</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <SettingsSection
            icon={Bell}
            title="Notification Preferences"
            description="Choose how you want to receive alerts and updates"
          >
            <SettingToggle
              id="emailAlerts"
              label="Email Alerts"
              description="Receive alerts via email"
              checked={notifications.emailAlerts}
              onCheckedChange={(checked) =>
                handleNotificationChange('emailAlerts', checked)
              }
            />
            <Separator />
            <SettingToggle
              id="pushNotifications"
              label="Push Notifications"
              description="Browser push notifications"
              checked={notifications.pushNotifications}
              onCheckedChange={(checked) =>
                handleNotificationChange('pushNotifications', checked)
              }
            />
            <Separator />
            <SettingToggle
              id="smsAlerts"
              label="SMS Alerts"
              description="Receive critical alerts via SMS"
              checked={notifications.smsAlerts}
              onCheckedChange={(checked) =>
                handleNotificationChange('smsAlerts', checked)
              }
            />
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Alert Threshold</Label>
                <p className="text-xs text-muted-foreground">
                  When to trigger notifications
                </p>
              </div>
              <Select
                value={notifications.alertThreshold}
                onValueChange={(value) =>
                  handleNotificationChange('alertThreshold', value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('notifications')} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Notifications
            </Button>
          </div>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-6">
          <SettingsSection
            icon={Palette}
            title="Display Preferences"
            description="Customize the dashboard appearance"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred color scheme
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={display.theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDisplayChange('theme', 'light')}
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </Button>
                <Button
                  variant={display.theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDisplayChange('theme', 'dark')}
                >
                  <Moon className="h-4 w-4 mr-1" />
                  Dark
                </Button>
                <Button
                  variant={display.theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDisplayChange('theme', 'system')}
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  System
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Chart Refresh Rate</Label>
                <p className="text-xs text-muted-foreground">
                  How often to update charts
                </p>
              </div>
              <Select
                value={String(display.chartRefreshRate)}
                onValueChange={(value) =>
                  handleDisplayChange('chartRefreshRate', parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Temperature Unit</Label>
                <p className="text-xs text-muted-foreground">
                  Display temperature in
                </p>
              </div>
              <Select
                value={display.temperatureUnit}
                onValueChange={(value) =>
                  handleDisplayChange('temperatureUnit', value)
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celsius">Celsius (°C)</SelectItem>
                  <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingsSection>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('display')} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Display
            </Button>
          </div>
        </TabsContent>

        {/* Sensors Tab */}
        <TabsContent value="sensors" className="space-y-6">
          <SettingsSection
            icon={Gauge}
            title="Sensor Calibration"
            description="Adjust sensor offsets for accurate readings"
          >
            {Object.entries(SENSOR_THRESHOLDS).map(([key, threshold]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{threshold.name}</Label>
                    <p className="text-xs text-muted-foreground">
                      Offset adjustment ({threshold.unit})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={calibration[`${key}Offset`] || 0}
                      onChange={(e) =>
                        handleCalibrationChange(`${key}Offset`, e.target.value)
                      }
                      className="w-20 rounded-md border bg-background px-3 py-1 text-sm"
                    />
                  </div>
                </div>
                <Separator />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-4">
              Note: Calibration changes will be applied to all new readings.
              Consult your sensor documentation for proper calibration procedures.
            </p>
          </SettingsSection>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCalibration(settings.sensorCalibration)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={() => handleSave('calibration')} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Calibration
            </Button>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <SettingsSection
            icon={Settings}
            title="System Controls"
            description="Configure automatic system behaviors"
          >
            <SettingToggle
              id="autoFilterBackwash"
              label="Auto Filter Backwash"
              description="Automatically clean filter at scheduled intervals"
              checked={systemControls.autoFilterBackwash}
              onCheckedChange={(checked) =>
                handleSystemControlChange('autoFilterBackwash', checked)
              }
            />
            <Separator />
            <SettingToggle
              id="uvScheduleEnabled"
              label="UV Schedule"
              description="Run UV sterilization on a schedule"
              checked={systemControls.uvScheduleEnabled}
              onCheckedChange={(checked) =>
                handleSystemControlChange('uvScheduleEnabled', checked)
              }
            />
            {systemControls.uvScheduleEnabled && (
              <div className="ml-4 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Label>Start:</Label>
                  <input
                    type="time"
                    value={systemControls.uvScheduleStart}
                    onChange={(e) =>
                      handleSystemControlChange('uvScheduleStart', e.target.value)
                    }
                    className="rounded-md border bg-background px-2 py-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>End:</Label>
                  <input
                    type="time"
                    value={systemControls.uvScheduleEnd}
                    onChange={(e) =>
                      handleSystemControlChange('uvScheduleEnd', e.target.value)
                    }
                    className="rounded-md border bg-background px-2 py-1"
                  />
                </div>
              </div>
            )}
            <Separator />
            <SettingToggle
              id="autoAlerts"
              label="Automatic Alerts"
              description="System generates alerts automatically"
              checked={systemControls.autoAlerts}
              onCheckedChange={(checked) =>
                handleSystemControlChange('autoAlerts', checked)
              }
            />
          </SettingsSection>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('system')} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save System
            </Button>
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-6">
          <SettingsSection
            icon={Database}
            title="Data Logging"
            description="Configure how sensor data is stored"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Log Interval</Label>
                <p className="text-xs text-muted-foreground">
                  How often to record readings
                </p>
              </div>
              <Select
                value={String(dataLogging.logInterval)}
                onValueChange={(value) =>
                  handleDataLoggingChange('logInterval', parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Data Retention</Label>
                <p className="text-xs text-muted-foreground">
                  How long to keep historical data
                </p>
              </div>
              <Select
                value={String(dataLogging.retentionPeriod)}
                onValueChange={(value) =>
                  handleDataLoggingChange('retentionPeriod', parseInt(value))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <SettingToggle
              id="autoExport"
              label="Automatic Export"
              description="Export data automatically at the end of each day"
              checked={dataLogging.autoExport}
              onCheckedChange={(checked) =>
                handleDataLoggingChange('autoExport', checked)
              }
            />
            {dataLogging.autoExport && (
              <div className="ml-4 flex items-center gap-2">
                <Label>Format:</Label>
                <Select
                  value={dataLogging.exportFormat}
                  onValueChange={(value) =>
                    handleDataLoggingChange('exportFormat', value)
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </SettingsSection>

          <div className="flex justify-end">
            <Button onClick={() => handleSave('data')} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Data Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
