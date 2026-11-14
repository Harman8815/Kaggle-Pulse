"use client";

import type { SpecializationScore } from "../../../lib/analytics/specialization.types";

export const TopicDistribution = ({ topics }: { topics: SpecializationScore[] }) => {
  const available = topics.filter((t) => t.count > 0);
  const blocked = topics.filter((t) => t.count === 0 && t.availability !== "available");
  const maxShare = available.length > 0 ? Math.max(...available.map((t) => t.share)) : 0;

  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Topic distribution</h2>
          <p>Share of classified items touching each topic domain.</p>
        </div>
      </div>
      {available.length === 0 ? (
        <div className="empty-state">No classified items to distribute.</div>
      ) : (
        <div className="specialization-distribution">
          {available.map((t) => {
            const width = maxShare > 0 ? (t.share / maxShare) * 100 : 100;
            return (
              <div className="specialization-distribution-row" key={t.domain}>
                <span className="specialization-distribution-domain">{t.label}</span>
                <div className="specialization-distribution-track">
                  <span className="specialization-distribution-bar" style={{ width: `${width}%` }} />
                </div>
                <span className="specialization-distribution-value">
                  {t.count} &middot; {(t.share * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
          <div className="specialization-distribution-axis">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}
      {blocked.length > 0 && (
        <p className="specialization-distribution-note">
          Not measured: {blocked.map((t) => t.label).join(", ")} — treated as not-measured, not zero.
        </p>
      )}
    </section>
  );
};
