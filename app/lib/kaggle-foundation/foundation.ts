import type {
	DataAvailability,
	DataFreshness,
	FoundationResult,
	KaggleActivityRecord,
	KaggleUserFoundation,
	Snapshot,
} from "./schemas";
import {
	buildAvailabilityReport,
	buildFreshness,
	buildMetadata,
	buildProfile,
	buildStats,
	fetchAndStoreUser,
	isCacheValid,
} from "./pipeline";
import type {
	KaggleContributionStats,
	KaggleMetadata,
	KaggleUserProfile,
} from "./schemas";
import { JsonKaggleRepository } from "./json-storage";

const repository = new JsonKaggleRepository();

function emptyFreshness(username: string): DataFreshness {
	return buildFreshness(username, {
		lastSuccessfulFetch: null,
		lastActivityUpdate: null,
		fetchFailures: 0,
		incompleteDatasets: [],
		cacheExpiresAt: null,
	});
}

export async function getUserFoundation(
	username: string
): Promise<FoundationResult> {
	const trimmed = username.trim();
	if (!trimmed) {
		throw new Error("Username is required");
	}

	const cachedProfile = await repository.getUserProfile(trimmed);
	const cachedActivities = await repository.getActivities(trimmed);
	const cachedFreshness = await repository.getFreshness(trimmed);

	if (
		isCacheValid(cachedFreshness) &&
		cachedProfile &&
		cachedActivities.length > 0
	) {
		const stats = {
			total: cachedActivities.length,
			notebooks: cachedActivities.filter(
				(a) => a.type === "Notebook"
			).length,
			datasets: cachedActivities.filter(
				(a) => a.type === "Dataset"
			).length,
			models: cachedActivities.filter(
				(a) => a.type === "Model"
			).length,
			competitions: cachedActivities.filter(
				(a) => a.type === "Competition"
			).length,
			discussions: cachedActivities.filter(
				(a) => a.type === "Discussion"
			).length,
		};
		const metadata = {
			notebooks: cachedActivities
				.filter((a) => a.type === "Notebook")
				.map((a) => ({
					ref: a.id.replace(/^Notebook-/, ""),
					title: a.title,
				})),
			datasets: cachedActivities
				.filter((a) => a.type === "Dataset")
				.map((a) => ({
					ref: a.id.replace(/^Dataset-/, ""),
					title: a.title,
				})),
			competitions: [],
		};
		const freshness: DataFreshness = {
			...cachedFreshness,
			lastAnalyticsCalculation: new Date().toISOString(),
		};
		const foundation = buildFoundation(
			trimmed,
			cachedProfile,
			cachedActivities,
			stats,
			metadata,
			freshness
		);
		await repository.saveFreshness(freshness);
		return { foundation, fromCache: true };
	}

	let activities: KaggleActivityRecord[];
	let profile: ReturnType<typeof buildProfile>;
	let stats: ReturnType<typeof buildStats>;
	let metadata: ReturnType<typeof buildMetadata>;
	let freshness: DataFreshness;

	try {
		const result = await fetchAndStoreUser(trimmed, repository);
		activities = result.activities;
		profile = result.profile;
		stats = result.stats;
		metadata = result.metadata;
		freshness = result.freshness;
	} catch (error) {
		if (cachedProfile && cachedActivities.length > 0) {
			const stale: DataFreshness = {
				...cachedFreshness ?? emptyFreshness(trimmed),
				fetchFailures: (cachedFreshness?.fetchFailures ?? 0) + 1,
				lastAnalyticsCalculation: new Date().toISOString(),
			};
			await repository.saveFreshness(stale);
			const foundation = buildFoundation(
				trimmed,
				cachedProfile,
				cachedActivities,
				{
					total: cachedActivities.length,
					notebooks: cachedActivities.filter(
						(a) => a.type === "Notebook"
					).length,
					datasets: cachedActivities.filter(
						(a) => a.type === "Dataset"
					).length,
					models: cachedActivities.filter(
						(a) => a.type === "Model"
					).length,
					competitions: cachedActivities.filter(
						(a) => a.type === "Competition"
					).length,
					discussions: cachedActivities.filter(
						(a) => a.type === "Discussion"
					).length,
				},
				{
					notebooks: cachedActivities
						.filter((a) => a.type === "Notebook")
						.map((a) => ({
							ref: a.id.replace(/^Notebook-/, ""),
							title: a.title,
						})),
					datasets: cachedActivities
						.filter((a) => a.type === "Dataset")
						.map((a) => ({
							ref: a.id.replace(/^Dataset-/, ""),
							title: a.title,
						})),
					competitions: [],
				},
				stale
			);
			return { foundation, fromCache: true };
		}
		throw error;
	}

	const foundation = buildFoundation(
		trimmed,
		profile,
		activities,
		stats,
		metadata,
		freshness
	);
	return { foundation, fromCache: false };
}

function buildFoundation(
	username: string,
	profile: KaggleUserProfile,
	activities: KaggleActivityRecord[],
	stats: KaggleContributionStats,
	metadata: KaggleMetadata,
	freshness: DataFreshness
): KaggleUserFoundation {
	const availability: DataAvailability = buildAvailabilityReport(
		freshness,
		activities.length
	);

	return {
		username,
		profile,
		stats,
		activities,
		metadata,
		freshness,
		availability,
	};
}

export async function collectSnapshot(
	username: string
): Promise<Snapshot | null> {
	const trimmed = username.trim();
	if (!trimmed) return null;

	const day = new Date().toISOString().slice(0, 10);

	const existing = await repository.getSnapshotForDay(trimmed, day);
	if (existing) return existing;

	const { foundation } = await getUserFoundation(trimmed);

	const snapshot: Snapshot = {
		id: `${trimmed}-${day}`,
		username: trimmed,
		timestamp: new Date().toISOString(),
		day,
		followers: foundation.profile.followers,
		rank: foundation.profile.rank,
		tier: foundation.profile.tier,
		notebookCount: foundation.stats.notebooks,
		datasetCount: foundation.stats.datasets,
		competitionCount: foundation.stats.competitions,
	};

	await repository.saveSnapshot(snapshot);
	return snapshot;
}

export { repository };
