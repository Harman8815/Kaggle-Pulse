"use client";

import type { SpecializationScore } from "../../../lib/analytics/specialization.types";
import { TOPIC_LABELS } from "../../../lib/analytics/specialization";

export const TopSpecializations = ({ topics }: { topics: SpecializationScore[] }) => {
  const ranked = [...topics]
    .filter((t) => t.count > 0)
    .sort(
      (a, b) => b.score - a.score || b.count - a.count,
    )
    .slice(0, 5);

  if (ranked.length === 0) {
    return (
      <section className="panel rhythm-panel">
        <div className="panel-heading">
          <div>
            <h2>Top specializations</h2>
            <p>Strongest topic signals by matched item count.</p>
          </div>
        </div>
        <div className="empty-state">No specializations detected yet.</div>
      </section>
    );
  }

  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Top specializations</h2>
          <p>Strongest topic signals by matched item count.</p>
        </div>
      </div>
      <ol className="specialization-top-list">
        {ranked.map((t, index) => (
          <li className="specialization-top-item" key={t.domain}>
            <span className="specialization-top-rank">{index + 1}</span>
            <span className="specialization-top-domain">{TOPIC_LABELS[t.domain]}</span>
            <span className="specialization-top-value">
              {t.count} item(s) &middot; {(t.share * 100).toFixed(0)}% share
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
};
