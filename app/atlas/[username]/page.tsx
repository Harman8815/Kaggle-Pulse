import { Suspense } from "react";
import AtlasExplorer from "./AtlasExplorer";

export default function AtlasPage({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	return (
		<Suspense
			fallback={
				<main className="dashboard-shell">
					<div className="dashboard-container">
						<section className="panel atlas-panel">Loading Kaggle Atlas…</section>
					</div>
				</main>
			}
		>
			<AtlasRoute params={params} />
		</Suspense>
	);
}

async function AtlasRoute({
	params,
}: {
	params: Promise<{ username: string }>;
}) {
	const { username } = await params;
	return <AtlasExplorer username={username} />;
}
