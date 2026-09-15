import { formatDate, number } from "@/lib/format";

type Point = { date: string; value: number };

/**
 * Dependency-free, server-rendered SVG line chart. Scales with its container, keeps the
 * numbers readable, and degrades to a table for screen readers via the caption below.
 */
export function LineChart({ points, unit, className = "" }: { points: Point[]; unit: string; className?: string }) {
  if (points.length < 2) return <p className="text-sm text-3">Not enough data to chart yet.</p>;
  const W = 720;
  const H = 260;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.abs(max) * 0.02 || 1;
  const lo = min - span * 0.12;
  const hi = max + span * 0.12;
  const x = (i: number) => padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${padL},${(H - padB).toFixed(1)} Z`;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const xIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const last = points[points.length - 1];

  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Line chart of ${points.length} values from ${formatDate(points[0].date)} to ${formatDate(last.date)}`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" className="tabular">
              {number(t, t < 100 ? 2 : 0)}
            </text>
          </g>
        ))}
        <g className="text-brand-700">
          <path d={area} fill="url(#chart-fill)" />
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(points.length - 1)} cy={y(last.value)} r="4" fill="currentColor" />
        </g>
        {xIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 12} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--text-3)">
            {formatDate(points[i].date, { day: "numeric", month: "short" })}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-3">
        {points.length} readings · {unit} · {formatDate(points[0].date)} – {formatDate(last.date)}
      </figcaption>
    </figure>
  );
}
