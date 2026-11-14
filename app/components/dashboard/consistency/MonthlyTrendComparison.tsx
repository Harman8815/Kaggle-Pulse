"use client";

import type { PatternsMetrics } from "../../../lib/analytics/consistency.types";

interface Props {
  patterns: PatternsMetrics;
}

export const MonthlyTrendComparison = ({ patterns }: Props) => {
  const { recentPeriod, previousPeriod, recentVsPreviousChange, recentVsPreviousPercentChange, monthly } = patterns;
  const recentMonths = monthly.slice(-6);
  const max = Math.max(1, ...recentMonths.map((m) => m.total));
  return (
    <div className="trend-comparison">
      <div className="trend-summary-cards">
        <div className="trend-card">
          <span className="trend-label">{recentPeriod?.label ?? "Recent"}</span>
          <strong>{recentPeriod?.total ?? 0}</strong>
          <span className="trend-range">
            {recentPeriod ? `${recentPeriod.start} – ${recentPeriod.end}` : "—"}
          </span>
        </div>
        <div className="trend-card">
          <span className="trend-label">{previousPeriod?.label ?? "Previous"}</span>
          <strong>{previousPeriod?.total ?? "—"}</strong>
          <span className="trend-range">
            {previousPeriod ? `${previousPeriod.start} – ${previousPeriod.end}` : "Not enough history"}
          </span>
        </div>
        <div className="trend-card">
          <span className="trend-label">Change</span>
          <strong>
            {recentVsPreviousChange == null ? "—" : `${recentVsPreviousChange > 0 ? "+" : ""}${recentVsPreviousChange}`}
          </strong>
          <span className="trend-range">
            {recentVsPreviousPercentChange == null
              ? "—"
              : `${recentVsPreviousPercentChange > 0 ? "+" : ""}${recentVsPreviousPercentChange.toFixed(1)}%`}
          </span>
        </div>
      </div>
      {recentMonths.length > 0 && (
        <div className="monthly-chart rhythm-monthly-chart" role="img" aria-label="Monthly totals">
          {recentMonths.map((m) => (
            <div className="month-column" key={m.month}>
              <span className="month-count">{m.total || ""}</span>
              <div className="month-track">
                <span className="month-bar" style={{ height: `${Math.max(m.total ? 12 : 4, (m.total / max) * 100)}%` }} />
              </div>
              <span className="month-label">{m.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
