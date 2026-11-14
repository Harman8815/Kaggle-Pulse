import type {
	ActivityType,
	DataFreshness,
	DataAvailabilityReport,
	KaggleActivityRecord,
	KaggleContributionStats,
	KaggleMetadata,
	KaggleUserProfile,
	RawKaggleResponse,
} from "./schemas";
import type { KaggleRepository } from "./repository";
import { nowIso } from "./json-storage";

const KAGGLE_API = "https://www.kaggle.com/api/v1";
const KAGGLE_PAGE_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000;

export class KaggleApiError extends Error {
	constructor(readonly status: number, message?: string) {
		super(message ?? `Kaggle API returned ${status}`);
		this.name = "KaggleApiError";
	}
}

interface KaggleAuth extends Record<string, string> {
	Authorization: string;
	Accept: string;
}

function getKaggleAuth(): KaggleAuth {
	const token = process.env.KAGGLE_API_TOKEN;
	const username = process.env.KAGGLE_USERNAME;

	if (!token) {
		throw new Error(
			"KAGGLE_API_TOKEN is missing; set it to a current API token from your Kaggle account's API settings"
		);
	}

	if (!username) {
		throw new Error(
			"KAGGLE_USERNAME is missing; set it to your Kaggle username"
		);
	}

	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/json",
	};
}

interface KaggleItem {
	ref?: string;
	title?: string;
	description?: string;
	lastRunTime?: string;
	lastUpdated?: string;
	totalVotes?: number;
	totalViews?: number;
	downloadCount?: number;
	language?: string;
	tags?: string[];
	[key: string]: unknown;
}

async function fetchKaggleRaw(
	endpoint: string
): Promise<{ data: unknown; etag: string | null; status: number }> {
	const response = await fetch(`${KAGGLE_API}/${endpoint}`, {
		headers: getKaggleAuth(),
		cache: "no-store",
	});

	const etag = response.headers.get("etag") ?? null;

	if (!response.ok) {
		throw new KaggleApiError(response.status);
	}

	const data = await response.json();
	return { data, etag, status: response.status };
}

function normalizeItem(
	item: KaggleItem,
	type: ActivityType,
	username: string
): KaggleActivityRecord {
	const ref = item.ref ?? "";
	const isNotebook = type === "Notebook";

	return {
		username,
		id: `${type}-${ref}`,
		type,
		title: item.title ?? "Untitled",
		description: item.description ?? null,
		date:
			type === "Notebook"
				? (item.lastRunTime ?? null)
				: (item.lastUpdated ?? null),
		url: ref
			? isNotebook
				? `https://www.kaggle.com/code/${ref}`
				: `https://www.kaggle.com/datasets/${ref}`
			: "",
		votes: item.totalVotes ?? null,
		views: item.totalViews ?? null,
		downloads: item.downloadCount ?? null,
		language: item.language ?? null,
		metadata: item,
	};
}

export interface PipelineInput {
	username: string;
	notebooks: KaggleItem[];
	datasets: KaggleItem[];
}

export function buildProfile(
	username: string
): KaggleUserProfile {
	return {
		username,
		profileUrl: `https://www.kaggle.com/${username}`,
		registrationDate: null,
		tier: null,
		followers: null,
		rank: null,
	};
}

export function buildStats(
	activities: KaggleActivityRecord[]
): KaggleContributionStats {
	return {
		total: activities.length,
		notebooks: activities.filter((a) => a.type === "Notebook").length,
		datasets: activities.filter((a) => a.type === "Dataset").length,
		models: activities.filter((a) => a.type === "Model").length,
		competitions: activities.filter(
			(a) => a.type === "Competition"
		).length,
		discussions: activities.filter(
			(a) => a.type === "Discussion"
		).length,
	};
}

export function buildMetadata(
	notebooks: KaggleItem[],
	datasets: KaggleItem[]
): KaggleMetadata {
	return {
		notebooks: notebooks.map((item) => ({
			ref: item.ref ?? "",
			title: item.title ?? "Untitled",
			tags: item.tags,
		})),
		datasets: datasets.map((item) => ({
			ref: item.ref ?? "",
			title: item.title ?? "Untitled",
			tags: item.tags,
		})),
		competitions: [],
	};
}

export function buildFreshness(
	username: string,
	options: {
		lastSuccessfulFetch: string | null;
		lastActivityUpdate: string | null;
		fetchFailures: number;
		incompleteDatasets: string[];
		cacheExpiresAt: string | null;
	}
): DataFreshness {
	return {
		username,
		lastSuccessfulFetch: options.lastSuccessfulFetch,
		lastActivityUpdate: options.lastActivityUpdate,
		lastAnalyticsCalculation: null,
		fetchFailures: options.fetchFailures,
		snapshotCollectionFailures: 0,
		lastSnapshotAttempt: null,
		lastSnapshotError: null,
		incompleteDatasets: options.incompleteDatasets,
		cacheExpiresAt: options.cacheExpiresAt,
	};
}

export function isCacheValid(freshness: DataFreshness | null): boolean {
	if (!freshness?.cacheExpiresAt) return false;
	return new Date(freshness.cacheExpiresAt) > new Date();
}

export async function fetchAndStoreUser(
	username: string,
	repository: KaggleRepository
): Promise<{
	activities: KaggleActivityRecord[];
	profile: KaggleUserProfile;
	stats: KaggleContributionStats;
	metadata: KaggleMetadata;
	freshness: DataFreshness;
	raw: RawKaggleResponse[];
}> {
	const now = nowIso();
	const cacheExpiresAt = new Date(Date.now() + CACHE_TTL).toISOString();

	const [notebooksResult, datasetsResult] = await Promise.all([
		fetchKaggleRaw(
			`kernels/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`
		),
		fetchKaggleRaw(
			`datasets/list?user=${encodeURIComponent(username)}&pageSize=${KAGGLE_PAGE_SIZE}`
		),
	]);

	const notebooks = Array.isArray(notebooksResult.data)
		? notebooksResult.data
		: [];
	const datasets = Array.isArray(datasetsResult.data)
		? datasetsResult.data
		: [];

	const notebookItems = notebooks as KaggleItem[];
	const datasetItems = datasets as KaggleItem[];

	const raw: RawKaggleResponse[] = [
		{
			endpoint: "kernels/list",
			username,
			fetchedAt: now,
			status: notebooksResult.status,
			body: notebooksResult.data,
			etag: notebooksResult.etag,
		},
		{
			endpoint: "datasets/list",
			username,
			fetchedAt: now,
			status: datasetsResult.status,
			body: datasetsResult.data,
			etag: datasetsResult.etag,
		},
	];

	await Promise.all(raw.map((r) => repository.saveRawResponse(r)));

	const activities = [
		...notebookItems.map((item) => normalizeItem(item, "Notebook", username)),
		...datasetItems.map((item) => normalizeItem(item, "Dataset", username)),
	];

	// Deduplicate by id, keeping the most recent copy.
	const seen = new Set<string>();
	const deduped: KaggleActivityRecord[] = [];
	for (const activity of activities) {
		if (seen.has(activity.id)) continue;
		seen.add(activity.id);
		deduped.push(activity);
	}

	const profile = buildProfile(username);
	const stats = buildStats(deduped);
	const metadata = buildMetadata(notebookItems, datasetItems);
	const freshness = buildFreshness(username, {
		lastSuccessfulFetch: now,
		lastActivityUpdate: now,
		fetchFailures: 0,
		incompleteDatasets: [],
		cacheExpiresAt,
	});

	await Promise.all([
		repository.saveUserProfile(profile),
		repository.saveActivities(username, deduped),
		repository.saveFreshness(freshness),
	]);

	return { activities: deduped, profile, stats, metadata, freshness, raw };
}

export function buildAvailabilityReport(
	freshness: DataFreshness,
	activityCount: number
): DataAvailabilityReport {
	const hasActivity = activityCount > 0;

	const availability: DataAvailabilityReport = {
		profile: "available",
		registrationDate: "blocked",
		tier: "blocked",
		followers: "blocked",
		rank: "blocked",
		notebooks: hasActivity ? "available" : "needs_collection",
		datasets: hasActivity ? "available" : "needs_collection",
		models: "blocked",
		competitions: "blocked",
		discussions: "blocked",
		snapshots: "needs_collection",
	};

	if (freshness.incompleteDatasets.length > 0) {
		if (availability.notebooks === "available")
			availability.notebooks = "needs_collection";
		if (availability.datasets === "available")
			availability.datasets = "needs_collection";
	}

	if (freshness.fetchFailures > 0 && !hasActivity) {
		availability.notebooks = "blocked";
		availability.datasets = "blocked";
	}

	return availability;
}
