import { NextRequest, NextResponse } from "next/server";
import type { KaggleActivity } from "@/utils/api";
import { getUserFoundation } from "@/app/lib/kaggle-foundation/foundation";
import { KaggleApiError } from "@/app/lib/kaggle-foundation/pipeline";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;

	try {
		const username =
			searchParams.get("username") || process.env.NEXT_PUBLIC_USERNAME;

		if (!username?.trim()) {
			return NextResponse.json(
				{ error: "Username is required" },
				{ status: 400 }
			);
		}

		const { foundation, fromCache } = await getUserFoundation(username.trim());

		const activities: KaggleActivity[] = foundation.activities.map(
			(activity) => ({
				id: activity.id,
				type: activity.type,
				title: activity.title,
				date: activity.date,
				url: activity.url,
				description: activity.description,
				votes: activity.votes,
				views: activity.views,
				downloads: activity.downloads,
				language: activity.language,
				metadata: activity.metadata,
			})
		);

		const stats = {
			total: foundation.stats.total,
			notebooks: foundation.stats.notebooks,
			datasets: foundation.stats.datasets,
			models: foundation.stats.models,
			competitions: foundation.stats.competitions,
			discussions: foundation.stats.discussions,
		};

		return NextResponse.json(
			{
				username: foundation.username,
				profileUrl: foundation.profile.profileUrl,
				activities,
				stats,
				cached: fromCache,
				freshness: {
					lastSuccessfulFetch: foundation.freshness.lastSuccessfulFetch,
					lastActivityUpdate: foundation.freshness.lastActivityUpdate,
					cacheExpiresAt: foundation.freshness.cacheExpiresAt,
					fetchFailures: foundation.freshness.fetchFailures,
					incompleteDatasets: foundation.freshness.incompleteDatasets,
				},
			},
			{
				headers: {
					"Cache-Control": `public, s-maxage=${CACHE_TTL / 1000}, stale-while-revalidate=600`,
				},
			}
		);
	} catch (error) {
		console.error("Kaggle API error:", error);

		if (error instanceof KaggleApiError && error.status === 401) {
			return NextResponse.json(
				{
					error:
						"Kaggle rejected the configured credentials. Set KAGGLE_API_TOKEN to a current API token from your Kaggle account's API settings, then restart the server.",
				},
				{ status: 502 }
			);
		}

		return NextResponse.json(
			{
				error: error instanceof Error
					? error.message
					: "Failed to fetch Kaggle data",
			},
			{ status: 500 }
		);
	}
}
