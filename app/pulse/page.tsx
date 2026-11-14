"use client";

import { useEffect, useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import type { TopicPulseAnalysis } from "../lib/kaggle-foundation/schemas";

interface PulseResponse {
	analysis: TopicPulseAnalysis;
	dataSemantics: {
		timestamps: string;
		coverage: string;
		retentionDays: number;
	};
}

export default function TopicPulsePage() {
	const [result, setResult] = useState<PulseResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		const loadPulse = async () => {
			try {
				const response = await fetch("/api/kaggle/pulse", {
					signal: controller.signal,
				});
				const body: unknown = await response.json();
				if (!response.ok) {
					const message =
						typeof body === "object" &&
						body !== null &&
						"error" in body &&
						typeof body.error === "string"
							? body.error
							: "Could not load topic observations.";
					throw new Error(message);
				}
				setResult(body as PulseResponse);
			} catch (requestError) {
				if (requestError instanceof Error && requestError.name !== "AbortError") {
					setError(requestError.message);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};
		void loadPulse();
		return () => controller.abort();
	}, []);

	const analysis = result?.analysis;
	const maximumMonthlyCount = Math.max(
		1,
		...(analysis?.monthlyFirstObservations.map((item) => item.count) ?? [])
	);

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> TOPIC PULSE</div>
							<h1>Observe topic changes over time</h1>
							<p className="dashboard-subtitle">
								Community trends require long-running, timestamped collection. This view does not infer publication dates.
							</p>
						</div>
					</section>

					{loading && <section className="panel pulse-panel" aria-live="polite">Loading collected observations…</section>}
					{error && <div className="dashboard-alert" role="alert">{error}</div>}

					{analysis && result && (
						<>
							<section className="panel pulse-panel">
								<div className="panel-heading pulse-heading">
									<div>
										<h2>{analysis.supported ? "Observation window available" : "Trend analysis not yet supported"}</h2>
										<p>{analysis.reason}</p>
									</div>
									<span className={`pulse-status ${analysis.supported ? "pulse-status-ready" : ""}`}>
										{analysis.supported ? "Coverage threshold met" : "Collecting history"}
									</span>
								</div>
								<div className="pulse-coverage-grid">
									<PulseStat label="Tracked profiles" value={`${analysis.profilesObserved} / ${analysis.trackedProfiles}`} />
									<PulseStat label="Unique observed items" value={analysis.uniqueActivities.toLocaleString()} />
									<PulseStat label="Collection span" value={`${analysis.collectionDays} day(s)`} />
									<PulseStat label="Retention" value={`${result.dataSemantics.retentionDays} days`} />
								</div>
								<div className="pulse-dates">
									<span>First observation: {analysis.collectionStartedAt ? new Date(analysis.collectionStartedAt).toLocaleDateString() : "None yet"}</span>
									<span>Latest observation: {analysis.lastCollectedAt ? new Date(analysis.lastCollectedAt).toLocaleDateString() : "None yet"}</span>
								</div>
							</section>

							<section className="panel pulse-panel">
								<div className="panel-heading">
									<div>
										<h2>First-observed catalog items</h2>
										<p>Counts show when this platform first saw unique public items, not when Kaggle users published them.</p>
									</div>
								</div>
								{analysis.monthlyFirstObservations.length > 0 ? (
									<div className="pulse-month-chart" role="img" aria-label="Monthly count of first-observed catalog items">
										{analysis.monthlyFirstObservations.map((item) => (
											<div className="pulse-month-column" key={item.month}>
												<span className="pulse-month-count">{item.count}</span>
												<div className="pulse-month-track">
													<span style={{ height: `${Math.max(3, (item.count / maximumMonthlyCount) * 100)}%` }} />
												</div>
												<span className="pulse-month-label">{item.month}</span>
											</div>
										))}
									</div>
								) : (
									<p className="pulse-muted">No tracked-profile observations have been collected yet.</p>
								)}
							</section>

							<section className="panel pulse-panel">
								<div className="panel-heading">
									<div>
										<h2>Topic direction in the tracked sample</h2>
										<p>Direction is shown only when the overall history and each topic&apos;s sample thresholds are met.</p>
									</div>
								</div>
								<div className="pulse-topic-list">
									{analysis.domains.map((topic) => (
										<article className="pulse-topic-row" key={topic.domain}>
											<div>
												<strong>{topic.domain}</strong>
												<p>
													Earlier window: {topic.earlyObservations} · Recent window: {topic.recentObservations}
												</p>
											</div>
											<span className={`pulse-direction ${topic.direction ?? ""}`}>
												{topic.supported && topic.direction
													? `${topic.direction}${topic.changePercent === null ? "" : ` · ${topic.changePercent > 0 ? "+" : ""}${topic.changePercent.toFixed(0)}%`}`
													: "Insufficient evidence"}
											</span>
											{!topic.supported && <small>{topic.reason}</small>}
										</article>
									))}
								</div>
							</section>

							<section className="panel pulse-panel">
								<h2 className="pulse-method-title">Data interpretation and limitations</h2>
								<p>{result.dataSemantics.timestamps}</p>
								<p>{result.dataSemantics.coverage}</p>
								<p>
									Items already present when a profile first enters collection may be old. First-observed volume is therefore a catalog discovery measure, not a publication trend, and is not labeled an early-adoption signal.
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

function PulseStat({ label, value }: { label: string; value: string }) {
	return (
		<div className="pulse-stat">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}
