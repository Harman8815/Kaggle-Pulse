"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import type { KaggleAtlasResult } from "../../lib/kaggle-foundation/schemas";
import { TOPIC_DOMAIN_ORDER } from "../../lib/analytics/specialization.types";

interface AtlasResponse {
	atlas: KaggleAtlasResult;
	selectedProfileStale: boolean;
	scope: string;
}

const DOMAIN_COLORS: Record<string, string> = {
	"Machine Learning": "#16835d",
	"Deep Learning": "#4e7cf5",
	"Computer Vision": "#9b6bdf",
	NLP: "#e28542",
	"Data Science": "#1a9ba8",
	"Time Series": "#d35b73",
	"Tabular AI": "#82952f",
	"Reinforcement Learning": "#bb5b9c",
	"Data Engineering": "#697a8c",
};

export default function AtlasExplorer({ username }: { username: string }) {
	const [result, setResult] = useState<AtlasResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		const loadAtlas = async () => {
			try {
				const query = new URLSearchParams({ username });
				const response = await fetch(`/api/kaggle/atlas?${query}`, {
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
							: "Could not load Kaggle Atlas data.";
					throw new Error(message);
				}
				setResult(body as AtlasResponse);
			} catch (requestError) {
				if (requestError instanceof Error && requestError.name !== "AbortError") {
					setError(requestError.message);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};
		void loadAtlas();
		return () => controller.abort();
	}, [username]);

	const atlas = result?.atlas;
	const mapPoints = atlas?.mapPoints ?? [];
	const selectedPoint = atlas?.selectedPoint;

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> KAGGLE ATLAS</div>
							<h1>Creator map around {username}</h1>
							<p className="dashboard-subtitle">A 2D exploratory projection of stored specialization fingerprints.</p>
						</div>
					</section>

					{loading && <section className="panel atlas-panel" aria-live="polite">Building the tracked-sample projection…</section>}
					{error && <div className="dashboard-alert" role="alert">{error}</div>}

					{atlas && result && (
						<>
							<section className="atlas-summary">
								<AtlasStat label="Profiles with topic evidence" value={atlas.coverage.profilesWithClassifiableActivity} />
								<AtlasStat label="Configured profiles" value={atlas.coverage.trackedProfiles} />
								<AtlasStat label="Feature version" value={atlas.featureVersion} />
								<AtlasStat label="Latest source update" value={atlas.latestSourceAt ? new Date(atlas.latestSourceAt).toLocaleDateString() : "Unavailable"} />
							</section>

							<section className="panel atlas-panel">
								<div className="panel-heading atlas-heading">
									<div>
										<h2>Tracked specialization map</h2>
										<p>{result.scope}</p>
									</div>
									<span className={`atlas-status ${atlas.supported ? "atlas-status-ready" : ""}`}>
										{atlas.supported ? "Projection available" : "Insufficient evidence"}
									</span>
								</div>
								{atlas.supported ? (
									<>
										<p className="atlas-method">{atlas.reason}</p>
										<div className="atlas-map-wrap">
											<svg className="atlas-map" viewBox="0 0 100 100" role="img" aria-label="Two-dimensional tracked profile specialization map">
												{mapPoints.map((point) => (
													<Link
														href={`/atlas/${encodeURIComponent(point.username)}`}
														key={point.username}
													>
														<circle
															cx={point.x}
															cy={point.y}
															r={point.selected ? 2.2 : 1.4}
															fill={DOMAIN_COLORS[point.specialization ?? ""] ?? "#929e97"}
															className={point.selected ? "atlas-point atlas-point-selected" : "atlas-point"}
														>
															<title>{point.username} · {point.specialization ?? "Unclassified"}</title>
														</circle>
													</Link>
												))}
												{selectedPoint && (
													<g className="atlas-selected">
														<circle
															cx={selectedPoint.x}
															cy={selectedPoint.y}
															r="1.4"
															fill={DOMAIN_COLORS[selectedPoint.specialization ?? ""] ?? "#929e97"}
														/>
														<circle cx={selectedPoint.x} cy={selectedPoint.y} r="3.1" />
														<text x={selectedPoint.x} y={selectedPoint.y - 4}>{selectedPoint.username}</text>
													</g>
												)}
											</svg>
										</div>
										<div className="atlas-legend">
											{TOPIC_DOMAIN_ORDER.map((domain) => (
												<span key={domain}>
													<i style={{ background: DOMAIN_COLORS[domain] }} />
													{domain}
												</span>
											))}
											<span><i className="atlas-legend-selected" /> Selected profile</span>
										</div>
									</>
								) : (
									<p className="atlas-unavailable">{atlas.reason}</p>
								)}
							</section>

							<section className="panel atlas-panel">
								<div className="panel-heading">
									<div>
										<h2>Nearest specialization profiles</h2>
										<p>Cosine similarity over normalized specialization-share vectors.</p>
									</div>
								</div>
								{atlas.nearestNeighbors.length > 0 ? (
									<div className="atlas-neighbors">
										{atlas.nearestNeighbors.map((neighbor, index) => (
											<Link
												className="atlas-neighbor"
												href={`/atlas/${encodeURIComponent(neighbor.username)}`}
												key={neighbor.username}
											>
												<span className="atlas-neighbor-rank">{index + 1}</span>
												<span className="atlas-neighbor-name">
													<strong>{neighbor.username}</strong>
													<small>{neighbor.specialization ?? "Unclassified"}</small>
												</span>
												<span className="atlas-neighbor-score">{(neighbor.similarity * 100).toFixed(1)}%</span>
											</Link>
										))}
									</div>
								) : (
									<p className="atlas-unavailable">
										{result.selectedProfileStale
											? "The selected profile data is stale because the latest Kaggle refresh failed; live placement and neighbors are withheld."
											: atlas.reason}
									</p>
								)}
							</section>
						</>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
}

function AtlasStat({ label, value }: { label: string; value: string | number }) {
	return (
		<article className="stat-card atlas-stat">
			<span className="stat-topline">{label}</span>
			<strong>{value}</strong>
		</article>
	);
}
