import { NextResponse } from "next/server";
import { buildTopicPulseAnalysis } from "@/app/lib/analytics/topic-pulse";
import { repository } from "@/app/lib/kaggle-foundation/foundation";

export async function GET() {
	const trackedUsernames = [...new Set(
		(process.env.KAGGLE_TRACKED_USERS ?? "")
			.split(",")
			.map((username) => username.trim())
			.filter(Boolean)
	)];
	try {
		const observations =
			await repository.getActivityObservations(trackedUsernames);
		return NextResponse.json({
			analysis: buildTopicPulseAnalysis(observations, trackedUsernames),
			dataSemantics: {
				timestamps:
					"First-observed timestamps are when this platform collected a public activity item. Kaggle lastRunTime/lastUpdated fields are not treated as publication dates.",
				coverage:
					"Only configured KAGGLE_TRACKED_USERS and the current single-page notebook/dataset responses are included.",
				retentionDays: 730,
			},
		});
	} catch (error) {
		console.error("Kaggle Topic Pulse read failed:", error);
		return NextResponse.json(
			{
				error: error instanceof Error
					? error.message
					: "Failed to read collected topic observations.",
			},
			{ status: 500 }
		);
	}
}
