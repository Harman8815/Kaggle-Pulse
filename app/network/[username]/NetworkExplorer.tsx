"use client";

import { useEffect, useMemo, useState } from "react";
import { Footer } from "../../components/Footer";
import { Navbar } from "../../components/Navbar";
import type {
	CollaborationNetwork,
	NetworkRelationshipType,
} from "../../lib/kaggle-foundation/schemas";

interface NetworkResponse {
	network: CollaborationNetwork;
	dataStatus: string;
	disclaimer: string;
}

const TYPE_LABELS: Record<NetworkRelationshipType, string> = {
	verified_teammate: "Verified teammate (curated record)",
	shared_competition: "Shared competition participation",
	public_interaction: "Public interaction",
};

const TYPE_COLORS: Record<NetworkRelationshipType, string> = {
	verified_teammate: "#16835d",
	shared_competition: "#4e7cf5",
	public_interaction: "#9b6bdf",
};

const RELATIONSHIP_TYPES: NetworkRelationshipType[] = [
	"verified_teammate",
	"shared_competition",
	"public_interaction",
];

export default function NetworkExplorer({ username }: { username: string }) {
	const [result, setResult] = useState<NetworkResponse | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		const loadNetwork = async () => {
			try {
				const query = new URLSearchParams({ username });
				const response = await fetch(`/api/kaggle/network?${query}`, {
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
							: "Could not load network records.";
					throw new Error(message);
				}
				setResult(body as NetworkResponse);
			} catch (requestError) {
				if (requestError instanceof Error && requestError.name !== "AbortError") {
					setError(requestError.message);
				}
			} finally {
				if (!controller.signal.aborted) setLoading(false);
			}
		};
		void loadNetwork();
		return () => controller.abort();
	}, [username]);

	const network = result?.network;
	const nodes = useMemo(() => {
		if (!network) return [];
		const unique = new Map<string, { username: string; relationships: NetworkRelationshipType[] }>();
		for (const relationship of network.relationships) {
			const neighbor =
				relationship.usernameA.toLowerCase() === username.toLowerCase()
					? relationship.usernameB
					: relationship.usernameA;
			const existing = unique.get(neighbor.toLowerCase()) ?? {
				username: neighbor,
				relationships: [],
			};
			if (!existing.relationships.includes(relationship.type)) {
				existing.relationships.push(relationship.type);
			}
			unique.set(neighbor.toLowerCase(), existing);
		}
		return [...unique.values()];
	}, [network, username]);

	const center = { x: 360, y: 180 };
	const positionedNodes = nodes.map((node, index) => {
		const angle = (2 * Math.PI * index) / Math.max(1, nodes.length) - Math.PI / 2;
		const radius = Math.min(125, 35 + nodes.length * 8);
		return {
			...node,
			x: center.x + Math.cos(angle) * radius,
			y: center.y + Math.sin(angle) * radius,
		};
	});

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> COLLABORATION NETWORK</div>
							<h1>{username}&apos;s sourced network</h1>
							<p className="dashboard-subtitle">Edges retain relationship type, date, and Kaggle source URL.</p>
						</div>
					</section>

					{loading && <section className="panel network-panel" aria-live="polite">Loading sourced network records…</section>}
					{error && <div className="dashboard-alert" role="alert">{error}</div>}

					{network && result && (
						<>
							<section className="network-stats">
								<NetworkStat label="Direct connections" value={network.directConnections} />
								<NetworkStat label="Second degree" value={network.secondDegreeConnections} />
								<NetworkStat label="Source-documented teammates" value={network.verifiedTeammates} />
								<NetworkStat label="Shared competition participants" value={network.sharedCompetitionParticipants} />
							</section>

							<section className="panel network-panel">
								<div className="panel-heading">
									<div>
										<h2>Relationship graph</h2>
										<p>Edges are differentiated by relationship type; participation does not imply collaboration.</p>
									</div>
								</div>
								{nodes.length > 0 ? (
									<div className="network-graph-wrap">
										<svg className="network-graph" viewBox="0 0 720 360" role="img" aria-label={`Sourced relationship network for ${username}`}>
											{positionedNodes.map((node) =>
												node.relationships.map((type) => (
													<line
														key={`${node.username}-${type}`}
														x1={center.x}
														y1={center.y}
														x2={node.x}
														y2={node.y}
														stroke={TYPE_COLORS[type]}
														strokeWidth="2"
													/>
												))
											)}
											<circle cx={center.x} cy={center.y} r="28" className="network-center-node" />
											<text x={center.x} y={center.y + 44} textAnchor="middle">{username}</text>
											{positionedNodes.map((node) => (
												<g key={node.username}>
													<circle cx={node.x} cy={node.y} r="19" className="network-neighbor-node" />
													<text x={node.x} y={node.y + 34} textAnchor="middle">{node.username}</text>
												</g>
											))}
										</svg>
										<div className="network-legend">
											{RELATIONSHIP_TYPES.map((type) => (
												<span key={type}>
													<i style={{ background: TYPE_COLORS[type] }} />
													{TYPE_LABELS[type]}
												</span>
											))}
										</div>
									</div>
								) : (
									<p className="network-empty">
										No relationship records are available for this user. Kaggle profile co-visibility is not used to invent graph edges.
									</p>
								)}
							</section>

							<section className="panel network-panel">
								<div className="panel-heading">
									<div>
										<h2>Relationship evidence</h2>
										<p>{result.disclaimer}</p>
									</div>
								</div>
								{network.relationships.length > 0 ? (
									<div className="network-record-list">
										{network.relationships.map((relationship) => {
											const neighbor =
												relationship.usernameA.toLowerCase() === username.toLowerCase()
													? relationship.usernameB
													: relationship.usernameA;
											return (
												<article className="network-record" key={relationship.id}>
													<div>
														<a href={`https://www.kaggle.com/${encodeURIComponent(neighbor)}`}>{neighbor}</a>
														<span className={`network-type network-type-${relationship.type}`}>
															{TYPE_LABELS[relationship.type]}
														</span>
													</div>
													<p>{relationship.sourceLabel} · {new Date(relationship.observedAt).toLocaleDateString()}</p>
													<a className="network-source" href={relationship.sourceUrl} target="_blank" rel="noreferrer">Open Kaggle source ↗</a>
												</article>
											);
										})}
									</div>
								) : (
									<p className="network-empty">No source records have been curated for this profile.</p>
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

function NetworkStat({ label, value }: { label: string; value: number }) {
	return (
		<article className="stat-card network-stat">
			<span className="stat-topline">{label}</span>
			<strong>{value.toLocaleString()}</strong>
		</article>
	);
}
