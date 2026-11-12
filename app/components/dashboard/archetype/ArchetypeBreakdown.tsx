"use client";

import type { ArchetypeCategory, ContributionArchetypeResult } from "../../../lib/analytics/archetype.types";

export const ArchetypeBreakdown = ({ result }: { result: ContributionArchetypeResult }) => {
  const coverageEntries = Object.entries(result.dataCoverage.categories) as Array<[
    ArchetypeCategory,
    (typeof result.dataCoverage.categories)[ArchetypeCategory],
  ]>;

  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Why this classification</h2>
          <p>Rule-based explanation — derived metrics are not presented as official Kaggle statistics.</p>
        </div>
      </div>
      <div className="archetype-explanations">
        {result.classification.explanations.map((explanation, index) => (
          <div className="archetype-explanation-item" key={index}>
            {explanation}
          </div>
        ))}
      </div>
      <div className="archetype-coverage">
        <h3 className="archetype-coverage-heading">Data coverage</h3>
        {coverageEntries.map(([category, coverage]) => (
          <div className="archetype-coverage-item" key={category}>
            <span className="archetype-coverage-category">{category}</span>
            <span className={`archetype-availability-badge availability-${coverage.availability}`}>
              {coverage.availability}
            </span>
            {coverage.missingFields.length > 0 && (
              <span className="archetype-coverage-missing">missing: {coverage.missingFields.join(", ")}</span>
            )}
          </div>
        ))}
      </div>
      <p className="archetype-coverage-note">
        {result.dataCoverage.incomplete
          ? "Data coverage is incomplete: blocked categories are listed separately and are not counted as zero contributions."
          : "All measured categories are fully covered."}
      </p>
      <div className="archetype-baseline">
        <strong>Peer baseline:</strong>{" "}
        {result.baseline.reason}
      </div>
    </section>
  );
};
