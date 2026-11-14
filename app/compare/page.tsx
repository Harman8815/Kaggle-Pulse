"use client";

import { useState } from "react";
import type { FairComparisonResult } from "../lib/analytics/comparison.types";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

interface ComparisonResponse {
	comparison: FairComparisonResult;
	accountEvidence: {
		userA: "public_activity_found" | "unverified";
		userB: "public_activity_found" | "unverified";
	};
}

export default function ComparePage() {
	const [usernameA, setUsernameA] = useState("");
	const [usernameB, setUsernameB] = useState("");
	const [result, setResult] = useState<ComparisonResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function submitComparison(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const query = new URLSearchParams({
				a: usernameA.trim(),
				b: usernameB.trim(),
			});
			const response = await fetch(`/api/kaggle/compare?${query}`);
			const body: unknown = await response.json();
			if (!response.ok) {
				const message =
					typeof body === "object" &&
					body !== null &&
					"error" in body &&
					typeof body.error === "string"
						? body.error
						: "Could not compare these Kaggle profiles.";
				throw new Error(message);
			}
			setResult(body as ComparisonResponse);
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "Could not compare these Kaggle profiles."
			);
		} finally {
			setLoading(false);
		}
	}

	const comparison = result?.comparison;
	const topicOverlap = comparison?.topicOverlap;

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> FAIR HEAD-TO-HEAD</div>
							<h1>Compare Kaggle creators</h1>
							<p className="dashboard-subtitle">
								Compare topic signals and see where historical evidence is not yet available.
							</p>
						</div>
					</section>

					<section className="panel comparison-panel">
						<form className="comparison-form" onSubmit={submitComparison}>
							<label>
								<span>Kaggle username A</span>
								<input
									className="search-input"
									value={usernameA}
									onChange={(event) => setUsernameA(event.target.value)}
									autoComplete="off"
									required
								/>
							</label>
							<label>
								<span>Kaggle username B</span>
								<input
									className="search-input"
									value={usernameB}
									onChange={(event) => setUsernameB(event.target.value)}
									autoComplete="off"
									required
								/>
							</label>
							<button className="search-btn" type="submit" disabled={loading}>
								{loading ? "Comparing…" : "Compare profiles"}
							</button>
						</form>
						{error && <div className="dashboard-alert" role="alert">{error}</div>}
					</section>

					{comparison && (
						<>
							<section className="comparison-profile-grid" aria-label="Compared profiles">
								{[comparison.profileA, comparison.profileB].map((profile, index) => (
									<article className="panel comparison-profile" key={profile.username}>
										<div className="eyebrow">USER {index === 0 ? "A" : "B"}</div>
										<h2>
											<a href={`https://www.kaggle.com/${encodeURIComponent(profile.username)}`}>
												{profile.username}
											</a>
										</h2>
										<p>
											{result?.accountEvidence[index === 0 ? "userA" : "userB"] === "public_activity_found"
												? "Public notebook or dataset activity found."
												: "No public activity found; account existence could not be verified."}
										</p>
										<dl>
											<div><dt>Registration date</dt><dd>{profile.registrationDate ?? "Unavailable"}</dd></div>
											<div><dt>Account age</dt><dd>
												{(index === 0 ? comparison.accountAgeDaysA : comparison.accountAgeDaysB) === null
													? "Unavailable"
													: `${(index === 0 ? comparison.accountAgeDaysA : comparison.accountAgeDaysB)?.toLocaleString()} days`}
											</dd></div>
										</dl>
									</article>
								))}
							</section>

							<section className="panel comparison-panel">
								<div className="panel-heading">
									<div>
										<h2>Equivalent account-age periods</h2>
										<p>Unavailable comparisons are not estimated from current totals.</p>
									</div>
								</div>
								<div className="comparison-window-list">
									{comparison.periodComparisons.map((window) => (
										<article className="comparison-window" key={window.window}>
											<div className="comparison-window-heading">
												<strong>{window.label}</strong>
												<span className="availability-badge">Unavailable</span>
											</div>
											<p>{window.reason}</p>
										</article>
									))}
								</div>
							</section>

							<section className="panel comparison-panel">
								<div className="panel-heading">
									<div>
										<h2>Specialization overlap</h2>
										<p>Derived from the currently returned public activity metadata, not a complete historical record.</p>
									</div>
									{topicOverlap && (
										<strong className="topic-similarity">
											{Math.round(topicOverlap.similarity * 100)}% topic overlap
										</strong>
									)}
								</div>
								{topicOverlap ? (
									<div className="comparison-topic-grid">
										<TopicList title="Shared domains" topics={topicOverlap.shared} empty="No shared domains found." />
										<TopicList title={`${comparison.profileA.username} only`} topics={topicOverlap.uniqueA} empty="No unique domains found." />
										<TopicList title={`${comparison.profileB.username} only`} topics={topicOverlap.uniqueB} empty="No unique domains found." />
									</div>
								) : (
									<p className="history-muted">Topic overlap is unavailable because one or both profiles have no classifiable public activity.</p>
								)}
								<p className="comparison-caveat">
									Complementary topics can suggest shared interests, but compatibility is not evidence of teamwork ability.
								</p>
							</section>

							<section className="panel comparison-panel">
								<h2 className="comparison-summary-title">Comparison notes</h2>
								<ul className="comparison-summary">
									{comparison.summary.map((item) => <li key={item}>{item}</li>)}
								</ul>
							</section>
						</>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
}

function TopicList({
	title,
	topics,
	empty,
}: {
	title: string;
	topics: string[];
	empty: string;
}) {
	return (
		<div className="comparison-topic-list">
			<h3>{title}</h3>
			{topics.length > 0
				? <ul>{topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
				: <p>{empty}</p>}
		</div>
	);
}
