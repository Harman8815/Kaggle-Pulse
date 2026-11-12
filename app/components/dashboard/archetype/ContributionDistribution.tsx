"use client";

import type { ArchetypeDistributionItem } from "../../../lib/analytics/archetype.types";

export const ContributionDistribution = ({ distribution }: { distribution: ArchetypeDistributionItem[] }) => {
  const available = distribution.filter((d) => d.availability === "available");
  const blocked = distribution.filter((d) => d.availability !== "available");
  const maxShare = available.length > 0 ? Math.max(...available.map((d) => d.share)) : 0;

  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Contribution distribution</h2>
          <p>Share of measurable contributions across available categories.</p>
        </div>
      </div>
      {available.length === 0 ? (
        <div className="empty-state">No measurable contributions to distribute.</div>
      ) : (
        <div className="archetype-distribution">
          {available.map((d) => {
            const width = maxShare > 0 ? (d.share / maxShare) * 100 : 100;
            return (
              <div className="archetype-distribution-row" key={d.category}>
                <span className="archetype-distribution-category">{d.label}</span>
                <div className="archetype-distribution-track">
                  <span className="archetype-distribution-bar" style={{ width: `${width}%` }} />
                </div>
                <span className="archetype-distribution-value">
                  {d.count} &middot; {(d.share * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
          <div className="archetype-distribution-axis">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}
      {blocked.length > 0 && (
        <p className="archetype-distribution-note">
          Not measured: {blocked.map((d) => d.label).join(", ")} — treated as not-measured, not zero.
        </p>
      )}
    </section>
  );
};
