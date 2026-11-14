import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildCollaborationNetwork } from "@/app/lib/analytics/network";
import type {
	NetworkRelationship,
	NetworkRelationshipType,
} from "@/app/lib/kaggle-foundation/schemas";
import { repository } from "@/app/lib/kaggle-foundation/foundation";

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,50}$/;
const RELATIONSHIP_TYPES: NetworkRelationshipType[] = [
	"verified_teammate",
	"shared_competition",
	"public_interaction",
];

function isRelationshipType(value: unknown): value is NetworkRelationshipType {
	return (
		typeof value === "string" &&
		RELATIONSHIP_TYPES.some((relationshipType) => relationshipType === value)
	);
}

function isAuthorized(request: NextRequest): boolean {
	const secret = process.env.CRON_SECRET;
	const authorization = request.headers.get("authorization");
	if (!secret || !authorization?.startsWith("Bearer ")) return false;
	const supplied = Buffer.from(authorization.slice("Bearer ".length));
	const expected = Buffer.from(secret);
	return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function parseRelationship(
	value: unknown
): Omit<NetworkRelationship, "id"> | null {
	if (typeof value !== "object" || value === null) return null;
	const item = value as Record<string, unknown>;
	if (
		typeof item.usernameA !== "string" ||
		!USERNAME_PATTERN.test(item.usernameA) ||
		typeof item.usernameB !== "string" ||
		!USERNAME_PATTERN.test(item.usernameB) ||
		item.usernameA.toLowerCase() === item.usernameB.toLowerCase() ||
		!isRelationshipType(item.type) ||
		typeof item.observedAt !== "string" ||
		Number.isNaN(Date.parse(item.observedAt)) ||
		typeof item.sourceUrl !== "string" ||
		typeof item.sourceLabel !== "string" ||
		item.sourceLabel.trim().length === 0 ||
		item.sourceLabel.length > 200
	) {
		return null;
	}

	try {
		const url = new URL(item.sourceUrl);
		if (
			url.protocol !== "https:" ||
			(url.hostname !== "kaggle.com" &&
				!url.hostname.endsWith(".kaggle.com"))
		) {
			return null;
		}
	} catch {
		return null;
	}

	return {
		usernameA: item.usernameA,
		usernameB: item.usernameB,
		type: item.type,
		observedAt: new Date(item.observedAt).toISOString(),
		sourceUrl: item.sourceUrl,
		sourceLabel: item.sourceLabel.trim(),
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
		const relationships = await repository.getAllNetworkRelationships();
		const network = buildCollaborationNetwork(username, relationships);
		return NextResponse.json({
			network,
			dataStatus: network.relationships.length > 0
				? "source_documented_records_available"
				: "no_relationship_records",
			disclaimer:
				"Records are source-documented curated inputs and are not independently verified by Kaggle Pulse. Shared competition participation does not imply teammates or collaboration.",
		});
	} catch (error) {
		console.error(`Collaboration network read failed for ${username}:`, error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to read network data." },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	if (!process.env.CRON_SECRET) {
		return NextResponse.json(
			{ error: "Curated relationship ingestion is not configured." },
			{ status: 503 }
		);
	}
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
	}

	if (
		typeof body !== "object" ||
		body === null ||
		!("relationships" in body) ||
		!Array.isArray(body.relationships) ||
		body.relationships.length === 0 ||
		body.relationships.length > 1000
	) {
		return NextResponse.json(
			{ error: "Provide between 1 and 1000 relationship records." },
			{ status: 400 }
		);
	}

	const parsed = body.relationships.map(parseRelationship);
	if (parsed.some((relationship) => relationship === null)) {
		return NextResponse.json(
			{
				error:
					"Every relationship requires distinct valid usernames, an allowed relationship type, a valid timestamp, a Kaggle HTTPS source URL, and a source label.",
			},
			{ status: 400 }
		);
	}

	const validRelationships = parsed.filter(
		(relationship): relationship is Omit<NetworkRelationship, "id"> =>
			relationship !== null
	);
	const relationships: NetworkRelationship[] = validRelationships.map((value) => {
		const identity = [
			value.usernameA.toLowerCase(),
			value.usernameB.toLowerCase(),
			value.type,
			value.observedAt,
			value.sourceUrl,
		].sort();
		return {
			...value,
			id: createHash("sha256").update(identity.join("|")).digest("hex"),
		};
	});

	try {
		await repository.saveNetworkRelationships(relationships);
		return NextResponse.json({ stored: relationships.length });
	} catch (error) {
		console.error("Curated collaboration relationship write failed:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Failed to store relationships." },
			{ status: 500 }
		);
	}
}
