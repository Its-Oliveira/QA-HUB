export interface ReporterCancellationRank {
  reporter: string;
  count: number;
  created: number;
  rate: number;
}

export function buildReporterRanking(
  issues: Array<{ reporter?: string | null }>,
  createdByReporter: Record<string, number>
): ReporterCancellationRank[] {
  const cancelledCounts = new Map<string, number>();

  for (const issue of issues) {
    const reporter = issue.reporter || "Sem relator";
    cancelledCounts.set(reporter, (cancelledCounts.get(reporter) || 0) + 1);
  }

  const reporters = new Set<string>([
    ...Object.keys(createdByReporter),
    ...cancelledCounts.keys(),
  ]);

  return Array.from(reporters)
    .map((reporter) => {
      const count = cancelledCounts.get(reporter) || 0;
      const created = createdByReporter[reporter] || 0;
      return {
        reporter,
        count,
        created,
        rate: created > 0 ? (count / created) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}
