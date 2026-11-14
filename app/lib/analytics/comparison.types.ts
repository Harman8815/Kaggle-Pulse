import type { TopicDomain } from "./specialization.types";

export type { TopicDomain };

export type ComparisonWindow = "12m" | "24m" | "36m";

export interface WindowMetrics {
	notebooks: number | null;
	datasets: number | null;
	models: number | null;
	competitions: number | null;
	discussions: number | null;
	total: number | null;
}

export interface WindowComparison {
	window: ComparisonWindow;
	label: string;
	periodStart: string | null;
	periodEnd: string | null;
	supported: boolean;
	reason?: string;
	metrics: WindowMetrics;
	activityDensity: number | null;
}

export interface TopicOverlap {
	shared: TopicDomain[];
	uniqueA: TopicDomain[];
	uniqueB: TopicDomain[];
	similarity: number;
	complementary: TopicDomain[];
}

export interface FairComparisonInput {
	userA: {
		username: string;
		registrationDate: string | null;
		activities: Array<{ type: string; date: string | null }>;
	};
	userB: {
		username: string;
		registrationDate: string | null;
		activities: Array<{ type: string; date: string | null }>;
	};
}

export interface FairComparisonResult {
	profileA: { username: string; registrationDate: string | null };
	profileB: { username: string; registrationDate: string | null };
	accountAgeDaysA: number | null;
	accountAgeDaysB: number | null;
	overlappingPeriodDays: number | null;
	periodComparisons: WindowComparison[];
	topicOverlap: TopicOverlap | null;
	summary: string[];
}