/**
 * Settings Page — admin-only hub for system configuration and hardware controls.
 *
 * Tabs (in order):
 *   1. Actuators    — pump/valve control (operator+)
 *   2. Calibration  — sensor calibration (admin)
 *   3. First Flush  — flow threshold + duration, MQTT to Mega
 *   4. Users        — user management + change password
 *   5. Notifications — push notifications only
 *
 * The `?tab=` search param deep-links into a specific tab — used by the
 * /actuators and /calibration routes that redirect here.
 */

import { json } from '@remix-run/node';
import { useLoaderData, useFetcher, useRouteLoaderData, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
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
  Bell,
  Save,
  UserPlus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Droplets,
  Users,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  FlaskConical,
} from 'lucide-react';

import { ActuatorsPanel } from '~/components/actuators-panel';
import { CalibrationPanel } from '~/components/calibration-panel';

export const meta = () => [
  { title: 'Settings | RainSense' },
  { name: 'description', content: 'Configure your monitoring system' },
];

const STALE_PENDING_MS = 5000;

export const loader = async ({ request }) => {
  const { requireAdmin, listUsers, getUser } = await import('~/lib/auth.server');
  await requireAdmin(request);
  const { getDb } = await import('~/lib/db.server');
  const db = await getDb();

  const [users, currentUser, ffConfigDoc, actuatorDocs, latestSensor] = await Promise.all([
    listUsers(),
    getUser(request),
    db.collection('system_config').findOne({ key: 'first_flush' }),
    db.collection('actuator_states').find({}).toArray(),
    db.collection('sensor_readings').findOne({}, { sort: { timestamp: -1 } }),
  ]);

  const ffConfig = {
    threshold: ffConfigDoc?.threshold ?? 0.5,
    durationMin: ffConfigDoc?.durationMs != null ? ffConfigDoc.durationMs / 60000 : 5,
  };

  const now = Date.now();
  const persisted = Object.fromEntries(
    actuatorDocs.map((d) => {
      const isStale =
        !d.confirmed &&
        d.updatedAt &&
        now - new Date(d.updatedAt).getTime() > STALE_PENDING_MS;
      const confirmed = isStale ? true : (d.confirmed ?? true);
      return [d.actuatorId, { on: d.state === 'ON', confirmed }];
    })
  );

  return json({
    users,
    currentUser,
    ffConfig,
    persisted,
    filterMode:    latestSensor?.filter_mode    ?? 0,
    backwashState: latestSensor?.backwash_state ?? 0,
  });
};

export const action = async ({ request }) => {
  const { requireAdmin, getUser, createUser, updateUserRole, deleteUser, changePassword } =
    await import('~/lib/auth.server');
  await requireAdmin(request);

  const formData    = await request.formData();
  const intent      = formData.get('intent');
  const currentUser = await getUser(request);

  if (intent === 'create_user') {
    const result = await createUser({
      username:  formData.get('username'),
      password:  formData.get('password'),
      role:      formData.get('role'),
      createdBy: currentUser.username,
    });
    return json(result.error ? { error: result.error } : { ok: true, message: 'User created' });
  }

  if (intent === 'update_role') {
    const result = await updateUserRole({
      username:       formData.get('username'),
      role:           formData.get('role'),
      requestingUser: currentUser.username,
    });
    return json(result.error ? { error: result.error } : { ok: true });
  }

  if (intent === 'delete_user') {
    const result = await deleteUser({
      username:       formData.get('username'),
      requestingUser: currentUser.username,
    });
    return json(result.error ? { error: result.error } : { ok: true });
  }

  if (intent === 'change_password') {
    const result = await changePassword({
      username:        currentUser.username,
      currentPassword: formData.get('currentPassword'),
      newPassword:     formData.get('newPassword'),
    });
    return json(result.error ? { error: result.error } : { ok: true, message: 'Password updated' });
  }

  if (intent === 'ff_config') {
    const threshold   = parseFloat(formData.get('threshold'));
    const durationMin = parseFloat(formData.get('durationMin'));
    const durationMs  = Math.round(durationMin * 60000);
    const { getDb } = await import('~/lib/db.server');
    const { mqttPublish } = await import('~/lib/mqtt.server');
    const db = await getDb();
    await db.collection('system_config').updateOne(
      { key: 'first_flush' },
      { $set: { key: 'first_flush', threshold, durationMs, updatedAt: new Date() } },
      { upsert: true }
    );
    await mqttPublish('rainwater/commands', `C,FF_CONFIG,THRESHOLD,${threshold.toFixed(2)}`);
    await mqttPublish('rainwater/commands', `C,FF_CONFIG,DURATION,${durationMs}`);
    return json({ ok: true, message: 'First flush configuration updated' });
  }

  return json({ ok: true });
};

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

function UserManagement() {
  const { users, currentUser } = useLoaderData();
  const fetcher = useFetcher();
  const [showAdd, setShowAdd] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  const isLoading = fetcher.state !== 'idle';
  const result    = fetcher.data;

  return (
    <SettingsSection icon={Users} title="User Management" description="Manage who can access this dashboard">
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.username} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {u.username}
                  {u.username === currentUser.username && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {u.lastLoginAt ? `Last login: ${new Date(u.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="update_role" />
                <input type="hidden" name="username" value={u.username} />
                <Select
                  defaultValue={u.role}
                  disabled={u.username === currentUser.username || isLoading}
                  onValueChange={(role) => {
                    const fd = new FormData();
                    fd.append('intent', 'update_role');
                    fd.append('username', u.username);
                    fd.append('role', role);
                    fetcher.submit(fd, { method: 'post' });
                  }}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </fetcher.Form>

              {u.username !== currentUser.username && (
                <fetcher.Form method="post" onSubmit={(e) => {
                  if (!confirm(`Delete user "${u.username}"?`)) e.preventDefault();
                }}>
                  <input type="hidden" name="intent" value="delete_user" />
                  <input type="hidden" name="username" value={u.username} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete user</TooltipContent>
                  </Tooltip>
                </fetcher.Form>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAdd ? (
        <fetcher.Form method="post" className="space-y-3 rounded-lg border p-4"
          onSubmit={() => { setShowAdd(false); setNewPassword(''); }}>
          <input type="hidden" name="intent" value="create_user" />
          <p className="text-sm font-medium">New User</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="username" placeholder="Username" required />
            <div className="relative">
              <Input
                name="password"
                type={showNewPw ? 'text' : 'password'}
                placeholder="Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowNewPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Select name="role" defaultValue="viewer">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {result?.error && <p className="text-xs text-destructive">{result.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isLoading}>Create</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </fetcher.Form>
      ) : (
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      )}
    </SettingsSection>
  );
}

function ChangePassword() {
  const { currentUser } = useLoaderData();
  const fetcher  = useFetcher();
  const [showPw, setShowPw] = useState({ current: false, new: false });
  const isLoading = fetcher.state !== 'idle';
  const result    = fetcher.data;

  return (
    <SettingsSection icon={KeyRound} title="Change Password" description={`Update password for ${currentUser.username}`}>
      <fetcher.Form method="post" className="space-y-3 max-w-sm">
        <input type="hidden" name="intent" value="change_password" />
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <div className="relative">
            <Input id="currentPassword" name="currentPassword"
              type={showPw.current ? 'text' : 'password'} required />
            <button type="button" onClick={() => setShowPw(v => ({ ...v, current: !v.current }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New Password</Label>
          <div className="relative">
            <Input id="newPassword" name="newPassword"
              type={showPw.new ? 'text' : 'password'} required minLength={8} />
            <button type="button" onClick={() => setShowPw(v => ({ ...v, new: !v.new }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {result?.error   && <p className="text-xs text-destructive">{result.error}</p>}
        {result?.message && <p className="text-xs text-[color:var(--water-safe)]">{result.message}</p>}
        <Button type="submit" size="sm" disabled={isLoading}>
          <KeyRound className="mr-2 h-4 w-4" />
          Update Password
        </Button>
      </fetcher.Form>
    </SettingsSection>
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function PushNotificationToggle() {
  const root = useRouteLoaderData('root');
  const vapidPublicKey = root?.vapidPublicKey ?? null;

  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription()
    ).then((sub) => {
      setStatus(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => setStatus('unsubscribed'));
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidPublicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setStatus('denied'); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
      if (res.ok) setStatus('subscribed');
    } catch (err) {
      console.error('[push] subscribe error:', err);
    } finally {
      setBusy(false);
    }
  }, [vapidPublicKey]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('unsubscribed');
    } catch (err) {
      console.error('[push] unsubscribe error:', err);
    } finally {
      setBusy(false);
    }
  }, []);

  if (status === 'unsupported' || !vapidPublicKey) {
    return (
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Push Notifications</Label>
          <p className="text-xs text-muted-foreground">Not supported in this browser</p>
        </div>
        <Switch disabled checked={false} />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Push Notifications</Label>
          <p className="text-xs text-destructive">
            Blocked by browser — reset permission in site settings to re-enable
          </p>
        </div>
        <Switch disabled checked={false} />
      </div>
    );
  }

  const isSubscribed = status === 'subscribed';

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">Push Notifications</Label>
        <p className="text-xs text-muted-foreground">
          {isSubscribed
            ? 'Enabled on this device — alerts and warnings will be pushed'
            : 'Receive warnings, errors, and process completions on this device'}
        </p>
      </div>
      <Switch
        checked={isSubscribed}
        disabled={busy || status === 'loading'}
        onCheckedChange={(checked) => (checked ? subscribe() : unsubscribe())}
      />
    </div>
  );
}

const VALID_TABS = ['actuators', 'calibration', 'first_flush', 'users', 'notifications'];

const TABS = [
  { value: 'actuators',     label: 'Actuators',     Icon: SlidersHorizontal },
  { value: 'calibration',   label: 'Calibration',   Icon: FlaskConical },
  { value: 'first_flush',   label: 'First Flush',   Icon: Droplets },
  { value: 'users',         label: 'Users',         Icon: Users },
  { value: 'notifications', label: 'Notifications', Icon: Bell },
];

export default function SettingsPage() {
  const { ffConfig, persisted, filterMode, backwashState } = useLoaderData();
  const ffFetcher = useFetcher();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'actuators';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [ffThreshold, setFfThreshold]     = useState(ffConfig.threshold);
  const [ffDurationMin, setFfDurationMin] = useState(ffConfig.durationMin);

  // Keep `?tab=...` in sync with the active tab without adding history entries.
  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Hardware controls, calibration, and user management.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Mobile: Select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent>
              {TABS.map(({ value, label, Icon }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tab list */}
        <TabsList className="hidden w-full grid-cols-5 sm:grid">
          {TABS.map(({ value, label, Icon }) => (
            <TabsTrigger key={value} value={value} className="gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="actuators" className="space-y-6">
          <ActuatorsPanel
            persisted={persisted}
            filterMode={filterMode}
            backwashState={backwashState}
          />
        </TabsContent>

        <TabsContent value="calibration" className="space-y-6">
          <CalibrationPanel />
        </TabsContent>

        <TabsContent value="first_flush" className="space-y-6">
          <SettingsSection
            icon={Droplets}
            title="First Flush Configuration"
            description="Tune the automatic rain diverter thresholds. Changes are sent live to the Arduino — no reflash needed."
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Flow Trigger Threshold</Label>
                  <p className="text-xs text-muted-foreground">
                    Minimum flow rate before rain is confirmed. Lower = more sensitive.
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {ffThreshold.toFixed(1)} L/min
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={5.0}
                step={0.1}
                value={ffThreshold}
                onChange={(e) => setFfThreshold(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.2 L/min (sensitive)</span>
                <span>5.0 L/min (conservative)</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Flush Duration</Label>
                  <p className="text-xs text-muted-foreground">
                    How long to divert rainwater to drainage before collecting. Longer = cleaner water.
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {ffDurationMin} min
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={ffDurationMin}
                onChange={(e) => setFfDurationMin(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 min (quick)</span>
                <span>15 min (thorough)</span>
              </div>
            </div>

            {ffFetcher.data?.ok && (
              <div className="flex items-center gap-2 rounded-lg bg-[color:var(--water-safe)]/10 px-3 py-2 text-sm text-[color:var(--water-safe)]">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>First flush configuration updated and sent to device.</span>
              </div>
            )}
            {ffFetcher.data?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-[color:var(--water-unsafe)]/10 px-3 py-2 text-sm text-[color:var(--water-unsafe)]">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{ffFetcher.data.error}</span>
              </div>
            )}
          </SettingsSection>

          <div className="flex justify-end">
            <Button
              onClick={() =>
                ffFetcher.submit(
                  { intent: 'ff_config', threshold: String(ffThreshold), durationMin: String(ffDurationMin) },
                  { method: 'post' }
                )
              }
              disabled={ffFetcher.state === 'submitting'}
            >
              <Save className="mr-2 h-4 w-4" />
              {ffFetcher.state === 'submitting' ? 'Applying…' : 'Apply & Send to Device'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
          <ChangePassword />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <SettingsSection
            icon={Bell}
            title="Notification Preferences"
            description="Push notifications delivered to this device for warnings, errors, and process completions."
          >
            <PushNotificationToggle />
          </SettingsSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
