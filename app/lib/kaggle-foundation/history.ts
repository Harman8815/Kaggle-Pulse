import type { HistoryGrowth, HistoryResult, Snapshot } from "./schemas";

const HISTORY_PERIODS = [
	{ label: "7 days", days: 7 },
	{ label: "30 days", days: 30 },
	{ label: "90 days", days: 90 },
	{ label: "365 days", days: 365 },
] as const;

function calculateGrowth(
	snapshots: Snapshot[],
	period: (typeof HISTORY_PERIODS)[number],
	field: "followers" | "notebookCount" | "datasetCount",
	now: Date
): HistoryGrowth {
	const to = snapshots.at(-1);
	const cutoff = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
	const from = [...snapshots]
		.reverse()
		.find((snapshot) => new Date(snapshot.timestamp) <= cutoff);

	if (!to || new Date(to.timestamp) < cutoff || !from) {
		return {
			period: period.label,
			supported: false,
			reason: `Snapshots must cover the full ${period.days}-day interval, including a recent observation.`,
			change: null,
			percent: null,
			from: null,
			to: to?.timestamp ?? null,
		};
	}

	const startValue = from[field];
	const endValue = to[field];
	if (startValue === null || endValue === null) {
		return {
			period: period.label,
			supported: false,
			reason: "This metric was unavailable in one or both snapshots.",
			change: null,
			percent: null,
			from: from.timestamp,
			to: to.timestamp,
		};
	}

	const change = endValue - startValue;
	return {
		period: period.label,
		supported: true,
		change,
		percent: startValue === 0 ? null : (change / startValue) * 100,
		from: from.timestamp,
		to: to.timestamp,
	};
}

export function buildHistoryResult(
	username: string,
	inputSnapshots: Snapshot[],
	now = new Date()
): HistoryResult {
	const snapshots = [...inputSnapshots].sort(
		(a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
	);

	return {
		username,
		snapshots,
		growth: {
			followerGrowth: HISTORY_PERIODS.map((period) =>
				calculateGrowth(snapshots, period, "followers", now)
			),
			notebookGrowth: HISTORY_PERIODS.map((period) =>
				calculateGrowth(snapshots, period, "notebookCount", now)
			),
			datasetGrowth: HISTORY_PERIODS.map((period) =>
				calculateGrowth(snapshots, period, "datasetCount", now)
			),
		},
		rankHistory: snapshots.map(({ day, rank }) => ({ date: day, rank })),
		tierHistory: snapshots.map(({ day, tier }) => ({ date: day, tier })),
		snapshotCount: snapshots.length,
		firstSnapshot: snapshots[0]?.timestamp ?? null,
		lastSnapshot: snapshots.at(-1)?.timestamp ?? null,
	};
}
