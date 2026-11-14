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

export type CohortMetric = "notebooks" | "datasets";

export interface CohortRecord {
	username: string;
	notebookCount: number | null;
	datasetCount: number | null;
	snapshotAt: string;
}

export interface CohortDistribution {
	sampleSize: number;
	mean: number;
	median: number;
	min: number;
	max: number;
	percentiles: Record<"10" | "25" | "50" | "75" | "90", number>;
}

export interface CohortAnalysis {
	username: string;
	metric: CohortMetric;
	cohort: "tracked-users";
	supported: boolean;
	reason: string | null;
	userValue: number | null;
	userPercentile: number | null;
	minimumSampleSize: number;
	distribution: CohortDistribution | null;
	sampleUpdatedAt: string | null;
	coverage: {
		trackedProfiles: number;
		profilesWithSnapshot: number;
		recordsWithMetric: number;
	};
}

export interface ActivityObservation {
	id: string;
	username: string;
	activityId: string;
	type: ActivityType;
	title: string;
	description: string | null;
	language: string | null;
	activityDate: string | null;
	observedAt: string;
}

export type TopicTrendDirection = "growing" | "declining" | "established";

export interface TopicPulseDomain {
	domain: string;
	earlyObservations: number;
	recentObservations: number;
	direction: TopicTrendDirection | null;
	changePercent: number | null;
	supported: boolean;
	reason: string | null;
}

export interface TopicPulseAnalysis {
	supported: boolean;
	reason: string;
	collectionStartedAt: string | null;
	lastCollectedAt: string | null;
	collectionDays: number;
	trackedProfiles: number;
	profilesObserved: number;
	uniqueActivities: number;
	monthlyFirstObservations: Array<{ month: string; count: number }>;
	domains: TopicPulseDomain[];
}

export type NetworkRelationshipType =
	| "verified_teammate"
	| "shared_competition"
	| "public_interaction";

export interface NetworkRelationship {
	id: string;
	usernameA: string;
	usernameB: string;
	type: NetworkRelationshipType;
	observedAt: string;
	sourceUrl: string;
	sourceLabel: string;
}

export interface CollaborationNetwork {
	username: string;
	relationships: NetworkRelationship[];
	directConnections: number;
	secondDegreeConnections: number;
	verifiedTeammates: number;
	sharedCompetitionParticipants: number;
	publicInteractionPartners: number;
}
