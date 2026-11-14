"use client";

import type { ArchetypeCategory, ArchetypeClassification } from "../../../lib/analytics/archetype.types";
import { ARCHETYPE_LABELS } from "../../../lib/analytics/archetype";

export const ArchetypeProfileCard = ({ classification }: { classification: ArchetypeClassification }) => {
  const primary = classification.primary;
  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Contribution archetype</h2>
          <p>How you participate — based on measurable contribution categories.</p>
        </div>
      </div>
      <div className="archetype-profile-card">
        <div className="archetype-name">{classification.archetypeLabel}</div>
        <div className="archetype-primary">
          {primary ? (
            <>
              <span className="archetype-primary-label">Primary:</span>
              <strong>{ARCHETYPE_LABELS[primary]}</strong>
              <span className={`confidence-badge confidence-${classification.confidence}`}>
                {classification.confidence} confidence
              </span>
            </>
          ) : (
            <span className="confidence-badge confidence-insufficient">Insufficient data</span>
          )}
        </div>
        <p className="archetype-note">
          {classification.isHybrid
            ? "Hybrid identity: meaningful contributions across more than one measurable category."
            : classification.primary === null
              ? "Not enough measurable data to assign a primary category."
              : `Single-category identity focused on ${ARCHETYPE_LABELS[primary as ArchetypeCategory]}.`}
        </p>
      </div>
    </section>
  );
};
