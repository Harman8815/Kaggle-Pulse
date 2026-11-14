import { NextRequest, NextResponse } from "next/server";
import { buildFairComparison } from "@/app/lib/analytics/comparison";
import { getUserFoundation } from "@/app/lib/kaggle-foundation/foundation";
import { KaggleApiError } from "@/app/lib/kaggle-foundation/pipeline";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;

export async function GET(request: NextRequest) {
	const userA = request.nextUrl.searchParams.get("a")?.trim() ?? "";
	const userB = request.nextUrl.searchParams.get("b")?.trim() ?? "";

	if (!USERNAME_PATTERN.test(userA) || !USERNAME_PATTERN.test(userB)) {
		return NextResponse.json(
			{ error: "Enter two valid Kaggle usernames." },
			{ status: 400 }
		);
	}

	try {
		const [resultA, resultB] = await Promise.all([
			getUserFoundation(userA),
			getUserFoundation(userB),
		]);

		return NextResponse.json({
			comparison: buildFairComparison(resultA.foundation, resultB.foundation),
			accountEvidence: {
				userA: resultA.foundation.activities.length > 0
					? "public_activity_found"
					: "unverified",
				userB: resultB.foundation.activities.length > 0
					? "public_activity_found"
					: "unverified",
			},
		});
	} catch (error) {
		console.error("Kaggle comparison request failed:", error);
		const status = error instanceof KaggleApiError && error.status === 401
			? 502
			: 500;
		return NextResponse.json(
			{
				error: error instanceof Error
					? error.message
					: "Failed to fetch the requested Kaggle profiles.",
			},
			{ status }
		);
	}
}
