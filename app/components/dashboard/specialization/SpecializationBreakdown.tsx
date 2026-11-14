"use client";

import type { SpecializationFingerprintResult, TopicDomain } from "../../../lib/analytics/specialization.types";

export const SpecializationBreakdown = ({ result }: { result: SpecializationFingerprintResult }) => {
  const coverageEntries = Object.entries(result.dataCoverage.domains) as Array<[
    TopicDomain,
    (typeof result.dataCoverage.domains)[TopicDomain],
  ]>;

  return (
    <section className="panel rhythm-panel">
      <div className="panel-heading">
        <div>
          <h2>Why this classification</h2>
          <p>Rule-based explanation — derived metrics are not presented as official Kaggle statistics.</p>
        </div>
      </div>
      <div className="specialization-explanations">
        {result.classification.explanations.map((explanation, index) => (
          <div className="specialization-explanation-item" key={index}>
            {explanation}
          </div>
        ))}
      </div>
      <div className="specialization-coverage">
        <h3 className="specialization-coverage-heading">Data coverage</h3>
        {coverageEntries.map(([domain, coverage]) => (
          <div className="specialization-coverage-item" key={domain}>
            <span className="specialization-coverage-domain">{domain}</span>
            <span className={`specialization-availability-badge availability-${coverage.availability}`}>
              {coverage.availability}
            </span>
            {coverage.count > 0 && (
              <span className="specialization-coverage-count">{coverage.count} item(s)</span>
            )}
          </div>
        ))}
      </div>
      <p className="specialization-coverage-note">
        {result.dataCoverage.incomplete
          ? "No classifiable items found. Blocked/unavailable domains are listed separately and are not counted as zero contributions."
          : `All ${result.dataCoverage.totalClassified} classified item(s) covered; ${result.dataCoverage.unclassifiedCount} item(s) had no matching domain signal.`}
      </p>
      <div className="specialization-baseline">
        <strong>Peer baseline:</strong>{" "}
        {result.baseline.reason}
      </div>
    </section>
  );
};
