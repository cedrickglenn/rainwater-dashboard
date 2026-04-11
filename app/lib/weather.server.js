/**
 * weather.server.js
 * Fetches current weather and 3-day forecast for Davao City from Open-Meteo.
 * No API key required. Results are cached in memory for 15 minutes to avoid
 * hammering the API on every dashboard page load.
 *
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
  `precipitation_probability_max,precipitation_sum` +
  `&hourly=temperature_2m,precipitation_probability,weather_code` +
  `&timezone=${encodeURIComponent(TZ)}` +
  `&forecast_days=3`;

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let _cache = { data: null, fetchedAt: 0 };

// ---------------------------------------------------------------------------
// WMO weather code → label + lucide icon name
// Relevant subset for the Philippines climate
// ---------------------------------------------------------------------------
const WMO_MAP = {
  0:  { label: 'Clear sky',        icon: 'Sun'            },
  1:  { label: 'Mainly clear',     icon: 'Sun'            },
  2:  { label: 'Partly cloudy',    icon: 'CloudSun'       },
  3:  { label: 'Overcast',         icon: 'Cloud'          },
  45: { label: 'Foggy',            icon: 'CloudFog'       },
  48: { label: 'Icy fog',          icon: 'CloudFog'       },
  51: { label: 'Light drizzle',    icon: 'CloudDrizzle'   },
  53: { label: 'Drizzle',          icon: 'CloudDrizzle'   },
  55: { label: 'Heavy drizzle',    icon: 'CloudDrizzle'   },
  61: { label: 'Light rain',       icon: 'CloudRain'      },
  63: { label: 'Rain',             icon: 'CloudRain'      },
  65: { label: 'Heavy rain',       icon: 'CloudRain'      },
  80: { label: 'Rain showers',     icon: 'CloudRain'      },
  81: { label: 'Rain showers',     icon: 'CloudRain'      },
  82: { label: 'Heavy showers',    icon: 'CloudRain'      },
  95: { label: 'Thunderstorm',     icon: 'CloudLightning' },
  96: { label: 'Thunderstorm',     icon: 'CloudLightning' },
  99: { label: 'Thunderstorm',     icon: 'CloudLightning' },
};

function describeCode(code) {
  return WMO_MAP[code] ?? { label: 'Unknown', icon: 'Cloud' };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getWeather() {
  if (_cache.data && Date.now() - _cache.fetchedAt < CACHE_TTL) {
    return _cache.data;
  }

  try {
    const res  = await fetch(ENDPOINT, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const raw  = await res.json();

    const cur = raw.current;
    const day = raw.daily;
    const hr  = raw.hourly;

    // Find next 6 hours starting from current Manila time (UTC+8)
    const manilaOffset = 8 * 60 * 60 * 1000;
    const nowManila    = new Date(Date.now() + manilaOffset);
    const manilaHourStr = nowManila.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
    const startIdx = hr ? hr.time.findIndex((t) => t >= manilaHourStr) : -1;
    const hourly = (startIdx >= 0 ? hr.time.slice(startIdx, startIdx + 12) : []).map((time, i) => {
      const idx  = startIdx + i;
      const code = hr.weather_code[idx];
      return {
        time,
        temp:       Math.round(hr.temperature_2m[idx]),
        rainChance: hr.precipitation_probability[idx],
        code,
        ...describeCode(code),
      };
    });

    const data = {
      current: {
        temp:        Math.round(cur.temperature_2m),
        feelsLike:   Math.round(cur.apparent_temperature),
        humidity:    cur.relative_humidity_2m,
        wind:        Math.round(cur.wind_speed_10m),
        rainMm:      cur.precipitation,
        code:        cur.weather_code,
        ...describeCode(cur.weather_code),
      },
      forecast: day.time.map((date, i) => ({
        date,
        tempMax:     Math.round(day.temperature_2m_max[i]),
        tempMin:     Math.round(day.temperature_2m_min[i]),
        rainChance:  day.precipitation_probability_max[i],
        rainMm:      day.precipitation_sum[i],
        code:        day.weather_code[i],
        ...describeCode(day.weather_code[i]),
      })),
      hourly,
      fetchedAt: new Date().toISOString(),
      error: null,
    };

    _cache = { data, fetchedAt: Date.now() };
    return data;
  } catch (err) {
    // Return a graceful error object — dashboard still loads
    return {
      current:  null,
      forecast: [],
      fetchedAt: null,
      error: err.message ?? 'Weather unavailable',
    };
  }
}
