"use client";

import type { ConsistencyMetrics } from "../../../lib/analytics/consistency.types";

export const ConsistencyPanel = ({ metrics }: { metrics: ConsistencyMetrics }) => (
  <section className="panel rhythm-panel">
    <div className="panel-heading">
      <div>
        <h2>Activity consistency</h2>
        <p>How evenly contributions are distributed across observed days</p>
      </div>
      {metrics.anchorDate && <span className="chart-period">ANCHOR {metrics.anchorDate}</span>}
    </div>
    <div className="rhythm-metric-grid">
      <div className="rhythm-metric"><span>Active days</span><strong>{metrics.activeDays}</strong></div>
      <div className="rhythm-metric"><span>Inactive days</span><strong>{metrics.inactiveDays}</strong></div>
      <div className="rhythm-metric"><span>Active-day %</span><strong>{metrics.activeDayPercentage.toFixed(1)}%</strong></div>
      <div className="rhythm-metric"><span>Avg / active day</span><strong>{metrics.averageContributionsPerActiveDay.toFixed(2)}</strong></div>
      <div className="rhythm-metric"><span>Avg / day (period)</span><strong>{metrics.averageDailyContributions.toFixed(2)}</strong></div>
      <div className="rhythm-metric"><span>Longest active streak</span><strong>{metrics.longestActiveStreak}d</strong></div>
      <div className="rhythm-metric"><span>Current streak</span><strong>{metrics.currentActiveStreak}d</strong></div>
      <div className="rhythm-metric"><span>Longest inactivity</span><strong>{metrics.longestInactivityPeriod}d</strong></div>
    </div>
    <p className="rhythm-note">
      Current streak is anchored to the latest activity date ({metrics.anchorDate ?? "—"}) for reproducible results, not wall-clock today.
    </p>
  </section>
);
