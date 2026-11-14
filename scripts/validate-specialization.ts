import { buildSpecializationFingerprint } from "../app/lib/analytics/specialization";
import type { KaggleActivity } from "../app/utils/api";

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

const activity = (overrides: {
  type: KaggleActivity["type"];
  id: string;
  title: string;
  date?: string;
  url?: string;
  description?: string;
  language?: string;
}): KaggleActivity => ({
  type: overrides.type,
  id: overrides.id,
  title: overrides.title,
  date: overrides.date ?? "2026-01-01",
  url: overrides.url ?? `https://kaggle.com/code/${overrides.id}`,
  description: overrides.description,
  language: overrides.language,
});

let failures = 0;
function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS: ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const mlNotebooks = Array.from({ length: 8 }, (_, i) =>
  activity({ type: "Notebook", id: `ml-${i}`, title: `Machine Learning Random Forest Tutorial ${i}`, description: "scikit-learn random forest classification tutorial" }),
);

const spreadActivities = [
  activity({ type: "Notebook", id: "s-ml-1", title: "Machine Learning Basics", description: "scikit-learn tutorial" }),
  activity({ type: "Notebook", id: "s-ml-2", title: "ML Regression", description: "linear regression scikit-learn" }),
  activity({ type: "Notebook", id: "s-ds-1", title: "Data Science EDA", description: "pandas exploratory data analysis" }),
  activity({ type: "Dataset", id: "s-ds-2", title: "Data Science Cleaning", description: "data cleaning pandas numpy" }),
  activity({ type: "Notebook", id: "s-dl-1", title: "Deep Learning Intro", description: "neural network pytorch" }),
];

const multiDomainActivities = [
  activity({ type: "Notebook", id: "m-ml-1", title: "ML Classification", description: "scikit-learn classification" }),
  activity({ type: "Notebook", id: "m-ml-2", title: "ML Regression", description: "linear regression" }),
  activity({ type: "Notebook", id: "m-ml-3", title: "ML Clustering", description: "k-means clustering" }),
  activity({ type: "Dataset", id: "m-ds-1", title: "DS EDA", description: "pandas exploratory analysis" }),
  activity({ type: "Dataset", id: "m-ds-2", title: "DS Viz", description: "matplotlib seaborn visualization" }),
  activity({ type: "Notebook", id: "m-dl-1", title: "DL CNN", description: "convolutional neural network pytorch" }),
  activity({ type: "Notebook", id: "m-dl-2", title: "DL RNN", description: "recurrent neural network lstm" }),
];

const unclassifiedActivities = [
  activity({ type: "Notebook", id: "u-1", title: "Untitled notebook", description: "some random text without domain signals" }),
  activity({ type: "Dataset", id: "u-2", title: "My dataset", description: "just a data file" }),
];

// 1. ML-heavy → Specialist
const r1 = buildSpecializationFingerprint({ activities: mlNotebooks });
check("ml-heavy primary is Machine Learning", r1.classification.primary === "Machine Learning", JSON.stringify(r1.classification));
check("ml-heavy label Specialist", r1.classification.label === "Specialist");
check("ml-heavy share 100%", r1.topics.find((t) => t.domain === "Machine Learning")?.share === 1);
check("ml-heavy medium confidence (8 items)", r1.classification.confidence === "medium");
check("ml-heavy unclassified 0", r1.dataCoverage.unclassifiedCount === 0);
check("ml-heavy total classified 8", r1.dataCoverage.totalClassified === 8);

// 2. Spread across 5 domains, no dominant → Multi-domain Practitioner (4 significant secondaries)
const r2 = buildSpecializationFingerprint({ activities: spreadActivities });
check("spread label Multi-domain Practitioner", r2.classification.label === "Multi-domain Practitioner", JSON.stringify(r2.classification.label));
check("spread primary Machine Learning", r2.classification.primary === "Machine Learning");
check("spread medium confidence (5 items)", r2.classification.confidence === "medium");
check("spread total classified 5", r2.dataCoverage.totalClassified === 5);

// 2b. Spread thin across 4 domains, no dominant → Generalist
const generalistActivities = [
  activity({ type: "Notebook", id: "g-ml-1", title: "Machine Learning Tutorial 1", description: "scikit-learn classification" }),
  activity({ type: "Notebook", id: "g-ml-2", title: "Machine Learning Tutorial 2", description: "linear regression" }),
  activity({ type: "Notebook", id: "g-ds-1", title: "Data Science EDA", description: "pandas exploratory analysis" }),
  activity({ type: "Notebook", id: "g-dl-1", title: "Deep Learning Intro", description: "neural network pytorch" }),
  activity({ type: "Notebook", id: "g-cv-1", title: "CV Basics", description: "computer vision basics" }),
];
const r2b = buildSpecializationFingerprint({ activities: generalistActivities });
check("generalist label Generalist", r2b.classification.label === "Generalist", JSON.stringify(r2b.classification.label));
check("generalist primary Machine Learning", r2b.classification.primary === "Machine Learning");
check("generalist medium confidence (5 items)", r2b.classification.confidence === "medium");
check("generalist breadth 4", r2b.topics.filter((t) => t.count > 0).length === 4);

// 3. Multi-domain: 3 domains, no single dominant, 2+ significant
const r3 = buildSpecializationFingerprint({ activities: multiDomainActivities });
check("multi-domain label Multi-domain Practitioner", r3.classification.label === "Multi-domain Practitioner", JSON.stringify(r3.classification.label));
check("multi-domain primary Machine Learning", r3.classification.primary === "Machine Learning");
check("multi-domain secondaries present", r3.classification.secondary.length >= 1);
check("multi-domain medium confidence (7 items)", r3.classification.confidence === "medium");

// 4. Zero activities → Unclassified, insufficient
const r4 = buildSpecializationFingerprint({ activities: [] });
check("zero → Unclassified", r4.classification.label === "Unclassified");
check("zero → insufficient confidence", r4.classification.confidence === "insufficient");
check("zero → no primary", r4.classification.primary === null);
check("zero → incomplete", r4.dataCoverage.incomplete === true);
check("zero → total classified 0", r4.dataCoverage.totalClassified === 0);
check("zero → shares all 0", r4.topics.every((t) => t.share === 0));

// 5. All unclassified titles → Unclassified, insufficient
const r5 = buildSpecializationFingerprint({ activities: unclassifiedActivities });
check("all-unclassified → Unclassified", r5.classification.label === "Unclassified");
check("all-unclassified → insufficient", r5.classification.confidence === "insufficient");
check("all-unclassified → unclassified count 2", r5.dataCoverage.unclassifiedCount === 2);
check("all-unclassified → total classified 0", r5.dataCoverage.totalClassified === 0);

// 6. Dedup by title: duplicate title counted once
const dupActivities = [
  activity({ type: "Notebook", id: "d-1", title: "Machine Learning Tutorial", description: "scikit-learn" }),
  activity({ type: "Notebook", id: "d-2", title: "Machine Learning Tutorial", description: "scikit-learn" }),
  activity({ type: "Notebook", id: "d-3", title: "Deep Learning Intro", description: "pytorch neural network" }),
];
const r6 = buildSpecializationFingerprint({ activities: dupActivities });
check("dedup → total classified 2", r6.dataCoverage.totalClassified === 2, JSON.stringify(r6.dataCoverage.totalClassified));
check("dedup → ML count 1", r6.topics.find((t) => t.domain === "Machine Learning")?.count === 1);

// 7. Determinism: same input twice → deep equal
const a = buildSpecializationFingerprint({ activities: spreadActivities });
const b = buildSpecializationFingerprint({ activities: spreadActivities });
check("deterministic output", deepEqual(a, b));

// 8. Data coverage has all 9 domains
check("coverage has 9 domains", Object.keys(r1.dataCoverage.domains).length === 9);
// 9. Missing fields include topic tags
check("missing fields include topic tags", r1.dataCoverage.missingFields.includes("topic tags (not exposed in current activity feed)"));
// 10. Baseline unavailable
check("baseline unavailable", r1.baseline.status === "unavailable" && r1.baseline.reason.includes("cohort"));
// 11. Summary present
check("summary present", typeof r1.summary === "string" && r1.summary.length > 0);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
