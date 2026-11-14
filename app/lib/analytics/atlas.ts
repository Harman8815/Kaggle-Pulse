import type { KaggleActivity } from "../../utils/api";
import { buildSpecializationFingerprint } from "./specialization";
import { TOPIC_DOMAIN_ORDER, type TopicDomain } from "./specialization.types";
import type {
	AtlasNeighbor,
	AtlasPoint,
	KaggleAtlasResult,
} from "../kaggle-foundation/schemas";

const MINIMUM_ATLAS_PROFILES = 5;
const FEATURE_VERSION = "specialization-share-v1";

interface AtlasProfile {
	username: string;
	activities: KaggleActivity[];
	lastCollectedAt: string | null;
}

interface ProfileVector {
	username: string;
	vector: number[];
	specialization: TopicDomain | null;
}

function buildVector(activities: KaggleActivity[]): {
	vector: number[];
	specialization: TopicDomain | null;
} | null {
	const fingerprint = buildSpecializationFingerprint({ activities });
	if (fingerprint.dataCoverage.totalClassified === 0) return null;
	return {
		vector: TOPIC_DOMAIN_ORDER.map(
			(domain) => fingerprint.topics.find((topic) => topic.domain === domain)?.score ?? 0
		),
		specialization: fingerprint.classification.primary,
	};
}

function normalize(vector: number[]): number[] {
	const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
	return magnitude === 0 ? vector.map(() => 0) : vector.map((value) => value / magnitude);
}

function dot(a: number[], b: number[]): number {
	return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function vectorNorm(vector: number[]): number {
	return Math.sqrt(dot(vector, vector));
}

function subtractProjection(vector: number[], basis: number[]): number[] {
	const projection = dot(vector, basis);
	return vector.map((value, index) => value - projection * basis[index]);
}

function covarianceMatrix(vectors: number[][]): {
	matrix: number[][];
	mean: number[];
} {
	const dimensions = vectors[0].length;
	const mean = dimensions
		? Array.from(
				{ length: dimensions },
				(_, index) =>
					vectors.reduce((sum, vector) => sum + vector[index], 0) /
					vectors.length
			)
		: [];
	const centered = vectors.map((vector) =>
		vector.map((value, index) => value - mean[index])
	);
	const matrix = Array.from({ length: dimensions }, (_, row) =>
		Array.from(
			{ length: dimensions },
			(_, column) =>
				centered.reduce(
					(sum, vector) => sum + vector[row] * vector[column],
					0
				) / Math.max(1, vectors.length - 1)
		)
	);
	return { matrix, mean };
}

function principalComponent(
	matrix: number[][],
	orthogonalTo: number[] | null
): { vector: number[]; eigenvalue: number } | null {
	const dimensions = matrix.length;
	if (dimensions === 0) return null;
	let best: { vector: number[]; eigenvalue: number } | null = null;
	for (let seedIndex = 0; seedIndex < dimensions; seedIndex += 1) {
		const seed = Array.from({ length: dimensions }, (_, index) =>
			index === seedIndex ? 1 : 0
		);
		let vector = orthogonalTo
			? normalize(subtractProjection(seed, orthogonalTo))
			: seed;
		if (vectorNorm(vector) === 0) continue;

		for (let iteration = 0; iteration < 160; iteration += 1) {
			const next = matrix.map((row) => dot(row, vector));
			const orthogonalized = orthogonalTo
				? subtractProjection(next, orthogonalTo)
				: next;
			const magnitude = vectorNorm(orthogonalized);
			if (magnitude < 1e-10) break;
			const normalized = orthogonalized.map((value) => value / magnitude);
			const difference = Math.min(
				vectorNorm(normalized.map((value, index) => value - vector[index])),
				vectorNorm(normalized.map((value, index) => value + vector[index]))
			);
			vector = normalized;
			if (difference < 1e-10) break;
		}

		const eigenvalue = dot(
			vector,
			matrix.map((row) => dot(row, vector))
		);
		if (eigenvalue > (best?.eigenvalue ?? 1e-10)) {
			best = { vector, eigenvalue };
		}
	}
	return best;
}

function deflate(matrix: number[][], component: number[]): number[][] {
	const eigenvalue = dot(component, matrix.map((row) => dot(row, component)));
	return matrix.map((row, i) =>
		row.map((value, j) => value - eigenvalue * component[i] * component[j])
	);
}

function project(vector: number[], mean: number[], component: number[]): number {
	return dot(vector.map((value, index) => value - mean[index]), component);
}

function scale(value: number, min: number, max: number): number {
	if (max - min < 1e-10) return 50;
	return 8 + ((value - min) / (max - min)) * 84;
}

export function buildKaggleAtlas(input: {
	username: string;
	trackedProfiles: AtlasProfile[];
	selectedActivities: KaggleActivity[];
	selectedLastCollectedAt: string | null;
}): KaggleAtlasResult {
	const vectors: ProfileVector[] = input.trackedProfiles
		.map((profile) => {
			const result = buildVector(profile.activities);
			return result
				? {
						username: profile.username,
						vector: normalize(result.vector),
						specialization: result.specialization,
					}
				: null;
		})
		.filter((profile): profile is ProfileVector => profile !== null)
		.sort((a, b) => a.username.localeCompare(b.username));
	const selectedFeature = buildVector(input.selectedActivities);
	const base = {
		username: input.username,
		algorithm: "PCA with deterministic power iteration",
		featureVersion: FEATURE_VERSION,
		sampleSize: vectors.length,
		latestSourceAt: [
			input.selectedLastCollectedAt,
			...input.trackedProfiles.map((profile) => profile.lastCollectedAt),
		]
			.filter((date): date is string => date !== null)
			.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null,
		coverage: {
			trackedProfiles: input.trackedProfiles.length,
			profilesWithClassifiableActivity: vectors.length,
		},
	};

	const unavailable = (reason: string): KaggleAtlasResult => ({
		...base,
		supported: false,
		reason,
		mapPoints: [],
		selectedPoint: null,
		nearestNeighbors: [],
	});

	if (vectors.length < MINIMUM_ATLAS_PROFILES) {
		return unavailable(
			`At least ${MINIMUM_ATLAS_PROFILES} tracked profiles with classifiable activity are needed for a community map; ${vectors.length} currently qualify.`
		);
	}
	const { matrix, mean } = covarianceMatrix(vectors.map((profile) => profile.vector));
	const first = principalComponent(matrix, null);
	if (!first) {
		return unavailable(
			"Tracked profiles have no measurable specialization variance for a meaningful map."
		);
	}
	const second = principalComponent(deflate(matrix, first.vector), first.vector);
	if (!second) {
		return unavailable(
			"Tracked profiles vary in only one measurable direction; a two-dimensional map would be misleading."
		);
	}

	const projected = vectors.map((profile) => ({
		profile,
		x: project(profile.vector, mean, first.vector),
		y: project(profile.vector, mean, second.vector),
	}));
	const selectedProjection = selectedFeature
		? {
				x: project(normalize(selectedFeature.vector), mean, first.vector),
				y: project(normalize(selectedFeature.vector), mean, second.vector),
			}
		: null;
	const xValues = [
		...projected.map((point) => point.x),
		...(selectedProjection ? [selectedProjection.x] : []),
	];
	const yValues = [
		...projected.map((point) => point.y),
		...(selectedProjection ? [selectedProjection.y] : []),
	];
	const minX = Math.min(...xValues);
	const maxX = Math.max(...xValues);
	const minY = Math.min(...yValues);
	const maxY = Math.max(...yValues);
	const mapPoints: AtlasPoint[] = projected.map(({ profile, x, y }) => ({
		username: profile.username,
		x: scale(x, minX, maxX),
		y: scale(y, minY, maxY),
		specialization: profile.specialization,
		selected: profile.username.toLowerCase() === input.username.toLowerCase(),
	}));
	if (!selectedFeature) {
		return {
			...base,
			supported: true,
			reason:
				"The tracked-sample map is available, but the selected user has no classifiable public activity for out-of-sample placement.",
			mapPoints,
			selectedPoint: null,
			nearestNeighbors: [],
		};
	}
	if (!selectedProjection) {
		return unavailable(
			"The selected profile could not be projected into the current tracked sample."
		);
	}
	const selectedVector = normalize(selectedFeature.vector);
	const selectedPoint: AtlasPoint = {
		username: input.username,
		x: scale(selectedProjection.x, minX, maxX),
		y: scale(selectedProjection.y, minY, maxY),
		specialization: selectedFeature.specialization,
		selected: true,
	};
	const nearestNeighbors: AtlasNeighbor[] = vectors
		.filter(
			(profile) =>
				profile.username.toLowerCase() !== input.username.toLowerCase()
		)
		.map((profile) => ({
			username: profile.username,
			similarity: Math.max(0, Math.min(1, dot(selectedVector, profile.vector))),
			specialization: profile.specialization,
		}))
		.sort(
			(a, b) =>
				b.similarity - a.similarity || a.username.localeCompare(b.username)
		)
		.slice(0, 12);

	return {
		...base,
		supported: true,
		reason:
			"Map coordinates use the current tracked sample's PCA basis. The selected user is projected out-of-sample using the same basis; coordinates may shift when the tracked sample changes.",
		mapPoints,
		selectedPoint,
		nearestNeighbors,
	};
}

export type { AtlasPoint, AtlasNeighbor };
