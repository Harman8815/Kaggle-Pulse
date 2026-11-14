"use client";

import { useEffect, useState } from "react";
import type {
	DataFreshness,
	HistoryResult,
} from "../../lib/kaggle-foundation/schemas";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";

interface HistoryResponse {
	history: HistoryResult;
	profile: {
		followers: number | null;
		rank: number | null;
		tier: string | null;
	};
	availability: {
		followers: string;
		rank: string;
		tier: string;
	};
	freshness: DataFreshness;
}

export default function HistoryDashboard({ username }: { username: string }) {
	const [result, setResult] = useState<HistoryResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		const loadHistory = async () => {
			try {
				const query = new URLSearchParams({ username });
				const response = await fetch(`/api/kaggle/history?${query}`, {
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
							: "Could not load profile history.";
					throw new Error(message);
				}
				setResult(body as HistoryResponse);
			} catch (requestError) {
				if (requestError instanceof Error && requestError.name !== "AbortError") {
					setError(requestError.message);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};

		void loadHistory();
		return () => controller.abort();
	}, [username]);

	const history = result?.history;
	const latest = history?.snapshots.at(-1);
	const followerValues = history?.snapshots
		.filter((snapshot) => snapshot.followers !== null)
		.map((snapshot) => snapshot.followers)
		.filter((value): value is number => value !== null) ?? [];
	const followerMin = Math.min(...followerValues);
	const followerMax = Math.max(...followerValues);

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
				<section className="dashboard-heading">
					<div>
						<div className="eyebrow"><span className="status-dot" /> PERSONAL HISTORY</div>
						<h1>{username}&apos;s profile history</h1>
						<p className="dashboard-subtitle">
							Genuine changes from collected daily snapshots. Missing values are never treated as zero.
						</p>
					</div>
				</section>

				{loading && <section className="panel history-panel" aria-live="polite">Loading profile and recording today&apos;s snapshot…</section>}
				{error && <div className="dashboard-alert" role="alert">{error}</div>}

				{history && result && (
					<>
						<section className="history-summary-grid">
							<SummaryCard label="Snapshots collected" value={history.snapshotCount.toString()} />
							<SummaryCard label="Latest snapshot" value={latest ? new Date(latest.timestamp).toLocaleDateString() : "None"} />
							<SummaryCard label="Followers" value={latest?.followers?.toLocaleString() ?? "Unavailable"} />
							<SummaryCard label="Notebook count" value={latest?.notebookCount?.toLocaleString() ?? "Unavailable"} />
						</section>

						<section className="history-collection-status" aria-live="polite">
							<strong>
								{result.freshness.snapshotCollectionFailures > 0
									? `${result.freshness.snapshotCollectionFailures} snapshot collection failure(s) recorded`
									: "No snapshot collection failures recorded"}
							</strong>
							<span>
								Last attempt: {result.freshness.lastSnapshotAttempt
									? new Date(result.freshness.lastSnapshotAttempt).toLocaleString()
									: "Unavailable"}
							</span>
							{result.freshness.lastSnapshotError && (
								<p role="alert">{result.freshness.lastSnapshotError}</p>
							)}
						</section>

						<section className="panel history-panel">
							<div className="panel-heading">
								<div>
									<h2>Follower history</h2>
									<p>Historical observations only; no past values are reconstructed.</p>
								</div>
							</div>
							{followerValues.length > 1 ? (
								<div className="history-chart-wrap">
									<svg className="history-chart" viewBox="0 0 640 180" role="img" aria-label="Follower count across collected snapshots">
										<polyline
											points={history.snapshots
												.map((snapshot, index) => {
													if (snapshot.followers === null) return null;
													const x = history.snapshots.length <= 1 ? 320 : 24 + index * (592 / (history.snapshots.length - 1));
													const y = followerMax === followerMin
														? 90
														: 156 - ((snapshot.followers - followerMin) / (followerMax - followerMin)) * 132;
													return `${x},${y}`;
												})
												.filter((point): point is string => point !== null)
												.join(" ")}
										/>
									</svg>
									<div className="history-chart-labels">
										<span>{history.firstSnapshot ? new Date(history.firstSnapshot).toLocaleDateString() : ""}</span>
										<span>{history.lastSnapshot ? new Date(history.lastSnapshot).toLocaleDateString() : ""}</span>
									</div>
								</div>
							) : (
								<p className="history-muted">At least two snapshots with follower data are needed for a trend chart.</p>
							)}
						</section>

						<section className="panel history-panel">
							<div className="panel-heading">
								<div>
									<h2>Growth windows</h2>
									<p>A window is shown only when snapshots span its full duration and the metric is available.</p>
								</div>
							</div>
							<div className="history-growth-grid">
								<GrowthList title="Followers" growth={history.growth.followerGrowth} />
								<GrowthList title="Notebooks" growth={history.growth.notebookGrowth} />
								<GrowthList title="Datasets" growth={history.growth.datasetGrowth} />
							</div>
						</section>

						<section className="panel history-panel">
							<div className="panel-heading">
								<div>
									<h2>Rank and tier history</h2>
									<p>Only fields actually returned by Kaggle are recorded.</p>
								</div>
							</div>
							<p className="history-muted">
								Rank: {result.profile.rank === null ? "Unavailable from the connected profile data." : `#${result.profile.rank}`}
								{" · "}
								Tier: {result.profile.tier ?? "Unavailable from the connected profile data."}
							</p>
						</section>

						<section className="panel history-panel">
							<div className="panel-heading">
								<div>
									<h2>Collected snapshots</h2>
									<p>One observation per UTC day. The current Kaggle integration does not provide follower, rank, or tier values.</p>
								</div>
							</div>
							{history.snapshots.length > 0 ? (
								<div className="history-table-wrap">
									<table className="history-table">
										<thead><tr><th>Date</th><th>Followers</th><th>Rank</th><th>Tier</th><th>Notebooks</th><th>Datasets</th></tr></thead>
										<tbody>
											{[...history.snapshots].reverse().slice(0, 30).map((snapshot) => (
												<tr key={snapshot.id}>
													<td>{snapshot.day}</td>
													<td>{snapshot.followers ?? "—"}</td>
													<td>{snapshot.rank ?? "—"}</td>
													<td>{snapshot.tier ?? "—"}</td>
													<td>{snapshot.notebookCount ?? "—"}</td>
													<td>{snapshot.datasetCount ?? "—"}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							) : <p className="history-muted">No snapshots have been collected yet.</p>}
						</section>
					</>
				)}
				</div>
			</main>
			<Footer />
		</>
	);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
	return <article className="stat-card history-stat"><span className="stat-topline">{label}</span><strong>{value}</strong></article>;
}

function GrowthList({
	title,
	growth,
}: {
	title: string;
	growth: HistoryResult["growth"]["followerGrowth"];
}) {
	return (
		<div className="history-growth-card">
			<h3>{title}</h3>
			{growth.map((item) => (
				<div className="history-growth-row" key={item.period}>
					<strong>{item.period}</strong>
					<span>
						{item.supported && item.change !== null
							? `${item.change > 0 ? "+" : ""}${item.change}${item.percent === null ? "" : ` (${item.percent > 0 ? "+" : ""}${item.percent.toFixed(1)}%)`}`
							: "Unavailable"}
					</span>
					{!item.supported && <small>{item.reason}</small>}
				</div>
			))}
		</div>
	);
}
