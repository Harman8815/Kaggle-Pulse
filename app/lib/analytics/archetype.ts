import type { KaggleActivity, KaggleStats } from "../../utils/api";
import type {
  ArchetypeCategory,
  ArchetypeClassification,
  ArchetypeConfidence,
  ArchetypeScoreModel,
  CategoryAvailability,
  CategoryEvidence,
  ContributionArchetypeResult,
  DataCoverage,
} from "./archetype.types";

export const ARCHETYPE_CATEGORY_ORDER: ArchetypeCategory[] = [
  "Publisher",
  "DatasetCurator",
  "Competitor",
  "CommunityHelper",
  "Educator",
];

export const ARCHETYPE_LABELS: Record<ArchetypeCategory, string> = {
  Competitor: "Competitor",
  Publisher: "Publisher",
  DatasetCurator: "Dataset Curator",
  Educator: "Educator",
  CommunityHelper: "Community Helper",
};

/**
 * v1 scoring model. Equal weights across available contribution types keep the
 * model transparent and avoid arbitrary preference between notebook and dataset
 * publishing. Blocked categories carry weight 0 because their counts are not
 * measured (not assumed to be zero contributions).
 */
export const ARCHETYPE_WEIGHTS: ArchetypeScoreModel = {
  weights: {
    Publisher: 1,
    DatasetCurator: 1,
    Competitor: 0,
    CommunityHelper: 0,
    Educator: 0,
  },
  rationale:
    "Equal weighting of the available evidence keeps v1 transparent and avoids arbitrary preference between notebook and dataset publishing. Blocked categories carry weight 0 because their counts are not measured (not assumed to be zero contributions).",
};

/**
 * Minimum total available contributions for confidence tiers.
 * medium >= 3, high >= 10 (tunable, documented constants per plan decision).
 */
export const ARCHETYPE_MIN_TOTAL_MEDIUM = 3;
export const ARCHETYPE_MIN_TOTAL_HIGH = 10;

/**
 * Secondary share cutoff: an available non-primary category qualifies as a
 * secondary identity when it holds at least this share of the available mix.
 */
export const ARCHETYPE_SECONDARY_SHARE_CUTOFF = 0.15;

/**
 * Count field backing each category in KaggleStats. null means the category is
 * not measurable from current stats (blocked / needs collection).
 */
export const CATEGORY_COUNT_FIELD: Record<ArchetypeCategory, keyof KaggleStats | null> = {
  Publisher: "notebooks",
  DatasetCurator: "datasets",
  Competitor: null,
  CommunityHelper: null,
  Educator: null,
};

/**
 * Per-category availability for the current data capability (plan decision §2).
 * Publisher and Dataset Curator are measurable from stats; Competitor and
 * Community Helper are blocked by unreliable/unavailable feed data; Educator
 * needs collection because no reliable tutorial signal exists in metadata.
 */
export const DEFAULT_CATEGORY_AVAILABILITY: Record<ArchetypeCategory, CategoryAvailability> = {
  Publisher: "available",
  DatasetCurator: "available",
  Competitor: "blocked",
  CommunityHelper: "blocked",
  Educator: "needs_collection",
};

export const CATEGORY_NOTES: Record<ArchetypeCategory, string[]> = {
  Publisher: ["Notebook count taken from profile stats (API-derived)."],
  DatasetCurator: ["Dataset count taken from profile stats (API-derived)."],
  Competitor: [
    "Competition participation is not reliably exposed in the current activity feed.",
    "Count treated as not-measured, not zero.",
  ],
  CommunityHelper: [
    "Discussion, comment and reply contributions are not reliably exposed in the current activity feed.",
    "Count treated as not-measured, not zero.",
  ],
  Educator: [
    "No reliable tutorial / explanatory-content signal exists in current metadata.",
    "Title keywords are not used as a heuristic (avoids false positives).",
  ],
};

export const CATEGORY_MISSING_FIELDS: Record<ArchetypeCategory, string[]> = {
  Publisher: [],
  DatasetCurator: [],
  Competitor: ["competitions", "submissions"],
  CommunityHelper: ["discussions", "comments", "replies"],
  Educator: ["tutorials", "explanatory notebooks", "learning resources"],
};

export const GLOBAL_MISSING_FIELDS = ["account age (registration date)", "votes reliability"];

const ACTIVITY_TYPE_TO_CATEGORY: Record<string, ArchetypeCategory | null> = {
  Notebook: "Publisher",
  Dataset: "DatasetCurator",
  Model: null,
  Competition: null,
  Discussion: null,
};

function safeStats(stats: KaggleStats | undefined): KaggleStats {
  return {
    total: 0,
    notebooks: 0,
    datasets: 0,
    models: 0,
    competitions: 0,
    discussions: 0,
    ...stats,
  };
}

function sumEngagement(activities: KaggleActivity[], category: ArchetypeCategory) {
  let votes = 0;
  let views = 0;
  let downloads = 0;
  for (const activity of activities) {
    if (ACTIVITY_TYPE_TO_CATEGORY[activity.type] !== category) continue;
    votes += activity.votes ?? 0;
    views += activity.views ?? 0;
    downloads += activity.downloads ?? 0;
  }
  return { votes, views, downloads };
}

/**
 * Map raw stats and activities to per-category evidence. Stats are the
 * deterministic source of truth for counts; activities only supply optional
 * engagement signals which are never folded into the quantity score (plan
 * decisions §2/§20). Blocked categories report rawCount 0 and are flagged.
 */
export function categorizeContributions(
  stats: KaggleStats | undefined,
  activities: KaggleActivity[],
): CategoryEvidence[] {
  const s = safeStats(stats);
  return ARCHETYPE_CATEGORY_ORDER.map((category) => {
    const field = CATEGORY_COUNT_FIELD[category];
    const rawCount = field ? (s[field] ?? 0) : 0;
    const availability = DEFAULT_CATEGORY_AVAILABILITY[category];
    const notes = [...CATEGORY_NOTES[category]];
    const engagement = sumEngagement(activities, category);
    const hasEngagement = engagement.votes > 0 || engagement.views > 0 || engagement.downloads > 0;
    if (hasEngagement) {
      notes.push(
        `Engagement signals from activities: ${engagement.votes} votes, ${engagement.views} views, ${engagement.downloads} downloads (not folded into quantity score).`,
      );
    }
    return {
      category,
      label: ARCHETYPE_LABELS[category],
      rawCount,
      availability,
      shareOfAvailable: 0,
      score: 0,
      engagementSignals: hasEngagement ? engagement : undefined,
      notes,
    };
  });
}

/**
 * Compute share of available mix and normalized score (0-1) per category.
 * Denominator is the sum of available-category counts only; blocked categories
 * never enter the denominator. Score uses the documented weight model.
 */
export function scoreCategories(evidence: CategoryEvidence[]): CategoryEvidence[] {
  const available = evidence.filter((e) => e.availability === "available");
  const totalCount = available.reduce((sum, e) => sum + e.rawCount, 0);
  const weightedTotal = available.reduce(
    (sum, e) => sum + ARCHETYPE_WEIGHTS.weights[e.category] * e.rawCount,
    0,
  );
  return evidence.map((e) => ({
    ...e,
    shareOfAvailable:
      totalCount > 0 && e.availability === "available" ? e.rawCount / totalCount : 0,
    score:
      weightedTotal > 0 && e.availability === "available"
        ? (ARCHETYPE_WEIGHTS.weights[e.category] * e.rawCount) / weightedTotal
        : 0,
  }));
}

interface ClassifyInput {
  categories: CategoryEvidence[];
  totalAvailable: number;
}

/**
 * Rule-based classification: primary = highest-score available category
 * (deterministic tiebreak by fixed category order), secondary = other available
 * categories at/above the share cutoff, otherwise the next-ranked runner-up.
 * Confidence reflects data sufficiency (high >= 10, medium >= 3, low > 0,
 * insufficient == 0).
 */
export function classifyArchetype({ categories, totalAvailable }: ClassifyInput): ArchetypeClassification {
  const explanations: string[] = [];
  const available = categories.filter((c) => c.availability === "available");
  const ranked = [...available].sort(
    (a, b) => b.score - a.score || ARCHETYPE_CATEGORY_ORDER.indexOf(a.category) - ARCHETYPE_CATEGORY_ORDER.indexOf(b.category),
  );

  if (totalAvailable === 0 || ranked.length === 0) {
    explanations.push(
      "No available contribution data to classify (notebook and dataset counts are the only measured categories in v1).",
    );
    return {
      primary: null,
      secondary: [],
      strongest: null,
      isHybrid: false,
      confidence: "insufficient",
      explanations,
      archetypeLabel: "Unclassified — insufficient data",
    };
  }

  const primaryCat = ranked[0];
  const primary: ArchetypeCategory = primaryCat.category;
  const runnerUps = ranked.slice(1).filter((c) => c.rawCount > 0);
  const significant = runnerUps.filter((c) => c.shareOfAvailable >= ARCHETYPE_SECONDARY_SHARE_CUTOFF);
  const secondary = significant.length > 0 ? significant : runnerUps.slice(0, 1);

  explanations.push(
    `Primary ${ARCHETYPE_LABELS[primaryCat.category]}: ${primaryCat.rawCount} contribution(s), ${(primaryCat.shareOfAvailable * 100).toFixed(0)}% of available mix (score ${(primaryCat.score * 100).toFixed(0)}).`,
  );
  for (const c of secondary) {
    explanations.push(
      `Secondary ${ARCHETYPE_LABELS[c.category]}: ${c.rawCount} contribution(s), ${(c.shareOfAvailable * 100).toFixed(0)}% of available mix.`,
    );
  }
  if (secondary.length === 0) {
    explanations.push("No secondary category met the non-trivial share threshold; identity is single-category.");
  }

  let confidence: ArchetypeConfidence;
  if (totalAvailable >= ARCHETYPE_MIN_TOTAL_HIGH) confidence = "high";
  else if (totalAvailable >= ARCHETYPE_MIN_TOTAL_MEDIUM) confidence = "medium";
  else confidence = "low";

  const blockedLabels = categories
    .filter((c) => c.availability !== "available")
    .map((c) => ARCHETYPE_LABELS[c.category])
    .join(", ");
  explanations.push(`Coverage incomplete: ${blockedLabels} are not measured in current data (blocked or needs collection).`);

  const archetypeLabel =
    secondary.length > 0 ? `Hybrid: ${available.map((c) => ARCHETYPE_LABELS[c.category]).join(" + ")}` : ARCHETYPE_LABELS[primary];

  return {
    primary,
    secondary: secondary.map((c) => c.category),
    strongest: primary,
    isHybrid: secondary.length > 0,
    confidence,
    explanations,
    archetypeLabel,
  };
}

/**
 * Single reproducible entry point: categorize, score, classify, and assemble the
 * result with data coverage and baseline status. Pure: no Date.now() dependence.
 */
export function buildContributionArchetype(input: {
  stats?: KaggleStats;
  activities: KaggleActivity[];
}): ContributionArchetypeResult {
  const { stats, activities } = input;
  const categorized = scoreCategories(categorizeContributions(stats, activities));
  const totalAvailable = categorized
    .filter((c) => c.availability === "available")
    .reduce((sum, c) => sum + c.rawCount, 0);
  const classification = classifyArchetype({ categories: categorized, totalAvailable });

  const distribution = categorized.map((c) => ({
    category: c.category,
    label: c.label,
    count: c.rawCount,
    share: c.shareOfAvailable,
    score: c.score,
    availability: c.availability,
  }));

  const categoryCoverage: DataCoverage["categories"] = {} as DataCoverage["categories"];
  const missingFieldsSet = new Set<string>(GLOBAL_MISSING_FIELDS);
  let incomplete = false;
  for (const c of categorized) {
    const measured = c.availability === "available";
    const fields = [...(CATEGORY_MISSING_FIELDS[c.category] ?? [])];
    if (!measured) {
      fields.forEach((f) => missingFieldsSet.add(f));
      incomplete = true;
    }
    categoryCoverage[c.category] = { availability: c.availability, measured, missingFields: fields };
  }
  if (totalAvailable === 0) incomplete = true;

  const availableLabels = categorized
    .filter((c) => c.availability === "available")
    .map((c) => c.label)
    .join(", ") || "none";
  const blockedLabels = categorized
    .filter((c) => c.availability !== "available")
    .map((c) => c.label)
    .join(", ");
  const summary =
    totalAvailable === 0
      ? "No measurable contributions. Classification unavailable until notebook or dataset activity is present."
      : `Measured mix across ${availableLabels}.${blockedLabels ? ` Blocked/needs collection: ${blockedLabels}.` : ""} Classification: ${classification.archetypeLabel} (${classification.confidence} confidence).`;

  return {
    categories: categorized,
    classification,
    distribution,
    scoreModel: ARCHETYPE_WEIGHTS,
    dataCoverage: {
      categories: categoryCoverage,
      missingFields: [...missingFieldsSet],
      incomplete,
    },
    baseline: {
      status: "unavailable",
      reason: "No cohort dataset exists yet (peer baselines are a Stage 6 capability; shown as unavailable, not fabricated).",
    },
    summary,
  };
}

export type {
  ArchetypeCategory,
  ArchetypeClassification,
  ArchetypeConfidence,
  ArchetypeDistributionItem,
  ArchetypeScoreModel,
  CategoryAvailability,
  CategoryCoverage,
  CategoryEvidence,
  ContributionArchetypeResult,
  DataCoverage,
  BaselineStatus,
  BuildContributionArchetypeInput,
} from "./archetype.types";
