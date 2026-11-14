import type { KaggleActivity, KaggleStats } from "../../utils/api";

export type ArchetypeCategory = "Competitor" | "Publisher" | "DatasetCurator" | "Educator" | "CommunityHelper";

export type CategoryAvailability = "available" | "blocked" | "needs_collection";

export type ArchetypeConfidence = "high" | "medium" | "low" | "insufficient";

export interface CategoryEvidence {
  category: ArchetypeCategory;
  label: string;
  rawCount: number;
  availability: CategoryAvailability;
  shareOfAvailable: number;
  score: number;
  engagementSignals?: { votes: number; views: number; downloads: number };
  notes: string[];
}

export interface ArchetypeScoreModel {
  weights: Record<ArchetypeCategory, number>;
  rationale: string;
}

export interface ArchetypeClassification {
  primary: ArchetypeCategory | null;
  secondary: ArchetypeCategory[];
  strongest: ArchetypeCategory | null;
  isHybrid: boolean;
  confidence: ArchetypeConfidence;
  explanations: string[];
  archetypeLabel: string;
}

export interface CategoryCoverage {
  availability: CategoryAvailability;
  measured: boolean;
  missingFields: string[];
}

export interface DataCoverage {
  categories: Record<ArchetypeCategory, CategoryCoverage>;
  missingFields: string[];
  incomplete: boolean;
}

export interface BaselineStatus {
  status: "unavailable";
  reason: string;
}

export interface ContributionArchetypeResult {
  categories: CategoryEvidence[];
  classification: ArchetypeClassification;
  distribution: ArchetypeDistributionItem[];
  scoreModel: ArchetypeScoreModel;
  dataCoverage: DataCoverage;
  baseline: BaselineStatus;
  summary: string;
}

export type ArchetypeDistributionItem = {
  category: ArchetypeCategory;
  label: string;
  count: number;
  share: number;
  score: number;
  availability: CategoryAvailability;
};

export interface BuildContributionArchetypeInput {
  stats?: KaggleStats;
  activities: KaggleActivity[];
}
