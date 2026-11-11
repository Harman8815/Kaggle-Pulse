"use client";

import type { BurstinessMetrics, DailyContribution } from "../../../lib/analytics/consistency.types";
import { DailyActivityDistributionChart } from "./DailyActivityDistributionChart";

interface Props {
  metrics: BurstinessMetrics;
  daily: DailyContribution[];
  start: string | null;
  end: string | null;
}

export const BurstinessPanel = ({ metrics, daily, start, end }: Props) => (
  <section className="panel rhythm-panel">
    <div className="panel-heading">
      <div>
        <h2>Burstiness &amp; distribution</h2>
        <p>Whether activity is steady or concentrated into bursts</p>
      </div>
      <span className={`rhythm-badge rhythm-badge-${metrics.classification}`}>{metrics.classification}</span>
    </div>
    <p className="rhythm-explanation">{metrics.explanation}</p>
    <div className="rhythm-metric-grid">
      <div className="rhythm-metric"><span>Mean daily</span><strong>{metrics.meanDaily.toFixed(2)}</strong></div>
      <div className="rhythm-metric"><span>Std. deviation</span><strong>{metrics.stdDevDaily.toFixed(2)}</strong></div>
      <div className="rhythm-metric"><span>Coeff. of variation</span><strong>{metrics.coefficientOfVariation.toFixed(2)}</strong></div>
      <div className="rhythm-metric">
        <span>Avg interval (active days)</span>
        <strong>{metrics.averageIntervalBetweenActiveDays == null ? "—" : `${metrics.averageIntervalBetweenActiveDays.toFixed(1)}d`}</strong>
      </div>
      <div className="rhythm-metric"><span>High-activity periods</span><strong>{metrics.highActivityPeriods.length}</strong></div>
      <div className="rhythm-metric"><span>Low/inactive runs (≥3d)</span><strong>{metrics.lowActivityPeriods.length}</strong></div>
    </div>
    <div className="rhythm-subsection">
      <h3>Daily activity distribution</h3>
      <DailyActivityDistributionChart daily={daily} start={start} end={end} />
    </div>
  </section>
);
