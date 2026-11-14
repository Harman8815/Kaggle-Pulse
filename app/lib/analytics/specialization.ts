import type { KaggleActivity } from "../../utils/api";
import type {
  ActivityTopicMatch,
  FingerprintClassification,
  FingerprintDataCoverage,
  SpecializationConfidence,
  SpecializationFingerprintResult,
  SpecializationLabel,
  SpecializationScore,
  TopicDomain,
} from "./specialization.types";
import {
  TOPIC_DOMAIN_ORDER,
  TOPIC_LABELS,
  TOPIC_KEYWORD_MAP,
  DEFAULT_DOMAIN_AVAILABILITY,
  SPECIALIZATION_TYPE_WEIGHTS,
  SPECIALIZATION_DOMINANCE_CUTOFF,
  SPECIALIZATION_SECONDARY_SHARE_CUTOFF,
  SPECIALIZATION_MIN_TOTAL_MEDIUM,
  SPECIALIZATION_MIN_TOTAL_HIGH,
  SPECIALIZATION_EMERGING_MAX_ITEMS,
  SPECIALIZATION_MODEL_DOC,
  GLOBAL_MISSING_FIELDS,
} from "./specialization.types";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0)
    .join(" ");
}

function matchesKeyword(paddedBlob: string, keyword: string): boolean {
  const k = normalize(keyword);
  return paddedBlob.includes(" " + k + " ");
}

export function extractTopics(activities: KaggleActivity[]): {
  matches: ActivityTopicMatch[];
  unclassifiedCount: number;
  totalActivities: number;
} {
  const seenTitles = new Set<string>();
  const uniqueActivities: KaggleActivity[] = [];
  for (const activity of activities) {
    const key = normalize(activity.title);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    uniqueActivities.push(activity);
  }

  const matches: ActivityTopicMatch[] = [];
  let unclassifiedCount = 0;
  for (const activity of uniqueActivities) {
    const blob = normalize(`${activity.title} ${activity.description ?? ""} ${activity.language ?? ""}`);
    const paddedBlob = " " + blob + " ";
    const domainMatches: Array<{ domain: TopicDomain; matchedKeywords: string[] }> = [];
    for (const domain of TOPIC_DOMAIN_ORDER) {
      const matchedKeywords: string[] = [];
      for (const keyword of TOPIC_KEYWORD_MAP[domain]) {
        if (matchesKeyword(paddedBlob, keyword)) matchedKeywords.push(keyword);
      }
      if (matchedKeywords.length > 0) {
        domainMatches.push({ domain, matchedKeywords });
      }
    }
    if (domainMatches.length > 0) {
      matches.push({ activityId: activity.id, type: activity.type, domains: domainMatches });
    } else {
      unclassifiedCount += 1;
    }
  }
  return { matches, unclassifiedCount, totalActivities: uniqueActivities.length };
}

export function scoreTopics(matches: ActivityTopicMatch[]): SpecializationScore[] {
  const domainCounts = new Map<TopicDomain, number>();
  const domainWeighted = new Map<TopicDomain, number>();
  const domainKeywords = new Map<TopicDomain, Set<string>>();
  for (const domain of TOPIC_DOMAIN_ORDER) {
    domainCounts.set(domain, 0);
    domainWeighted.set(domain, 0);
    domainKeywords.set(domain, new Set());
  }

  for (const m of matches) {
    const weight = SPECIALIZATION_TYPE_WEIGHTS[m.type] ?? 0.5;
    for (const dm of m.domains) {
      domainCounts.set(dm.domain, (domainCounts.get(dm.domain) ?? 0) + 1);
      domainWeighted.set(dm.domain, (domainWeighted.get(dm.domain) ?? 0) + weight);
      for (const k of dm.matchedKeywords) domainKeywords.get(dm.domain)!.add(k);
    }
  }

  const totalClassified = matches.length;
  const totalWeighted = [...domainWeighted.values()].reduce((sum, v) => sum + v, 0);

  return TOPIC_DOMAIN_ORDER.map((domain) => {
    const count = domainCounts.get(domain) ?? 0;
    const weighted = domainWeighted.get(domain) ?? 0;
    return {
      domain,
      label: TOPIC_LABELS[domain],
      count,
      share: totalClassified > 0 ? count / totalClassified : 0,
      score: totalWeighted > 0 ? weighted / totalWeighted : 0,
      availability: DEFAULT_DOMAIN_AVAILABILITY[domain],
      matchedKeywords: [...domainKeywords.get(domain) ?? []],
    };
  });
}

export function classifySpecialization(input: {
  topics: SpecializationScore[];
  totalClassified: number;
  totalActivities: number;
}): FingerprintClassification {
  const { topics, totalClassified, totalActivities } = input;
  const explanations: string[] = [];
  const available = topics.filter((t) => t.count > 0);
  const ranked = [...available].sort(
    (a, b) => b.score - a.score || TOPIC_DOMAIN_ORDER.indexOf(a.domain) - TOPIC_DOMAIN_ORDER.indexOf(b.domain),
  );

  if (totalClassified === 0) {
    explanations.push(
      "No activity items matched any topic domain from title, description or language metadata.",
    );
    return {
      label: "Unclassified",
      primary: null,
      secondary: [],
      confidence: "insufficient",
      explanations,
    };
  }

  const primary = ranked[0];
  const primaryShare = primary.share;
  const breadth = available.length;
  const runnerUps = ranked.slice(1).filter((t) => t.count > 0);
  const significant = runnerUps.filter((t) => t.share >= SPECIALIZATION_SECONDARY_SHARE_CUTOFF);

  explanations.push(
    `Top domain ${TOPIC_LABELS[primary.domain]}: ${primary.count} item(s), ${(primaryShare * 100).toFixed(0)}% of ${totalClassified} classified item(s) (score ${(primary.score * 100).toFixed(0)}).`,
  );
  for (const s of significant) {
    explanations.push(
      `Secondary ${TOPIC_LABELS[s.domain]}: ${s.count} item(s), ${(s.share * 100).toFixed(0)}% of classified items.`,
    );
  }
  if (significant.length === 0) {
    explanations.push("No secondary domain met the non-trivial share threshold; identity is single-domain.");
  }

  let label: SpecializationLabel;
  if (totalClassified <= SPECIALIZATION_EMERGING_MAX_ITEMS && breadth === 1) {
    label = "Emerging Specialist";
  } else if (primaryShare >= SPECIALIZATION_DOMINANCE_CUTOFF) {
    label = "Specialist";
  } else if (breadth >= 4 && primaryShare < 0.3) {
    label = "Exploratory/Drifting";
  } else if (breadth >= 4) {
    label = "Generalist";
  } else if (significant.length >= 2) {
    label = "Multi-domain Practitioner";
  } else {
    label = "Generalist";
  }

  let confidence: SpecializationConfidence;
  if (totalClassified >= SPECIALIZATION_MIN_TOTAL_HIGH) confidence = "high";
  else if (totalClassified >= SPECIALIZATION_MIN_TOTAL_MEDIUM) confidence = "medium";
  else confidence = "low";

  explanations.push(
    `Breadth: ${breadth} domain(s) represented across ${totalClassified} classified item(s); ${totalActivities - totalClassified} item(s) unclassified.`,
  );
  explanations.push(
    `Confidence: ${confidence} (${totalClassified} classified item(s); high >= ${SPECIALIZATION_MIN_TOTAL_HIGH}, medium >= ${SPECIALIZATION_MIN_TOTAL_MEDIUM}).`,
  );

  return {
    label,
    primary: primary.domain,
    secondary: significant.map((s) => s.domain),
    confidence,
    explanations,
  };
}

export function buildSpecializationFingerprint(input: {
  activities: KaggleActivity[];
}): SpecializationFingerprintResult {
  const { activities } = input;
  const { matches, unclassifiedCount, totalActivities } = extractTopics(activities);
  const topics = scoreTopics(matches);
  const totalClassified = matches.length;
  const classification = classifySpecialization({ topics, totalClassified, totalActivities });

  const domainCoverage: FingerprintDataCoverage["domains"] = {} as FingerprintDataCoverage["domains"];
  const missingFieldsSet = new Set<string>(GLOBAL_MISSING_FIELDS);
  const incomplete = totalClassified === 0;
  for (const topic of topics) {
    domainCoverage[topic.domain] = {
      availability: topic.availability,
      measured: true,
      missingFields: [],
      count: topic.count,
      share: topic.share,
    };
  }

  const domainLabel = (d: TopicDomain | null) => (d ? TOPIC_LABELS[d] : "none");
  const classifiedDomainCount = topics.filter((t) => t.count > 0).length;
  const summary =
    totalClassified === 0
      ? "No activity items matched any topic domain. Specialization unavailable until notebook, dataset or competition metadata contains domain signals."
      : `Classified ${totalClassified} of ${totalActivities} item(s) across ${classifiedDomainCount} domain(s). Primary: ${domainLabel(classification.primary)} (${classification.label}, ${classification.confidence} confidence).`;

  return {
    topics,
    classification,
    dataCoverage: {
      domains: domainCoverage,
      missingFields: [...missingFieldsSet],
      incomplete,
      unclassifiedCount,
      totalClassified,
    },
    scoreModel: {
      weights: SPECIALIZATION_TYPE_WEIGHTS,
      rationale: SPECIALIZATION_MODEL_DOC.rationale,
    },
    baseline: {
      status: "unavailable",
      reason:
        "No cohort dataset exists yet (peer baselines are a future capability; shown as unavailable, not fabricated).",
    },
    summary,
  };
}

export type {
  ActivityTopicMatch,
  DomainCoverage,
  FingerprintClassification,
  FingerprintDataCoverage,
  SpecializationConfidence,
  SpecializationFingerprintResult,
  SpecializationLabel,
  SpecializationScore,
  TopicDomain,
} from "./specialization.types";

export { TOPIC_LABELS };
