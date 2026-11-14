"use client";

import { useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import type { CohortAnalysis, CohortMetric } from "../lib/kaggle-foundation/schemas";

interface CohortResponse {
	analysis: CohortAnalysis;
	cohortDefinition: {
		label: string;
		populationCoverage: string;
		metricDefinition: string;
	};
}

export default function CohortsPage() {
	const [username, setUsername] = useState("");
	const [metric, setMetric] = useState<CohortMetric>("notebooks");
	const [result, setResult] = useState<CohortResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function loadCohort(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const query = new URLSearchParams({ username: username.trim(), metric });
			const response = await fetch(`/api/kaggle/cohorts?${query}`);
			const body: unknown = await response.json();
			if (!response.ok) {
				const message =
					typeof body === "object" &&
					body !== null &&
					"error" in body &&
					typeof body.error === "string"
						? body.error
						: "Could not load cohort analytics.";
				throw new Error(message);
			}
			setResult(body as CohortResponse);
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "Could not load cohort analytics."
			);
		} finally {
			setLoading(false);
		}
	}

	const analysis = result?.analysis;
	const distribution = analysis?.distribution;
	const quantilePoints = distribution
		? [
				["10th", distribution.percentiles["10"]],
				["25th", distribution.percentiles["25"]],
				["Median", distribution.percentiles["50"]],
				["75th", distribution.percentiles["75"]],
				["90th", distribution.percentiles["90"]],
			] as const
		: [];
	const position =
		analysis?.supported &&
		distribution &&
		analysis.userValue !== null &&
		distribution.max !== distribution.min
			? Math.min(
					100,
					Math.max(
						0,
						((analysis.userValue - distribution.min) /
							(distribution.max - distribution.min)) *
							100
					)
				)
			: 50;

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> COHORT PERCENTILES</div>
							<h1>Compare with tracked profiles</h1>
							<p className="dashboard-subtitle">
								Percentiles are calculated from collected observations—not manually assigned scores.
							</p>
						</div>
					</section>

					<section className="panel cohort-panel">
						<form className="cohort-form" onSubmit={loadCohort}>
							<label>
								<span>Kaggle username</span>
								<input
									className="search-input"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									autoComplete="off"
									required
								/>
							</label>
							<label>
								<span>Contribution metric</span>
								<select
									className="search-input"
									value={metric}
									onChange={(event) => setMetric(event.target.value as CohortMetric)}
								>
									<option value="notebooks">Notebooks</option>
									<option value="datasets">Datasets</option>
								</select>
							</label>
							<button type="submit" className="search-btn" disabled={loading}>
								{loading ? "Calculating…" : "Compare cohort"}
							</button>
						</form>
						{error && <div className="dashboard-alert" role="alert">{error}</div>}
					</section>

					{analysis && result && (
						<>
							<section className="panel cohort-panel">
								<div className="panel-heading cohort-heading">
									<div>
										<h2>{result.cohortDefinition.label}</h2>
										<p>
											{analysis.metric === "notebooks" ? "Notebook" : "Dataset"} contributions · latest collected snapshot per tracked profile
										</p>
									</div>
									<span className={`cohort-status ${analysis.supported ? "cohort-status-ready" : ""}`}>
										{analysis.supported ? "Sample threshold met" : "Insufficient evidence"}
									</span>
								</div>

								{analysis.supported && distribution ? (
									<>
										<div className="cohort-percentile">
											<strong>{Math.round(analysis.userPercentile ?? 0)}th</strong>
											<span>percentile within this tracked sample</span>
										</div>
										<div className="cohort-distribution" role="img" aria-label="Distribution range with the selected user's value">
											<div className="cohort-distribution-track">
												<span className="cohort-range" style={{ left: `${((distribution.percentiles["10"] - distribution.min) / Math.max(1, distribution.max - distribution.min)) * 100}%`, width: `${((distribution.percentiles["90"] - distribution.percentiles["10"]) / Math.max(1, distribution.max - distribution.min)) * 100}%` }} />
												<span className="cohort-user-marker" style={{ left: `${position}%` }} />
											</div>
											<div className="cohort-distribution-labels">
												<span>Lower · {distribution.min}</span>
												<span>User · {analysis.userValue}</span>
												<span>Higher · {distribution.max}</span>
											</div>
											<div className="cohort-quantiles">
												{quantilePoints.map(([label, value]) => (
													<span key={label}><strong>{label}</strong>{value.toFixed(1)}</span>
												))}
											</div>
										</div>
									</>
								) : (
									<p className="cohort-unavailable">{analysis.reason}</p>
								)}

								<div className="cohort-coverage">
									<span><strong>{analysis.coverage.recordsWithMetric}</strong> profiles with metric</span>
									<span><strong>{analysis.minimumSampleSize}</strong> minimum sample size</span>
									<span>Updated {analysis.sampleUpdatedAt ? new Date(analysis.sampleUpdatedAt).toLocaleString() : "not yet available"}</span>
								</div>
							</section>

							<section className="panel cohort-panel">
								<h2 className="cohort-method-title">How to interpret this comparison</h2>
								<p>{result.cohortDefinition.populationCoverage}</p>
								<p>{result.cohortDefinition.metricDefinition}</p>
								<p>
									This sample is not stratified by registration year, account age, tier, or specialization because those fields are unavailable. A percentile here describes position only within the configured tracked sample, not the Kaggle population.
								</p>
							</section>
						</>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
}
