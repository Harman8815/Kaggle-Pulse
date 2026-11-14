"use client";

import type { ActivityClassification } from "../../../lib/analytics/consistency.types";

export const ClassificationPanel = ({ classifications }: { classifications: ActivityClassification[] }) => (
  <section className="panel rhythm-panel">
    <div className="panel-heading">
      <div>
        <h2>Activity classification</h2>
        <p>Behavioral labels derived from observed metrics (multi-label, not exclusive)</p>
      </div>
    </div>
    {classifications.length === 0 ? (
      <div className="empty-state">Not enough data to classify activity.</div>
    ) : (
      <div className="classification-list">
        {classifications.map((c) => (
          <div className="classification-card" key={c.label}>
            <div className="classification-header">
              <strong>{c.label}</strong>
              <span className={`confidence-badge confidence-${c.confidence}`}>{c.confidence} confidence</span>
            </div>
            <p>{c.explanation}</p>
          </div>
        ))}
      </div>
    )}
  </section>
);
