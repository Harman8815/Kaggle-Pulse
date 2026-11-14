import { extractTopics } from "./specialization";
import type { KaggleActivity } from "../../utils/api";
import type {
	ActivityObservation,
	TopicPulseAnalysis,
	TopicPulseDomain,
} from "../kaggle-foundation/schemas";
import { TOPIC_DOMAIN_ORDER } from "./specialization.types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_TRACKED_PROFILES = 30;
const MIN_HISTORY_DAYS = 180;
const MIN_DOMAIN_ITEMS_PER_WINDOW = 5;
const CHANGE_THRESHOLD = 0.2;

function toActivity(observation: ActivityObservation): KaggleActivity {
	return {
		id: observation.id,
		type: observation.type,
		title: observation.title,
		date: observation.observedAt,
		url: "",
		description: observation.description ?? undefined,
		language: observation.language ?? undefined,
	};
}

export function buildTopicPulseAnalysis(
	observations: ActivityObservation[],
	trackedUsernames: string[]
): TopicPulseAnalysis {
	const byActivity = new Map<string, ActivityObservation>();
	for (const observation of [...observations].sort(
		(a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt)
	)) {
		const key = `${observation.username.toLowerCase()}-${observation.activityId}`;
		if (!byActivity.has(key)) byActivity.set(key, observation);
	}

	const firstObservations = [...byActivity.values()].sort(
		(a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt)
	);
	const timestamps = firstObservations
		.map((observation) => Date.parse(observation.observedAt))
		.filter(Number.isFinite);
	const startedAt = timestamps.length ? Math.min(...timestamps) : null;
	const lastAt = timestamps.length ? Math.max(...timestamps) : null;
	const collectionDays =
		startedAt === null || lastAt === null
			? 0
			: Math.floor((lastAt - startedAt) / DAY_MS) + 1;
	const profilesObserved = new Set(
		firstObservations.map((observation) => observation.username.toLowerCase())
	).size;
	const collectionSupported =
		trackedUsernames.length >= MIN_TRACKED_PROFILES &&
		profilesObserved >= MIN_TRACKED_PROFILES &&
		collectionDays >= MIN_HISTORY_DAYS &&
		firstObservations.length >= MIN_TRACKED_PROFILES;
	const supportReason = collectionSupported
		? "The minimum tracked-profile and observation-window requirements are met. Trends below describe first-observed catalog items in the configured sample, not Kaggle-wide publication rates."
		: `Topic direction requires at least ${MIN_TRACKED_PROFILES} configured and observed profiles plus ${MIN_HISTORY_DAYS} days of first-observation history. Current: ${trackedUsernames.length} configured profiles, ${profilesObserved} observed profiles, ${collectionDays} observation day(s).`;

	const monthly = new Map<string, number>();
	for (const observation of firstObservations) {
		const month = observation.observedAt.slice(0, 7);
		monthly.set(month, (monthly.get(month) ?? 0) + 1);
	}

	const earlyEnd = startedAt === null ? null : startedAt + 90 * DAY_MS;
	const recentStart = lastAt === null ? null : lastAt - 90 * DAY_MS;
	const earlyCounts = new Map<string, number>();
	const recentCounts = new Map<string, number>();
	for (const observation of firstObservations) {
		const classified = extractTopics([toActivity(observation)]);
		const domains = classified.matches[0]?.domains.map((match) => match.domain) ?? [];
		const observedAt = Date.parse(observation.observedAt);
		for (const domain of domains) {
			if (earlyEnd !== null && observedAt >= startedAt! && observedAt < earlyEnd) {
				earlyCounts.set(domain, (earlyCounts.get(domain) ?? 0) + 1);
			}
			if (recentStart !== null && lastAt !== null && observedAt > recentStart && observedAt <= lastAt) {
				recentCounts.set(domain, (recentCounts.get(domain) ?? 0) + 1);
			}
		}
	}

	const domains: TopicPulseDomain[] = TOPIC_DOMAIN_ORDER.map((domain) => {
		const earlyObservations = earlyCounts.get(domain) ?? 0;
		const recentObservations = recentCounts.get(domain) ?? 0;
		const supported =
			collectionSupported &&
			earlyObservations >= MIN_DOMAIN_ITEMS_PER_WINDOW &&
			recentObservations >= MIN_DOMAIN_ITEMS_PER_WINDOW;
		const changePercent =
			supported && earlyObservations > 0
				? ((recentObservations - earlyObservations) / earlyObservations) * 100
				: null;

		return {
			domain,
			earlyObservations,
			recentObservations,
			direction:
				changePercent === null
					? null
					: changePercent >= CHANGE_THRESHOLD * 100
						? "growing"
						: changePercent <= -CHANGE_THRESHOLD * 100
							? "declining"
							: "established",
			changePercent,
			supported,
			reason: supported
				? null
				: !collectionSupported
					? supportReason
					: `At least ${MIN_DOMAIN_ITEMS_PER_WINDOW} first-observed items in both comparison windows are required.`,
		};
	});

	return {
		supported: collectionSupported,
		reason: supportReason,
		collectionStartedAt: startedAt === null ? null : new Date(startedAt).toISOString(),
		lastCollectedAt: lastAt === null ? null : new Date(lastAt).toISOString(),
		collectionDays,
		trackedProfiles: trackedUsernames.length,
		profilesObserved,
		uniqueActivities: firstObservations.length,
		monthlyFirstObservations: [...monthly.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, count]) => ({ month, count })),
		domains,
	};
}
