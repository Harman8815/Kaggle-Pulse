import { buildContributionArchetype } from "../app/lib/analytics/archetype.ts";

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

const baseStats = (notebooks: number, datasets: number) => ({
  total: notebooks + datasets,
  notebooks,
  datasets,
  models: 0,
  competitions: 0,
  discussions: 0,
});

const activities = () => [];

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// 1. Notebook-only → Publisher, high confidence
const r1 = buildContributionArchetype({ stats: baseStats(10, 0), activities: activities() });
check("notebook-only primary is Publisher", r1.classification.primary === "Publisher", JSON.stringify(r1.classification.archetypeLabel));
check("notebook-only share 100%", r1.classification.primary === "Publisher" && r1.distribution.find((d) => d.category === "Publisher")?.share === 1);
check("notebook-only high confidence", r1.classification.confidence === "high");
check("notebook-only not hybrid", r1.classification.isHybrid === false);
check("notebook-only Publisher available", r1.distribution.find((d) => d.category === "Publisher")?.availability === "available");
check("notebook-only competitors blocked", r1.distribution.find((d) => d.category === "Competitor")?.availability === "blocked");
check("notebook-only educator needs_collection", r1.distribution.find((d) => d.category === "Educator")?.availability === "needs_collection");
check("notebook-only incomplete", r1.dataCoverage.incomplete === true);

// 2. Dataset-only → Dataset Curator
const r2 = buildContributionArchetype({ stats: baseStats(0, 5), activities: activities() });
check("dataset-only primary is DatasetCurator", r2.classification.primary === "DatasetCurator");
check("dataset-only medium confidence (5 contributions)", r2.classification.confidence === "medium");

// 3. Mixed 6/4 → hybrid, Publisher primary, Dataset Curator secondary
const r3 = buildContributionArchetype({ stats: baseStats(6, 4), activities: activities() });
check("mixed primary Publisher", r3.classification.primary === "Publisher");
check("mixed shares 60/40", Math.abs(r3.distribution.find((d) => d.category === "Publisher")!.share - 0.6) < 1e-9 && Math.abs(r3.distribution.find((d) => d.category === "DatasetCurator")!.share - 0.4) < 1e-9);
check("mixed is hybrid", r3.classification.isHybrid === true);
check("mixed secondary includes DatasetCurator", r3.classification.secondary.includes("DatasetCurator"));
check("mixed high confidence (10 contributions)", r3.classification.confidence === "high");

// 4. Zero contributions → insufficient
const r4 = buildContributionArchetype({ stats: baseStats(0, 0), activities: activities() });
check("zero → insufficient confidence", r4.classification.confidence === "insufficient");
check("zero → no primary", r4.classification.primary === null);
check("zero → incomplete", r4.dataCoverage.incomplete === true);
check("zero → shares empty", r4.distribution.every((d) => d.share === 0));

// 5. Low confidence small N (2 contributions)
const r5 = buildContributionArchetype({ stats: baseStats(2, 0), activities: activities() });
check("low confidence at 2 contributions", r5.classification.confidence === "low");

// 6. Undefined stats treated as zeros
const r6 = buildContributionArchetype({ stats: undefined, activities: activities() });
check("undefined stats → insufficient", r6.classification.confidence === "insufficient");

// 7. Determinism: same input twice → deep equal
const a = buildContributionArchetype({ stats: baseStats(7, 3), activities: activities() });
const b = buildContributionArchetype({ stats: baseStats(7, 3), activities: activities() });
check("deterministic output", deepEqual(a, b));

// 8. Activities engagement signals not folded into score (Publisher count still from stats)
const r8 = buildContributionArchetype({
  stats: baseStats(1, 0),
  activities: [{ type: "Notebook", id: "1", title: "t", date: "2026-01-01", url: "u", votes: 100, views: 1000, downloads: 50 }],
});
check("engagement signals reported", r8.categories.find((c) => c.category === "Publisher")?.engagementSignals?.votes === 100);
check("score unchanged by engagement (1 notebook = 100%)", r8.distribution.find((d) => d.category === "Publisher")!.share === 1);

// 9. Baseline unavailable, never fabricated
check("baseline unavailable", r1.baseline.status === "unavailable" && r1.baseline.reason.includes("cohort"));

// 10. Summary present
check("summary present", typeof r1.summary === "string" && r1.summary.length > 0);

// data coverage fields
check("data coverage has all 5 categories", Object.keys(r1.dataCoverage.categories).length === 5);
check("missing fields include account age", r1.dataCoverage.missingFields.includes("account age (registration date)"));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
