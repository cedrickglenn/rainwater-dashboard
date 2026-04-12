/**
 * weather.server.js
 * Fetches current weather and 3-day forecast for Davao City from Open-Meteo.
 * No API key required. Results are cached in memory for 15 minutes.
 *
 * Icons: Meteocons fill SVGs served from /weather-icons/*.svg
 * Open-Meteo docs: https://open-meteo.com/en/docs
 */

// Davao City, Philippines
const LAT = 7.0707;
const LON = 125.6087;
const TZ  = 'Asia/Manila';

const ENDPOINT =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,apparent_temperature,relative_humidity_2m,` +
  `precipitation,weather_code,wind_speed_10m` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,` +
  `precipitation_probability_max,precipitation_sum,sunrise,sunset` +
  `&hourly=temperature_2m,precipitation_probability,weather_code` +
  `&timezone=${encodeURIComponent(TZ)}` +
  `&forecast_days=3`;

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let _cache = { data: null, fetchedAt: 0 };

// ---------------------------------------------------------------------------
// WMO code → { label, dayIcon, nightIcon }
// Icon names map to /weather-icons/<name>.svg (Meteocons fill set)
// ---------------------------------------------------------------------------
const WMO = {
  0:  { label: 'Clear sky',       dayIcon: 'clear-day',                  nightIcon: 'clear-night'                },
  1:  { label: 'Mainly clear',    dayIcon: 'clear-day',                  nightIcon: 'clear-night'                },
  2:  { label: 'Partly cloudy',   dayIcon: 'partly-cloudy-day',          nightIcon: 'partly-cloudy-night'        },
  3:  { label: 'Overcast',        dayIcon: 'overcast-day',               nightIcon: 'overcast-night'             },
  45: { label: 'Foggy',           dayIcon: 'fog-day',                    nightIcon: 'fog-night'                  },
  48: { label: 'Icy fog',         dayIcon: 'fog-day',                    nightIcon: 'fog-night'                  },
  51: { label: 'Light drizzle',   dayIcon: 'partly-cloudy-day-drizzle',  nightIcon: 'partly-cloudy-night-drizzle'},
  53: { label: 'Drizzle',         dayIcon: 'drizzle',                    nightIcon: 'drizzle'                    },
  55: { label: 'Heavy drizzle',   dayIcon: 'drizzle',                    nightIcon: 'drizzle'                    },
  61: { label: 'Light rain',      dayIcon: 'partly-cloudy-day-rain',     nightIcon: 'partly-cloudy-night-rain'   },
  63: { label: 'Rain',            dayIcon: 'rain',                       nightIcon: 'rain'                       },
  65: { label: 'Heavy rain',      dayIcon: 'rain',                       nightIcon: 'rain'                       },
  80: { label: 'Rain showers',    dayIcon: 'partly-cloudy-day-rain',     nightIcon: 'partly-cloudy-night-rain'   },
  81: { label: 'Rain showers',    dayIcon: 'rain',                       nightIcon: 'rain'                       },
  82: { label: 'Heavy showers',   dayIcon: 'rain',                       nightIcon: 'rain'                       },
  95: { label: 'Thunderstorm',    dayIcon: 'thunderstorms-day-rain',     nightIcon: 'thunderstorms-night-rain'   },
  96: { label: 'Thunderstorm',    dayIcon: 'thunderstorms-day-rain',     nightIcon: 'thunderstorms-night-rain'   },
  99: { label: 'Thunderstorm',    dayIcon: 'thunderstorms-day-rain',     nightIcon: 'thunderstorms-night-rain'   },
};

function describeCode(code, isDay) {
  const entry = WMO[code] ?? { label: 'Unknown', dayIcon: 'not-available', nightIcon: 'not-available' };
  return {
    label: entry.label,
    icon:  isDay ? entry.dayIcon : entry.nightIcon,
  };
}

// ---------------------------------------------------------------------------
// isDay — compare a Manila timestamp string against today's sunrise/sunset
// sunrise/sunset come from the API as "YYYY-MM-DDTHH:MM" in Manila time
// ---------------------------------------------------------------------------
function buildIsDayFn(sunriseStr, sunsetStr) {
  // Parse "YYYY-MM-DDTHH:MM" as minutes-since-midnight for fast comparison
  const toMinutes = (s) => {
    const [, time] = s.split('T');
    const [h, m]   = time.split(':').map(Number);
    return h * 60 + m;
  };
  const rise = toMinutes(sunriseStr);
  const set  = toMinutes(sunsetStr);
  // Given a time string "YYYY-MM-DDTHH" return true if it's daytime
  return (timeStr) => {
    const hour = parseInt(timeStr.slice(11, 13), 10);
    const mins = hour * 60;
    return mins >= rise && mins < set;
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getWeather() {
  if (_cache.data && Date.now() - _cache.fetchedAt < CACHE_TTL) {
    return _cache.data;
  }

  try {
    const res = await fetch(ENDPOINT, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const raw = await res.json();

    const cur = raw.current;
    const day = raw.daily;
    const hr  = raw.hourly;

    // Today's sunrise/sunset from the API (index 0 = today)
    const todaySunrise = day.sunrise[0]; // e.g. "2026-04-13T05:30"
    const todaySunset  = day.sunset[0];  // e.g. "2026-04-13T17:46"
    const isDay = buildIsDayFn(todaySunrise, todaySunset);

    // Current conditions — use current Manila time for isDay
    const nowManilaStr = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 13); // "YYYY-MM-DDTHH"
    const curIsDay = isDay(nowManilaStr);

    // Hourly — next 12 hours
    const manilaHourStr = nowManilaStr;
    const startIdx = hr ? hr.time.findIndex((t) => t >= manilaHourStr) : -1;
    const hourly = (startIdx >= 0 ? hr.time.slice(startIdx, startIdx + 12) : []).map((time, i) => {
      const idx       = startIdx + i;
      const code      = hr.weather_code[idx];
      // For hours that spill into day 2/3, use that day's sunrise/sunset
      const dateStr   = time.slice(0, 10); // "YYYY-MM-DD"
      const dayIdx    = day.time.findIndex((d) => d === dateStr);
      const slotIsDay = dayIdx >= 0
        ? buildIsDayFn(day.sunrise[dayIdx], day.sunset[dayIdx])(time)
        : isDay(time);
      return {
        time,
        temp:       Math.round(hr.temperature_2m[idx]),
        rainChance: hr.precipitation_probability[idx],
        code,
        isDay:      slotIsDay,
        ...describeCode(code, slotIsDay),
      };
    });

    const data = {
      current: {
        temp:      Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity:  cur.relative_humidity_2m,
        wind:      Math.round(cur.wind_speed_10m),
        rainMm:    cur.precipitation,
        code:      cur.weather_code,
        isDay:     curIsDay,
        sunrise:   todaySunrise,
        sunset:    todaySunset,
        ...describeCode(cur.weather_code, curIsDay),
      },
      // Daily forecast always uses day icons (representative of the full day)
      forecast: day.time.map((date, i) => ({
        date,
        tempMax:    Math.round(day.temperature_2m_max[i]),
        tempMin:    Math.round(day.temperature_2m_min[i]),
        rainChance: day.precipitation_probability_max[i],
        rainMm:     day.precipitation_sum[i],
        code:       day.weather_code[i],
        ...describeCode(day.weather_code[i], true),
      })),
      hourly,
      fetchedAt: new Date().toISOString(),
      error: null,
    };

    _cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    return {
      current:   null,
      forecast:  [],
      hourly:    [],
      fetchedAt: null,
      error:     err.message ?? 'Weather unavailable',
    };
  }
}
