"use client";

import type { PatternsMetrics } from "../../../lib/analytics/consistency.types";
import { MonthlyTrendComparison } from "./MonthlyTrendComparison";

export const WeeklyPatternPanel = ({ patterns }: { patterns: PatternsMetrics }) => {
  const max = Math.max(1, ...patterns.weekdays.map((w) => w.total));
  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Weekly &amp; monthly patterns</h2>
          <p>When contributions tend to happen</p>
        </div>
      </div>
      <div className="rhythm-metric-grid rhythm-metric-grid-compact">
        <div className="rhythm-metric">
          <span>Most active weekday</span>
          <strong>{patterns.mostActiveWeekday ? patterns.mostActiveWeekday.label : "—"}</strong>
        </div>
        <div className="rhythm-metric">
          <span>Least active weekday</span>
          <strong>{patterns.leastActiveWeekday ? patterns.leastActiveWeekday.label : "—"}</strong>
        </div>
        <div className="rhythm-metric">
          <span>Most active month</span>
          <strong>{patterns.mostActiveMonth ? patterns.mostActiveMonth.label : "—"}</strong>
        </div>
      </div>
      <div className="rhythm-subsection">
        <h3>Average activity by weekday (UTC)</h3>
        <div className="weekday-chart">
          {patterns.weekdays.map((w) => (
            <div className="weekday-row" key={w.weekday}>
              <span className="weekday-label">{w.label}</span>
              <div className="weekday-track">
                <span className="weekday-bar" style={{ width: `${(w.total / max) * 100}%` }} />
              </div>
              <span className="weekday-value">{w.total}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rhythm-subsection">
        <h3>Recent vs previous period</h3>
        <MonthlyTrendComparison patterns={patterns} />
      </div>
    </section>
  );
};
