import { NextRequest, NextResponse } from "next/server";
import {
	collectSnapshot,
	getUserFoundation,
	repository,
} from "@/app/lib/kaggle-foundation/foundation";
import { buildHistoryResult } from "@/app/lib/kaggle-foundation/history";
import { KaggleApiError } from "@/app/lib/kaggle-foundation/pipeline";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

export async function GET(request: NextRequest) {
	const username = request.nextUrl.searchParams.get("username")?.trim() ?? "";
	if (!USERNAME_PATTERN.test(username)) {
		return NextResponse.json(
			{ error: "A valid Kaggle username is required." },
			{ status: 400 }
		);
	}

	try {
		const { foundation } = await getUserFoundation(username);

		let snapshotCollection: { status: "saved" | "failed"; message?: string } = { status: "saved" };
		try {
			await collectSnapshot(username, foundation);
		} catch (error) {
			snapshotCollection = {
				status: "failed",
				message: error instanceof Error ? error.message : "Snapshot collection failed",
			};
		}

		const [snapshots, freshness] = await Promise.all([
			repository.getSnapshots(username),
			repository.getFreshness(username),
		]);

		const safeFreshness = freshness ?? foundation.freshness;

		return NextResponse.json({
			history: buildHistoryResult(username, snapshots),
			profile: foundation.profile,
			availability: foundation.availability,
			freshness: safeFreshness,
			snapshotCollection,
		});
	} catch (error) {
		console.error(`Kaggle history request failed for ${username}:`, error);
		return NextResponse.json(
			{
				error: error instanceof KaggleApiError && error.status === 401
					? "Kaggle rejected the configured API credentials."
					: error instanceof Error
						? error.message
						: "Failed to load Kaggle history.",
			},
			{ status: error instanceof KaggleApiError && error.status === 401 ? 502 : 500 }
		);
	}
}
