import { Suspense } from "react";
import HistoryDashboard from "./HistoryDashboard";

export default function HistoryPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	return (
		<Suspense
			fallback={
				<main className="dashboard-shell">
					<div className="dashboard-container">
						<section className="panel history-panel" aria-live="polite">
							Loading profile history…
						</section>
					</div>
				</main>
			}
		>
			<HistoryRoute params={params} />
		</Suspense>
	);
}

async function HistoryRoute({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	return <HistoryDashboard username={username} />;
}
