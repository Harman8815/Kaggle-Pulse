import type {
	CollaborationNetwork,
	NetworkRelationship,
} from "../kaggle-foundation/schemas";

export function buildCollaborationNetwork(
	username: string,
	relationships: NetworkRelationship[]
): CollaborationNetwork {
	const normalized = username.toLowerCase();
	const relevant = relationships.filter(
		(relationship) =>
			relationship.usernameA.toLowerCase() === normalized ||
			relationship.usernameB.toLowerCase() === normalized
	);
	const direct = new Set<string>();
	const secondDegree = new Set<string>();
	for (const relationship of relevant) {
		const neighbor =
			relationship.usernameA.toLowerCase() === normalized
				? relationship.usernameB
				: relationship.usernameA;
		direct.add(neighbor.toLowerCase());
	}

	const allRelationships = relationships;
	for (const neighbor of direct) {
		for (const relationship of allRelationships) {
			const a = relationship.usernameA.toLowerCase();
			const b = relationship.usernameB.toLowerCase();
			if (a === neighbor && b !== normalized && !direct.has(b)) {
				secondDegree.add(b);
			} else if (b === neighbor && a !== normalized && !direct.has(a)) {
				secondDegree.add(a);
			}
		}
	}

	const teammates = new Set<string>();
	const competitionParticipants = new Set<string>();
	const interactionPartners = new Set<string>();
	for (const relationship of relevant) {
		const neighbor =
			relationship.usernameA.toLowerCase() === normalized
				? relationship.usernameB.toLowerCase()
				: relationship.usernameA.toLowerCase();
		if (relationship.type === "verified_teammate") teammates.add(neighbor);
		if (relationship.type === "shared_competition") {
			competitionParticipants.add(neighbor);
		}
		if (relationship.type === "public_interaction") {
			interactionPartners.add(neighbor);
		}
	}

	return {
		username,
		relationships: relevant.sort(
			(a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt)
		),
		directConnections: direct.size,
		secondDegreeConnections: secondDegree.size,
		verifiedTeammates: teammates.size,
		sharedCompetitionParticipants: competitionParticipants.size,
		publicInteractionPartners: interactionPartners.size,
	};
}
