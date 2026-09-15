import { number } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Change({ latest, previous, unit }: { latest: number; previous: number | null; unit: string }) {
  if (previous === null || previous === 0) return null;
  const diff = latest - previous;
  const pct = (diff / previous) * 100;
  const isPct = unit === "%";
  if (Math.abs(diff) < 1e-9) return <span className="text-sm text-3">unchanged</span>;
  return (
    <span className={cn("text-sm font-medium tabular", diff > 0 ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300")}>
      {diff > 0 ? "▲" : "▼"} {number(Math.abs(diff), Number.isInteger(diff) ? 0 : 2)}
      {isPct ? " pts" : ` (${Math.abs(pct).toFixed(1)}%)`}
    </span>
  );
}

