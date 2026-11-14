export type ActivityType =
	| "Notebook"
	| "Dataset"
	| "Model"
	| "Competition"
	| "Discussion";

export interface RawKaggleResponse {
	endpoint: string;
	username: string;
	fetchedAt: string;
	status: number;
	body: unknown;
	etag: string | null;
}

export interface KaggleUserProfile {
	username: string;
	profileUrl: string;
	registrationDate: string | null;
	tier: string | null;
	followers: number | null;
	rank: number | null;
}

export interface KaggleContributionStats {
	total: number;
	notebooks: number;
	datasets: number;
	models: number;
	competitions: number;
	discussions: number;
}

export interface KaggleActivityRecord {
	username: string;
	id: string;
	type: ActivityType;
	title: string;
	description: string | null;
	date: string | null;
	url: string;
	votes: number | null;
	views: number | null;
	downloads: number | null;
	language: string | null;
	metadata: Record<string, unknown>;
}

export interface KaggleMetadata {
	notebooks: Array<{ ref: string; title: string; tags?: string[] }>;
	datasets: Array<{ ref: string; title: string; tags?: string[] }>;
	competitions: Array<{ id: string; title: string }>;
}

export interface DataFreshness {
	username: string;
	lastSuccessfulFetch: string | null;
	lastActivityUpdate: string | null;
	lastAnalyticsCalculation: string | null;
	fetchFailures: number;
	snapshotCollectionFailures: number;
	lastSnapshotAttempt: string | null;
	lastSnapshotError: string | null;
	incompleteDatasets: string[];
	cacheExpiresAt: string | null;
}

export type DataAvailability = "available" | "needs_collection" | "blocked";

export interface DataAvailabilityReport {
	profile: DataAvailability;
	registrationDate: DataAvailability;
	tier: DataAvailability;
	followers: DataAvailability;
	rank: DataAvailability;
	notebooks: DataAvailability;
	datasets: DataAvailability;
	models: DataAvailability;
	competitions: DataAvailability;
	discussions: DataAvailability;
	snapshots: DataAvailability;
}

export interface Snapshot {
	id: string;
	username: string;
	timestamp: string;
	day: string;
	followers: number | null;
	rank: number | null;
	tier: string | null;
	notebookCount: number | null;
	datasetCount: number | null;
	competitionCount: number | null;
}

export interface KaggleUserFoundation {
	username: string;
	profile: KaggleUserProfile;
	stats: KaggleContributionStats;
	activities: KaggleActivityRecord[];
	metadata: KaggleMetadata;
	freshness: DataFreshness;
	availability: DataAvailabilityReport;
}

export interface FoundationResult {
	foundation: KaggleUserFoundation;
	fromCache: boolean;
}

// ---- Stage 4: Fair Head-to-Head comparison ----

export type PeriodWindow = "12m" | "24m" | "36m";

export interface PeriodComparison {
	window: PeriodWindow;
	label: string;
	periodStart: string | null;
	periodEnd: string | null;
	supported: boolean;
	reason?: string;
	metrics: {
		notebooks: number;
		datasets: number;
		models: number;
		competitions: number;
		discussions: number;
		total: number;
	};
	activityDensity: number; // contributions per month
}

export interface TopicOverlapResult {
	shared: string[];
	uniqueA: string[];
	uniqueB: string[];
	similarity: number; // 0-1 Jaccard similarity
	complementary: string[];
}

export interface FairComparison {
	profileA: KaggleUserProfile;
	profileB: KaggleUserProfile;
	registrationDateA: string | null;
	registrationDateB: string | null;
	accountAgeDaysA: number | null;
	accountAgeDaysB: number | null;
	overlappingPeriodDays: number | null;
	periodComparisons: PeriodComparison[];
	topicOverlap: TopicOverlapResult | null;
	comparisonSummary: string[];
}

// ---- Stage 5: Personal History Tracker ----

export interface HistoryResult {
	username: string;
	snapshots: Snapshot[];
	growth: {
		followerGrowth: HistoryGrowth[];
		notebookGrowth: HistoryGrowth[];
		datasetGrowth: HistoryGrowth[];
	};
	rankHistory: { date: string; rank: number | null }[];
	tierHistory: { date: string; tier: string | null }[];
	snapshotCount: number;
	firstSnapshot: string | null;
	lastSnapshot: string | null;
}

export interface HistoryGrowth {
	period: string;
	supported: boolean;
	reason?: string;
	change: number | null;
	percent: number | null;
	from: string | null;
	to: string | null;
}
