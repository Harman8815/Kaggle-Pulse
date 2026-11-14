import { NextRequest, NextResponse } from "next/server";
import type { KaggleActivity } from "@/app/utils/api";
import { buildKaggleAtlas } from "@/app/lib/analytics/atlas";
import {
	getUserFoundation,
	repository,
} from "@/app/lib/kaggle-foundation/foundation";
import { KaggleApiError } from "@/app/lib/kaggle-foundation/pipeline";
import type { KaggleActivityRecord } from "@/app/lib/kaggle-foundation/schemas";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

function toActivity(
	activity: KaggleActivityRecord
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

export async function GET(request: NextRequest) {
	const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
	if (!USERNAME_PATTERN.test(username)) {
		return NextResponse.json(
			{ error: "A valid Kaggle username is required." },
			{ status: 400 }
		);
	}

	try {
		const configured = new Set(
			(process.env.KAGGLE_TRACKED_USERS ?? "")
				.split(",")
				.map((value) => value.trim().toLowerCase())
				.filter(Boolean)
		);
		const profiles = (await repository.getUserProfiles()).filter((profile) =>
			configured.has(profile.username.toLowerCase())
		);
		const [selectedResult, trackedProfiles] = await Promise.all([
			getUserFoundation(username),
			Promise.all(
				profiles.map(async (profile) => {
					const [activities, freshness] = await Promise.all([
						repository.getActivities(profile.username),
						repository.getFreshness(profile.username),
					]);
					return {
						username: profile.username,
						activities: activities.map(toActivity),
						lastCollectedAt: freshness?.lastSuccessfulFetch ?? null,
					};
				})
			),
		]);

		const selectedActivities =
			selectedResult.foundation.freshness.fetchFailures > 0
				? []
				: selectedResult.foundation.activities.map((activity) =>
						toActivity(activity)
					);
		const atlas = buildKaggleAtlas({
			username,
			trackedProfiles,
			selectedActivities,
			selectedLastCollectedAt:
				selectedResult.foundation.freshness.fetchFailures > 0
					? null
					: selectedResult.foundation.freshness.lastSuccessfulFetch,
		});
		return NextResponse.json({
			atlas,
			selectedProfileStale:
				selectedResult.foundation.freshness.fetchFailures > 0,
			scope:
				"Configured KAGGLE_TRACKED_USERS with stored public notebooks and datasets; this is not a complete Kaggle community map.",
		});
	} catch (error) {
		console.error(`Kaggle Atlas request failed for ${username}:`, error);
		return NextResponse.json(
			{
				error: error instanceof KaggleApiError && error.status === 401
					? "Kaggle rejected the configured API credentials."
					: error instanceof Error
						? error.message
						: "Failed to build the Kaggle Atlas view.",
			},
			{ status: error instanceof KaggleApiError && error.status === 401 ? 502 : 500 }
		);
	}
}
