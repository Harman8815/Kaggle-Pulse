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
		await collectSnapshot(username);
		const { foundation } = await getUserFoundation(username);
		const snapshots = await repository.getSnapshots(username);
		const freshness = await repository.getFreshness(username);
		if (!freshness) {
			throw new Error("Snapshot collection status was not persisted.");
		}
		return NextResponse.json({
			history: buildHistoryResult(username, snapshots),
			profile: foundation.profile,
			availability: foundation.availability,
			freshness,
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
