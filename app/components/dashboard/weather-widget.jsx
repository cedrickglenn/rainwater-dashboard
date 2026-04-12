/**
 * WeatherWidget
 * Displays current conditions and 3-day forecast for Davao City.
 * Guest-visible — no auth required.
 * Data sourced from Open-Meteo (no API key).
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  CloudSnow,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  CloudOff,
  ExternalLink,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Icon resolver — matches icon names returned by weather.server.js
// ---------------------------------------------------------------------------
const ICON_MAP = {
  Sun:            Sun,
  CloudSun:       CloudSun,
  Cloud:          Cloud,
  CloudRain:      CloudRain,
  CloudDrizzle:   CloudDrizzle,
  CloudLightning: CloudLightning,
  CloudFog:       CloudFog,
  CloudSnow:      CloudSnow,
};

function WeatherIcon({ name, className }) {
  const Icon = ICON_MAP[name] ?? Cloud;
  return <Icon className={className} />;
}

// Rain-chance color
function rainColor(chance) {
  if (chance >= 70) return 'text-blue-600 dark:text-blue-400';
  if (chance >= 40) return 'text-sky-500 dark:text-sky-400';
  return 'text-muted-foreground';
}

// Day label from ISO date string
function dayLabel(dateStr, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeatherWidget({ weather, className }) {
  if (!weather || weather.error) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center px-4 pb-4">
          <p className="text-center text-sm text-muted-foreground">
            {weather?.error ?? 'Weather data unavailable'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { current, forecast, hourly = [], fetchedAt } = weather;

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            Davao City
          </span>
          <div className="flex items-center gap-2">
            {fetchedAt && (
              <span className="text-[10px] font-normal text-muted-foreground">
                Updated {new Date(fetchedAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground hover:text-foreground"
            >
              Open-Meteo <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 px-4 pb-4">
        {/* Current conditions */}
        {current && (
          <div className="flex items-center justify-between gap-3">
            {/* Temp + icon */}
            <div className="flex items-center gap-3">
              <WeatherIcon
                name={current.icon}
                className="h-12 w-12 text-amber-400 dark:text-amber-300"
              />
              <div>
                <p className="text-4xl font-bold leading-none">{current.temp}°C</p>
                <p className="mt-1 text-sm text-muted-foreground">{current.label}</p>
              </div>
            </div>

            {/* Detail stats */}
            <div className="space-y-1 text-right text-xs text-muted-foreground">
              <p className="flex items-center justify-end gap-1">
                <Thermometer className="h-3 w-3" />
                Feels {current.feelsLike}°C
              </p>
              <p className="flex items-center justify-end gap-1">
                <Droplets className="h-3 w-3" />
                {current.humidity}% humidity
              </p>
              <p className="flex items-center justify-end gap-1">
                <Wind className="h-3 w-3" />
                {current.wind} km/h
              </p>
              {current.rainMm > 0 && (
                <p className="flex items-center justify-end gap-1 text-blue-500 dark:text-blue-400">
                  <CloudRain className="h-3 w-3" />
                  {current.rainMm} mm now
                </p>
              )}
            </div>
          </div>
        )}

        {/* Rain relevance note */}
        {current && forecast[0]?.rainChance >= 50 && (
          <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <CloudRain className="h-3.5 w-3.5 shrink-0" />
            {forecast[0].rainChance}% chance of rain today — good collection conditions.
          </div>
        )}

        {/* Hourly forecast — next 6 hours */}
        {hourly.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Next {hourly.length} hours
            </p>
            <div className="grid pb-1" style={{ gridTemplateColumns: `repeat(${hourly.length}, 1fr)` }}>
              {hourly.map((h) => {
                const timeLabel = new Date(h.time + ':00+08:00').toLocaleTimeString('en-PH', {
                  hour: 'numeric',
                  hour12: true,
                });
                return (
                  <div
                    key={h.time}
                    className="flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center hover:bg-muted/50 min-w-0"
                  >
                    <p className="text-[10px] text-muted-foreground">{timeLabel}</p>
                    <WeatherIcon name={h.icon} className="h-4 w-4 text-amber-400 dark:text-amber-300" />
                    <p className="text-xs font-semibold">{h.temp}°</p>
                    {h.rainChance != null && h.rainChance > 0 && (
                      <p className={cn('text-[9px] font-medium', rainColor(h.rainChance))}>
                        {h.rainChance}%
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3-day forecast */}
        {forecast.length > 0 && (
          <div className="grid grid-cols-3 gap-2 border-t pt-3">
            {forecast.map((day, i) => (
              <div key={day.date} className="flex flex-col items-center gap-1 text-center">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {dayLabel(day.date, i)}
                </p>
                <WeatherIcon
                  name={day.icon}
                  className="h-5 w-5 text-amber-400 dark:text-amber-300"
                />
                <p className="text-xs font-semibold">
                  {day.tempMax}° <span className="font-normal text-muted-foreground">{day.tempMin}°</span>
                </p>
                {day.rainChance != null && (
                  <p className={cn('text-[10px] font-medium', rainColor(day.rainChance))}>
                    {day.rainChance}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
