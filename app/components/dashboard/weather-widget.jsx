/**
 * WeatherWidget
 * Displays current conditions and 3-day forecast for Davao City.
 * Guest-visible — no auth required.
 * Data sourced from Open-Meteo (no API key).
 * Icons: Meteocons fill SVGs from /weather-icons/*.svg
 */

import { cn } from '~/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tooltip, TooltipTrigger, TooltipContent } from '~/components/ui/tooltip';
import {
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  CloudOff,
  CloudRain,
  ExternalLink,
} from 'lucide-react';

// Meteocons SVG served from /public/weather-icons/
function WeatherIcon({ name, className, alt = '' }) {
  return (
    <img
      src={`/weather-icons/${name}.svg`}
      alt={alt}
      className={cn('shrink-0', className)}
      draggable={false}
    />
  );
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

// Format "2026-04-13T05:30" → "5:30 AM"
function formatTime(isoLocal) {
  if (!isoLocal) return '';
  const [, time] = isoLocal.split('T');
  const [h, m]   = time.split(':').map(Number);
  const period   = h >= 12 ? 'PM' : 'AM';
  const hour     = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
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
                alt={current.label}
                className="h-16 w-16"
              />
              <div>
                <p className="text-4xl font-bold leading-none">{current.temp}°C</p>
                <p className="mt-1 text-sm text-muted-foreground">{current.label}</p>
              </div>
            </div>

            {/* Detail stats */}
            <div className="space-y-1.5 text-right text-xs text-muted-foreground">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="flex cursor-default items-center justify-end gap-1.5">
                    <Thermometer className="h-3.5 w-3.5 shrink-0" />
                    Feels {current.feelsLike}°C
                  </p>
                </TooltipTrigger>
                <TooltipContent side="left">Apparent (feels-like) temperature</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="flex cursor-default items-center justify-end gap-1.5">
                    <Droplets className="h-3.5 w-3.5 shrink-0" />
                    {current.humidity}% humidity
                  </p>
                </TooltipTrigger>
                <TooltipContent side="left">Relative humidity</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="flex cursor-default items-center justify-end gap-1.5">
                    <Wind className="h-3.5 w-3.5 shrink-0" />
                    {current.wind} km/h
                  </p>
                </TooltipTrigger>
                <TooltipContent side="left">Wind speed at 10 m</TooltipContent>
              </Tooltip>

              {current.sunrise && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="flex cursor-default items-center justify-end gap-1.5">
                      <img src="/weather-icons/clear-day.svg" alt="" className="h-3.5 w-3.5 shrink-0" />
                      {formatTime(current.sunrise)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="left">Sunrise</TooltipContent>
                </Tooltip>
              )}

              {current.sunset && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="flex cursor-default items-center justify-end gap-1.5">
                      <img src="/weather-icons/clear-night.svg" alt="" className="h-3.5 w-3.5 shrink-0" />
                      {formatTime(current.sunset)}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="left">Sunset</TooltipContent>
                </Tooltip>
              )}

              {current.rainMm > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="flex cursor-default items-center justify-end gap-1.5 text-blue-500 dark:text-blue-400">
                      <CloudRain className="h-3.5 w-3.5 shrink-0" />
                      {current.rainMm} mm now
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="left">Current precipitation</TooltipContent>
                </Tooltip>
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

        {/* Hourly forecast — next N hours */}
        {hourly.length > 0 && (
          <div className="border-t pt-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Next {hourly.length} hours
            </p>
            {/* sm–md: grid fills width. lg–xl: scroll (card too narrow for 12 cols). xl+: grid again. */}
            <div
              className="grid overflow-x-auto pb-1 scrollbar-none"
              style={{ gridTemplateColumns: `repeat(${hourly.length}, minmax(3rem, 1fr))` }}
            >
              {hourly.map((h) => {
                const d = new Date(h.time + ':00+08:00');
                const hourLabel = d.toLocaleTimeString('en-PH', { hour: 'numeric', hour12: true });
                const [num, period] = hourLabel.split(' ');
                return (
                  <div
                    key={h.time}
                    className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-center hover:bg-muted/50"
                  >
                    <p className="text-[10px] leading-tight text-muted-foreground">{num}</p>
                    <p className="text-[9px] leading-none text-muted-foreground/70">{period}</p>
                    <WeatherIcon name={h.icon} alt={h.label} className="mt-0.5 h-8 w-8" />
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
                <WeatherIcon name={day.icon} alt={day.label} className="h-9 w-9" />
                <p className="text-xs font-semibold">
                  {day.tempMax}°{' '}
                  <span className="font-normal text-muted-foreground">{day.tempMin}°</span>
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
