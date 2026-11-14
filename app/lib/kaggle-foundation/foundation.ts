import type {
	DataAvailabilityReport,
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
			...(cachedFreshness ?? emptyFreshness(trimmed)),
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
				...(cachedFreshness ?? emptyFreshness(trimmed)),
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
	const availability: DataAvailabilityReport = buildAvailabilityReport(
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
	username: string,
	foundation?: KaggleUserFoundation
): Promise<Snapshot | null> {
	const trimmed = username.trim();
	if (!trimmed) return null;

	try {
		const day = new Date().toISOString().slice(0, 10);
		const existing = await repository.getSnapshotForDay(trimmed, day);
		if (existing) {
			await recordSnapshotAttempt(trimmed);
			return existing;
		}

		const currentFoundation =
			foundation ?? (await getUserFoundation(trimmed)).foundation;
		if (currentFoundation.freshness.fetchFailures > 0) {
			throw new Error(
				"Snapshot collection was skipped because the available profile data is stale after a failed Kaggle refresh."
			);
		}
		const snapshot: Snapshot = {
			id: `${trimmed}-${day}`,
			username: trimmed,
			timestamp: new Date().toISOString(),
			day,
			followers: currentFoundation.profile.followers,
			rank: currentFoundation.profile.rank,
			tier: currentFoundation.profile.tier,
			notebookCount: currentFoundation.availability.notebooks === "available"
				? currentFoundation.stats.notebooks
				: null,
			datasetCount: currentFoundation.availability.datasets === "available"
				? currentFoundation.stats.datasets
				: null,
			competitionCount: currentFoundation.availability.competitions === "available"
				? currentFoundation.stats.competitions
				: null,
		};

		await repository.saveSnapshot(snapshot);
		await recordSnapshotAttempt(trimmed);
		return snapshot;
	} catch (error) {
		await recordSnapshotAttempt(
			trimmed,
			error instanceof Error ? error.message : "Snapshot collection failed"
		);
		throw error;
	}
}

async function recordSnapshotAttempt(
	username: string,
	errorMessage: string | null = null
): Promise<void> {
	const existing = await repository.getFreshness(username);
	const freshness = existing ?? emptyFreshness(username);
	await repository.saveFreshness({
		...freshness,
		snapshotCollectionFailures:
			(freshness.snapshotCollectionFailures ?? 0) + (errorMessage ? 1 : 0),
		lastSnapshotAttempt: new Date().toISOString(),
		lastSnapshotError: errorMessage,
	});
}

export { repository };
