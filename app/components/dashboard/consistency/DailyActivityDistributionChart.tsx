"use client";

import type { DailyContribution } from "../../../lib/analytics/consistency.types";

interface Props {
  daily: DailyContribution[];
  start: string | null;
  end: string | null;
}

function enumerate(start: string, end: string): string[] {
  const days: string[] = [];
  const d = new Date(`${start}T00:00:00.000Z`);
  const e = new Date(`${end}T00:00:00.000Z`);
  while (d <= e) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export const DailyActivityDistributionChart = ({ daily, start, end }: Props) => {
  if (!start || !end || daily.length === 0) {
    return <div className="empty-state">No dated activity to chart.</div>;
  }
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const days = enumerate(start, end);
  const counts = days.map((d) => byDate.get(d) ?? 0);
  // bucket into up to 40 bars to keep SVG light
  const bucketCount = Math.min(40, days.length);
  const bucketSize = Math.ceil(days.length / bucketCount);
  const buckets: { label: string; total: number }[] = [];
  for (let i = 0; i < days.length; i += bucketSize) {
    const slice = counts.slice(i, i + bucketSize);
    buckets.push({ label: days[i], total: slice.reduce((a, b) => a + b, 0) });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.total));
  return (
    <div className="distribution-chart" role="img" aria-label="Daily activity distribution">
      <div className="distribution-bars">
        {buckets.map((b, i) => (
          <div className="distribution-bar-wrap" key={`${b.label}-${i}`} title={`${b.label}: ${b.total}`}>
            <span
              className="distribution-bar"
              style={{ height: `${Math.max(b.total ? 8 : 2, (b.total / maxBucket) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="distribution-axis">
        <span>{start}</span>
        <span>{end}</span>
      </div>
    </div>
  );
};
