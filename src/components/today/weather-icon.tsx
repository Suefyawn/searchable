import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideProps } from "lucide-react";

/** MET Norway symbol code → one line icon. Night variants get the moon where the sky is clear. */
export function WeatherIcon({ code, ...props }: { code: string } & LucideProps) {
  const night = code.endsWith("_night");
  const base = code.replace(/_(day|night|polartwilight)$/, "");
  if (/thunder/.test(base)) return <CloudLightning {...props} />;
  if (/snow|sleet/.test(base)) return <CloudSnow {...props} />;
  if (/heavyrain|^rain$/.test(base)) return <CloudRain {...props} />;
  if (/rain/.test(base)) return <CloudDrizzle {...props} />;
  if (/fog/.test(base)) return <CloudFog {...props} />;
  if (base === "cloudy") return <Cloud {...props} />;
  if (base === "partlycloudy" || base === "fair") return night ? <Moon {...props} /> : <CloudSun {...props} />;
  if (base === "clearsky") return night ? <Moon {...props} /> : <Sun {...props} />;
  return <Cloud {...props} />;
}
