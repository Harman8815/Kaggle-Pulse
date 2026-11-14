"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export default function NetworkLookupPage() {
	const [username, setUsername] = useState("");
	const router = useRouter();

	function openNetwork(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = username.trim();
		if (trimmed) router.push(`/network/${encodeURIComponent(trimmed)}`);
	}

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> COLLABORATION NETWORK</div>
							<h1>Explore sourced relationships</h1>
							<p className="dashboard-subtitle">
								Only source-documented records are displayed. Public co-participation is not treated as teamwork.
							</p>
						</div>
					</section>
					<section className="panel network-panel">
						<form className="search-form" onSubmit={openNetwork}>
							<label className="visually-hidden" htmlFor="network-username">Kaggle username</label>
							<div className="search-input-wrapper">
								<input
									id="network-username"
									className="search-input"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="Enter Kaggle username"
									autoComplete="off"
									required
								/>
								<button className="search-btn" type="submit">Explore network</button>
							</div>
						</form>
						<p className="network-caveat">
							The current Kaggle API integration provides no verified team, competition participation, or discussion interaction records. The network stays empty until source-documented relationships are ingested.
						</p>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
