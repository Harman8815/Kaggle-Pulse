"use client";

import type { FingerprintClassification, TopicDomain } from "../../../lib/analytics/specialization.types";
import { TOPIC_LABELS } from "../../../lib/analytics/specialization";

export const SpecializationFingerprintCard = ({ classification }: { classification: FingerprintClassification }) => {
  const primary = classification.primary;
  return (
    <section className="panel rhythm-panel specialization-card">
      <div className="panel-heading">
        <div>
          <h2>Specialization fingerprint</h2>
          <p>Topic intelligence derived from notebook, dataset and competition metadata.</p>
        </div>
      </div>
      <div className="specialization-profile-card">
        <div className="specialization-name">{classification.label}</div>
        <div className="specialization-primary">
          {primary ? (
            <>
              <span className="specialization-primary-label">Primary:</span>
              <strong>{TOPIC_LABELS[primary]}</strong>
              <span className={`confidence-badge confidence-${classification.confidence}`}>
                {classification.confidence} confidence
              </span>
            </>
          ) : (
            <span className="confidence-badge confidence-insufficient">Insufficient data</span>
          )}
        </div>
        {classification.secondary.length > 0 && (
          <div className="specialization-secondary">
            <span className="specialization-secondary-label">Secondary:</span>
            {classification.secondary.map((d) => (
              <span key={d} className="specialization-secondary-chip">
                {TOPIC_LABELS[d]}
              </span>
            ))}
          </div>
        )}
        <p className="specialization-note">
          {classification.label === "Unclassified"
            ? "Not enough classifiable metadata to assign a specialization."
            : classification.label === "Emerging Specialist"
              ? "Early signs of a single-domain focus; more activity needed for a confident label."
              : classification.label === "Exploratory/Drifting"
                ? "Broad but shallow activity across multiple domains; no dominant focus yet."
                : classification.label === "Generalist"
                  ? "Spread across multiple domains with no single dominant focus."
                  : `Single-domain focus on ${TOPIC_LABELS[primary as TopicDomain]}.`}
        </p>
      </div>
    </section>
  );
};
