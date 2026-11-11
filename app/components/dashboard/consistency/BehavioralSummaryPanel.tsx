"use client";

import type { BehavioralSummary } from "../../../lib/analytics/consistency.types";

export const BehavioralSummaryPanel = ({ summary }: { summary: BehavioralSummary }) => (
  <section className="panel rhythm-panel rhythm-summary-panel">
    <div className="panel-heading">
      <div>
        <h2>Behavioral summary</h2>
        <p>Rhythm and consistency profile for the selected window</p>
      </div>
      <span className="chart-period">{summary.window.toUpperCase()}</span>
    </div>
    <p className="behavioral-summary-text">{summary.summary}</p>
    <div className="rhythm-coverage">
      <span>Observed: {summary.observedStart ?? "—"} to {summary.observedEnd ?? "—"}</span>
      <span>Activities: {summary.totalActivities}</span>
      <span>Dated: {summary.dataCoverage.activitiesWithDates}</span>
      {summary.dataCoverage.activitiesWithoutDates > 0 && (
        <span>Undated excluded from day metrics: {summary.dataCoverage.activitiesWithoutDates}</span>
      )}
    </div>
  </section>
);
