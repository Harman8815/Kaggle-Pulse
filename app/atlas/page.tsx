"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export default function AtlasLookupPage() {
	const [username, setUsername] = useState("");
	const router = useRouter();

	function openAtlas(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmed = username.trim();
		if (trimmed) router.push(`/atlas/${encodeURIComponent(trimmed)}`);
	}

	return (
		<>
			<Navbar />
			<main className="dashboard-shell">
				<div className="dashboard-container">
					<section className="dashboard-heading">
						<div>
							<div className="eyebrow"><span className="status-dot" /> KAGGLE ATLAS</div>
							<h1>Explore the tracked creator map</h1>
							<p className="dashboard-subtitle">
								Place a profile alongside configured users with comparable specialization evidence.
							</p>
						</div>
					</section>
					<section className="panel atlas-panel">
						<form className="search-form" onSubmit={openAtlas}>
							<label className="visually-hidden" htmlFor="atlas-username">Kaggle username</label>
							<div className="search-input-wrapper">
								<input
									id="atlas-username"
									className="search-input"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="Enter Kaggle username"
									autoComplete="off"
									required
								/>
								<button className="search-btn" type="submit">Explore Atlas</button>
							</div>
						</form>
						<p className="atlas-caveat">
							The Atlas is limited to previously collected profiles in KAGGLE_TRACKED_USERS. It does not represent every Kaggle user.
						</p>
					</section>
				</div>
			</main>
			<Footer />
		</>
	);
}
