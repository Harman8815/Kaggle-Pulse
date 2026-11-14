import type {
	CohortAnalysis,
	CohortMetric,
	CohortRecord,
} from "../kaggle-foundation/schemas";

export const MINIMUM_COHORT_SIZE = 30;

function quantile(values: number[], percentile: number): number {
	const position = (values.length - 1) * percentile;
	const lower = Math.floor(position);
	const upper = Math.ceil(position);
	const weight = position - lower;
	return values[lower] * (1 - weight) + values[upper] * weight;
}

export function buildCohortAnalysis(input: {
	username: string;
	metric: CohortMetric;
	userValue: number | null;
	records: CohortRecord[];
	minimumSampleSize?: number;
}): CohortAnalysis {
	const minimumSampleSize = input.minimumSampleSize ?? MINIMUM_COHORT_SIZE;
	const metricField =
		input.metric === "notebooks" ? "notebookCount" : "datasetCount";
	const validRecords = input.records.filter((record) => {
		const value = record[metricField];
		return value !== null && Number.isFinite(value) && value >= 0;
	});
	const values = validRecords
		.map((record) => record[metricField]!)
		.sort((a, b) => a - b);
	const sampleUpdatedAt =
		validRecords
			.map((record) => record.snapshotAt)
			.filter((date) => !Number.isNaN(Date.parse(date)))
			.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;

	const base = {
		username: input.username,
		metric: input.metric,
		cohort: "tracked-users" as const,
		userValue: input.userValue,
		minimumSampleSize,
		sampleUpdatedAt,
		coverage: {
			trackedProfiles: input.records.length,
			profilesWithSnapshot: new Set(input.records.map((record) => record.username))
				.size,
			recordsWithMetric: validRecords.length,
		},
	};

	if (values.length < minimumSampleSize) {
		return {
			...base,
			supported: false,
			reason: `At least ${minimumSampleSize} tracked profiles with this metric are required; ${values.length} currently qualify. This tracked sample is not a representative Kaggle population.`,
			userPercentile: null,
			distribution: null,
		};
	}

	if (input.userValue === null || !Number.isFinite(input.userValue)) {
		return {
			...base,
			supported: false,
			reason: "The selected user's metric is unavailable.",
			userPercentile: null,
			distribution: null,
		};
	}

	const countBelow = values.filter((value) => value < input.userValue!).length;
	const countEqual = values.filter((value) => value === input.userValue).length;
	const percentile =
		((countBelow + 0.5 * countEqual) / values.length) * 100;
	const median =
		values.length % 2 === 0
			? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
			: values[Math.floor(values.length / 2)];

	return {
		...base,
		supported: true,
		reason: null,
		userPercentile: percentile,
		distribution: {
			sampleSize: values.length,
			mean: values.reduce((sum, value) => sum + value, 0) / values.length,
			median,
			min: values[0],
			max: values[values.length - 1],
			percentiles: {
				"10": quantile(values, 0.1),
				"25": quantile(values, 0.25),
				"50": quantile(values, 0.5),
				"75": quantile(values, 0.75),
				"90": quantile(values, 0.9),
			},
		},
	};
}
