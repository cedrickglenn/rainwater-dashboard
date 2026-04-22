/**
 * WeatherStrip — compact one-row weather display for the homepage.
 *
 * Replaces the full WeatherWidget card with a single horizontal strip:
 *   [icon] [temp] [label] · humidity · wind · rain-outlook
 *
 * On mobile it wraps naturally. Not rendered as a <Card> — it's a lightweight
 * strip under the trend charts, not a primary content block.
 */

import { cn } from '~/lib/utils';

function RainOutlook({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  // Look at the next 24 hours using today's max-precip-probability as a proxy.
  const today = forecast[0];
  const chance = today?.rainChance ?? 0;

  if (chance >= 60) {
    return <span>Rain likely today</span>;
  }
  if (chance >= 30) {
    return <span>Chance of rain today</span>;
  }
  return <span>No rain expected today</span>;
}

export function WeatherStrip({ weather, className }) {
  if (!weather || !weather.current) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-card/60 px-4 py-3 text-sm text-muted-foreground',
          className
        )}
      >
        Weather unavailable
      </div>
    );
  }

  const { current, forecast } = weather;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <img
          src={`/weather-icons/${current.icon}.svg`}
          alt=""
          className="h-10 w-10 flex-shrink-0"
        />
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xl font-semibold tabular-nums">
            {current.temp}°
          </span>
          <span className="text-sm text-muted-foreground">{current.label}</span>
        </div>
      </div>

      <span className="text-muted-foreground/30">·</span>

      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Humidity</span>
        <span className="font-mono font-semibold">{current.humidity}%</span>
      </div>

      <span className="text-muted-foreground/30">·</span>

      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Wind</span>
        <span className="font-mono font-semibold">{current.wind} km/h</span>
      </div>

      <span className="text-muted-foreground/30">·</span>

      <div className="text-xs text-muted-foreground">
        <RainOutlook forecast={forecast} />
      </div>
    </div>
  );
}
