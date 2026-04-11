import { json } from '@remix-run/node';
import { Form, Link, useActionData, useNavigation } from '@remix-run/react';
import { Droplets, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

export const meta = () => [{ title: 'Login | RainWater Dashboard' }];

export const loader = async ({ request }) => {
  const { requireGuest } = await import('~/lib/auth.server');
  await requireGuest(request);
  return null;
};

export const action = async ({ request }) => {
  const { login, createUserSession } = await import('~/lib/auth.server');
  const formData   = await request.formData();
  const username   = formData.get('username');
  const password   = formData.get('password');
  const redirectTo = formData.get('redirectTo') || '/';

  if (!username || !password) {
    return json({ error: 'Username and password are required' }, { status: 400 });
  }

  const user = await login({ username, password });
  if (!user) {
    return json({ error: 'Invalid username or password' }, { status: 401 });
  }

  return createUserSession(request, user, redirectTo);
};

export default function LoginPage() {
  const actionData  = useActionData();
  const navigation  = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [showPassword, setShowPassword] = useState(false);

  // Read redirectTo from URL
  const redirectTo = typeof window !== 'undefined'
    ? new URL(window.location.href).searchParams.get('redirectTo') || '/'
    : '/';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Droplets className="h-9 w-9" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">RainWater</h1>
            <p className="text-sm text-muted-foreground">Sign in to access admin controls</p>
          </div>
        </div>

        {/* Form */}
        <Form method="post" className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          {actionData?.error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {actionData.error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                className={cn(
                  'w-full rounded-xl border bg-background py-3 pl-10 pr-4 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  actionData?.error && 'border-destructive'
                )}
                placeholder="admin"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className={cn(
                  'w-full rounded-xl border bg-background py-3 pl-10 pr-10 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                  actionData?.error && 'border-destructive'
                )}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </Form>

        <p className="text-center text-xs text-muted-foreground">
          Guest access is available without signing in.
          <br />
          Admin login required for controls and settings.
        </p>

        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
