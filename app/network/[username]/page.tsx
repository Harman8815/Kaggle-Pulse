import { Suspense } from "react";
import NetworkExplorer from "./NetworkExplorer";

export default function NetworkPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	return (
		<Suspense
			fallback={
				<main className="dashboard-shell">
					<div className="dashboard-container">
						<section className="panel network-panel">Loading network…</section>
					</div>
				</main>
			}
		>
			<NetworkRoute params={params} />
		</Suspense>
	);
}

async function NetworkRoute({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	return <NetworkExplorer username={username} />;
}
