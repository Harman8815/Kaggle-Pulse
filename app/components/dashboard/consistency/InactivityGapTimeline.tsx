"use client";

import type { RecoveryGap } from "../../../lib/analytics/consistency.types";

interface Props {
  gaps: RecoveryGap[];
  significantThreshold: number;
}

export const InactivityGapTimeline = ({ gaps, significantThreshold }: Props) => {
  if (gaps.length === 0) {
    return <div className="empty-state">No inactivity gaps in this window.</div>;
  }
  const shown = [...gaps].sort((a, b) => b.length - a.length).slice(0, 8);
  const max = Math.max(1, ...shown.map((g) => g.length));
  return (
    <div className="gap-timeline" role="list" aria-label="Inactivity gaps">
      {shown.map((gap) => {
        const significant = gap.length >= significantThreshold;
        return (
          <div className="gap-row" key={`${gap.start}-${gap.end}`} role="listitem">
            <div className="gap-meta">
              <strong>{gap.length} day{gap.length === 1 ? "" : "s"}</strong>
              <span>
                {gap.start} → {gap.end}
                {gap.recoveryDate ? ` · returned ${gap.recoveryDate}` : " · no return in window"}
              </span>
            </div>
            <div className="gap-track">
              <span
                className={`gap-bar ${significant ? "is-significant" : ""}`}
                style={{ width: `${Math.max(6, (gap.length / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
