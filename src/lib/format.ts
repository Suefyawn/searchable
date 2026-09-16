const pkrFormatter = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** "Rs 1,234,567" */
export function pkr(value: number): string {
  if (!Number.isFinite(value)) return ", ";
  const rounded = Math.round(value);
  return `${rounded < 0 ? "−" : ""}Rs ${pkrFormatter.format(Math.abs(rounded))}`;
}

/** "Rs 12.5 lakh" / "Rs 1.2 crore" for headlines. */
export function pkrCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `Rs ${(value / 1e7).toFixed(2).replace(/\.?0+$/, "")} crore`;
  if (abs >= 1e5) return `Rs ${(value / 1e5).toFixed(2).replace(/\.?0+$/, "")} lakh`;
  return pkr(value);
}

export function pct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}

export function number(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: digits }).format(value);
}

export function formatDate(date: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" }): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-PK", { timeZone: "Asia/Karachi", ...opts }).format(d);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * A stored +92 number the way people write it: mobiles as 0300 1234567, landlines as 042 35905000, UANs as
 * 051 111 644 911. Anything that is not a normalised +92 number is shown as it is.
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = raw.match(/^\+92(\d{9,11})$/);
  if (!m) return raw;
  const d = m[1];
  if (d.length === 10 && d.startsWith("3")) return `0${d.slice(0, 3)} ${d.slice(3)}`;
  const cityLen = /^(21|42|51|41|61|71|91|81|22|52|55|53|44|48|46|47|49|56|57|62|63|64|65|66|67|68|86|92|94|95|96|97|98|99)/.test(d) ? 2 : 3;
  const city = d.slice(0, cityLen);
  const rest = d.slice(cityLen);
  if (rest.startsWith("111") && rest.length === 9) return `0${city} 111 ${rest.slice(3, 6)} ${rest.slice(6)}`;
  return `0${city} ${rest}`;
}
