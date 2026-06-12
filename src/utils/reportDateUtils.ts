import type { PresetPeriod } from "@/types/reports.types";

export function resolvePresetDates(preset: PresetPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (preset) {
    case "last_week": {
      // Encerra no domingo anterior
      const day = now.getDay(); // 0=dom
      const end = new Date(now);
      end.setDate(now.getDate() - day);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { from: start, to: end };
    }
    case "last_month":
      from.setMonth(from.getMonth() - 1);
      return { from, to };
    case "last_quarter":
      from.setMonth(from.getMonth() - 3);
      return { from, to };
    case "last_6_months":
      from.setMonth(from.getMonth() - 6);
      return { from, to };
    case "last_year":
      from.setFullYear(from.getFullYear() - 1);
      return { from, to };
    case "last_300_days":
      from.setDate(from.getDate() - 300);
      return { from, to };
    case "custom":
    default:
      from.setDate(from.getDate() - 30);
      return { from, to };
  }
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}
