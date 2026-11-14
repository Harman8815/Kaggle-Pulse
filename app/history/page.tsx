"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export default function HistoryLookupPage() {
	const [username, setUsername] = useState("");
	const router = useRouter();

	function openHistory(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = username.trim();
		if (!trimmed) return;
		router.push(`/history/${encodeURIComponent(trimmed)}`);
	}

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> PERSONAL HISTORY</div>
							<h1>Explore profile history</h1>
							<p className="dashboard-subtitle">
								Open a Kaggle profile to view the snapshots collected so far.
							</p>
						</div>
					</section>
					<section className="panel comparison-panel">
						<form className="search-form" onSubmit={openHistory}>
							<label className="visually-hidden" htmlFor="history-username">Kaggle username</label>
							<div className="search-input-wrapper">
								<input
									id="history-username"
									className="search-input"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="Enter Kaggle username"
									autoComplete="off"
									required
								/>
								<button className="search-btn" type="submit">View history</button>
							</div>
						</form>
						<p className="history-muted">
							Opening the history page records today&apos;s snapshot when profile data is available. Past values are not backfilled.
						</p>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
