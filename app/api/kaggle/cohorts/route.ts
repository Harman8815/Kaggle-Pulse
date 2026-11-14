import { NextRequest, NextResponse } from "next/server";
import { buildCohortAnalysis } from "@/app/lib/analytics/cohorts";
import type {
	CohortMetric,
	CohortRecord,
} from "@/app/lib/kaggle-foundation/schemas";
import {
	collectSnapshot,
	getUserFoundation,
	repository,
} from "@/app/lib/kaggle-foundation/foundation";
import { KaggleApiError } from "@/app/lib/kaggle-foundation/pipeline";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

export async function GET(request: NextRequest) {
	const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
	const requestedMetric = request.nextUrl.searchParams.get("metric") ?? "notebooks";
	if (!USERNAME_PATTERN.test(username)) {
		return NextResponse.json(
			{ error: "A valid Kaggle username is required." },
			{ status: 400 }
		);
	}
	if (requestedMetric !== "notebooks" && requestedMetric !== "datasets") {
		return NextResponse.json(
			{ error: "Metric must be notebooks or datasets." },
			{ status: 400 }
		);
	}

	try {
		const [foundationResult, profiles] = await Promise.all([
			getUserFoundation(username),
			repository.getUserProfiles(),
		]);
		const trackedUsernames = new Set(
			(process.env.KAGGLE_TRACKED_USERS ?? "")
				.split(",")
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean)
		);
		const trackedProfiles = profiles.filter((profile) =>
			trackedUsernames.has(profile.username.toLowerCase())
		);

		await collectSnapshot(username, foundationResult.foundation);
		const snapshotLists = await Promise.all(
			trackedProfiles.map((profile) => repository.getSnapshots(profile.username))
		);
		const records: CohortRecord[] = snapshotLists.flatMap((snapshots) => {
			const latest = [...snapshots].sort(
				(a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)
			)[0];
			return latest
				? [{
						username: latest.username,
						notebookCount: latest.notebookCount,
						datasetCount: latest.datasetCount,
						snapshotAt: latest.timestamp,
					}]
				: [];
		});
		const metric = requestedMetric as CohortMetric;
		const userValue =
			metric === "notebooks"
				? foundationResult.foundation.availability.notebooks === "available"
					? foundationResult.foundation.stats.notebooks
					: null
				: foundationResult.foundation.availability.datasets === "available"
					? foundationResult.foundation.stats.datasets
					: null;

		return NextResponse.json({
			analysis: buildCohortAnalysis({
				username,
				metric,
				userValue,
				records,
			}),
			cohortDefinition: {
				label: "Configured tracked Kaggle profiles",
				registrationYear: "unavailable",
				tier: "unavailable",
				specialization: "unavailable",
				populationCoverage: "Unknown; this is a configured sample, not the Kaggle population.",
				metricDefinition:
					"Number of notebook or dataset records returned by the connected single-page Kaggle listing, captured in the latest daily snapshot (maximum 100 per type).",
			},
		});
	} catch (error) {
		console.error(`Kaggle cohort analysis failed for ${username}:`, error);
		return NextResponse.json(
			{
				error: error instanceof KaggleApiError && error.status === 401
					? "Kaggle rejected the configured API credentials."
					: error instanceof Error
						? error.message
						: "Failed to calculate cohort analytics.",
			},
			{ status: error instanceof KaggleApiError && error.status === 401 ? 502 : 500 }
		);
	}
}
