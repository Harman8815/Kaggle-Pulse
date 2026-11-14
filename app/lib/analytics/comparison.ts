import type { KaggleActivity } from "../../utils/api";
import { buildSpecializationFingerprint } from "./specialization";
import type {
	FairComparisonResult,
	TopicOverlap,
	WindowComparison,
} from "./comparison.types";
import type { KaggleUserFoundation } from "../kaggle-foundation/schemas";

const COMPARISON_WINDOWS = [
	{ window: "12m", label: "First 12 months", months: 12 },
	{ window: "24m", label: "First 24 months", months: 24 },
	{ window: "36m", label: "First 36 months", months: 36 },
] as const;

function toKaggleActivity(
	activity: KaggleUserFoundation["activities"][number]
): KaggleActivity {
	return {
		id: activity.id,
		type: activity.type,
		title: activity.title,
		date: activity.date,
		url: activity.url,
		description: activity.description ?? undefined,
		language: activity.language ?? undefined,
		metadata: activity.metadata,
	};
}

function buildTopicOverlap(
	userA: KaggleUserFoundation,
	userB: KaggleUserFoundation
): TopicOverlap | null {
	const fingerprintA = buildSpecializationFingerprint({
		activities: userA.activities.map(toKaggleActivity),
	});
	const fingerprintB = buildSpecializationFingerprint({
		activities: userB.activities.map(toKaggleActivity),
	});
	const topicsA = new Set(
		fingerprintA.topics.filter((topic) => topic.count > 0).map((topic) => topic.domain)
	);
	const topicsB = new Set(
		fingerprintB.topics.filter((topic) => topic.count > 0).map((topic) => topic.domain)
	);

	if (topicsA.size === 0 || topicsB.size === 0) return null;

	const shared = [...topicsA].filter((topic) => topicsB.has(topic));
	const uniqueA = [...topicsA].filter((topic) => !topicsB.has(topic));
	const uniqueB = [...topicsB].filter((topic) => !topicsA.has(topic));
	const unionSize = new Set([...topicsA, ...topicsB]).size;

	return {
		shared,
		uniqueA,
		uniqueB,
		similarity: unionSize === 0 ? 0 : shared.length / unionSize,
		complementary: [...uniqueA, ...uniqueB],
	};
}

function buildUnavailableWindows(
	registrationDate: string | null
): WindowComparison[] {
	const validRegistrationDate =
		registrationDate && !Number.isNaN(Date.parse(registrationDate))
			? new Date(registrationDate)
			: null;

	return COMPARISON_WINDOWS.map(({ window, label, months }) => {
		const periodStart = validRegistrationDate?.toISOString() ?? null;
		const periodEnd = validRegistrationDate
			? new Date(
					validRegistrationDate.getTime() + months * 30.4375 * 24 * 60 * 60 * 1000
				).toISOString()
			: null;

		return {
			window,
			label,
			periodStart,
			periodEnd,
			supported: false,
			reason: validRegistrationDate
				? "Complete historical contribution records for this account-age window have not been collected. Current notebook and dataset timestamps represent last updates/runs, not verified creation history."
				: "Kaggle registration date is unavailable, so account-age alignment cannot be established. Complete historical contribution records are also not available.",
			metrics: {
				notebooks: null,
				datasets: null,
				models: null,
				competitions: null,
				discussions: null,
				total: null,
			},
			activityDensity: null,
		};
	});
}

export function buildFairComparison(
	userA: KaggleUserFoundation,
	userB: KaggleUserFoundation,
	now = new Date()
): FairComparisonResult {
	const registrationDateA = userA.profile.registrationDate;
	const registrationDateB = userB.profile.registrationDate;
	const accountAge = (registrationDate: string | null) => {
		if (!registrationDate) return null;
		const timestamp = Date.parse(registrationDate);
		return Number.isNaN(timestamp) || timestamp > now.getTime()
			? null
			: Math.floor((now.getTime() - timestamp) / 86_400_000);
	};
	const accountAgeDaysA = accountAge(registrationDateA);
	const accountAgeDaysB = accountAge(registrationDateB);
	const validA = accountAgeDaysA !== null;
	const validB = accountAgeDaysB !== null;
	const topicOverlap = buildTopicOverlap(userA, userB);

	return {
		profileA: { username: userA.username, registrationDate: registrationDateA },
		profileB: { username: userB.username, registrationDate: registrationDateB },
		accountAgeDaysA,
		accountAgeDaysB,
		overlappingPeriodDays:
			validA && validB ? Math.min(accountAgeDaysA, accountAgeDaysB) : null,
		periodComparisons: buildUnavailableWindows(registrationDateA),
		topicOverlap,
		summary: [
			"Equivalent account-age contribution comparisons are unavailable until Kaggle registration dates and complete historical contribution records can be verified.",
			topicOverlap
				? "Topic overlap is derived from the currently returned public notebook and dataset titles, descriptions, and languages; it is not a measure of collaboration ability."
				: "Topic overlap is unavailable because one or both users have no currently classifiable public activity.",
			"An empty public activity list does not prove that a Kaggle account does not exist.",
		],
	};
}
