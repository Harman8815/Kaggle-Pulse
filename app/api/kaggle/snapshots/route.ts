import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
	collectSnapshot,
} from "@/app/lib/kaggle-foundation/foundation";

function isAuthorized(request: NextRequest): boolean {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get("authorization");
	if (!secret || !authorization?.startsWith("Bearer ")) return false;

	const supplied = Buffer.from(authorization.slice("Bearer ".length));
	const expected = Buffer.from(secret);
	return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: NextRequest) {
	if (!process.env.CRON_SECRET) {
		return NextResponse.json(
			{ error: "Scheduled snapshot collection is not configured." },
			{ status: 503 }
		);
	}
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const usernames = [...new Set(
		(process.env.KAGGLE_TRACKED_USERS ?? "")
			.split(",")
			.map((username) => username.trim())
			.filter(Boolean)
	)];
	if (usernames.length === 0) {
		return NextResponse.json(
			{ error: "Configure KAGGLE_TRACKED_USERS with comma-separated usernames." },
			{ status: 400 }
		);
	}

	const results: Array<{
		username: string;
		status: "saved" | "failed";
		error?: string;
	}> = [];

	for (const username of usernames) {
		try {
			await collectSnapshot(username);
			results.push({ username, status: "saved" });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Snapshot collection failed";
			console.error(`Scheduled Kaggle snapshot collection failed for ${username}:`, error);
			results.push({ username, status: "failed", error: message });
		}
	}

	return NextResponse.json(
		{ results },
		{ status: results.some((result) => result.status === "failed") ? 207 : 200 }
	);
}
