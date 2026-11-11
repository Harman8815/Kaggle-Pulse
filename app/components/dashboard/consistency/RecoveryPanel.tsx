"use client";

import type { RecoveryMetrics } from "../../../lib/analytics/consistency.types";
import { InactivityGapTimeline } from "./InactivityGapTimeline";

export const RecoveryPanel = ({ metrics }: { metrics: RecoveryMetrics }) => (
  <section className="panel rhythm-panel">
    <div className="panel-heading">
      <div>
        <h2>Recovery after breaks</h2>
        <p>Inactivity gaps and returns to contribution</p>
      </div>
      <span className="chart-period">GAP ≥ {metrics.significantGapThreshold}d</span>
    </div>
    <div className="rhythm-metric-grid">
      <div className="rhythm-metric"><span>Total gaps</span><strong>{metrics.gaps.length}</strong></div>
      <div className="rhythm-metric"><span>Significant gaps</span><strong>{metrics.significantGaps.length}</strong></div>
      <div className="rhythm-metric"><span>Successful returns</span><strong>{metrics.successfulReturns}</strong></div>
      <div className="rhythm-metric">
        <span>Avg recovery time</span>
        <strong>{metrics.averageRecoveryTime == null ? "—" : `${metrics.averageRecoveryTime.toFixed(1)}d`}</strong>
      </div>
      <div className="rhythm-metric">
        <span>Longest break (renewed)</span>
        <strong>
          {metrics.longestBreakFollowedByRenewedActivity
            ? `${metrics.longestBreakFollowedByRenewedActivity.length}d`
            : "—"}
        </strong>
      </div>
    </div>
    <div className="rhythm-subsection">
      <h3>Inactivity gap timeline</h3>
      <InactivityGapTimeline gaps={metrics.gaps} significantThreshold={metrics.significantGapThreshold} />
    </div>
  </section>
);
