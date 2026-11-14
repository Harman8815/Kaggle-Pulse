import type { KaggleActivity } from "../../utils/api";

export type TopicDomain =
  | "Machine Learning"
  | "Deep Learning"
  | "Computer Vision"
  | "NLP"
  | "Data Science"
  | "Time Series"
  | "Tabular AI"
  | "Reinforcement Learning"
  | "Data Engineering";

export type TopicAvailability = "available" | "needs_collection" | "blocked";

export type SpecializationConfidence = "high" | "medium" | "low" | "insufficient";

export type SpecializationLabel =
  | "Specialist"
  | "Generalist"
  | "Multi-domain Practitioner"
  | "Emerging Specialist"
  | "Exploratory/Drifting"
  | "Unclassified";

export interface TopicKeywordMap {
  label: string;
  keywords: string[];
  subtopics: string[];
}

export interface TopicMatch {
  domain: TopicDomain;
  label: string;
  matchedKeywords: string[];
  itemCount: number;
  availability: TopicAvailability;
}

export interface ActivityTopicMatch {
  activityId: string;
  type: KaggleActivity["type"];
  domains: Array<{ domain: TopicDomain; matchedKeywords: string[] }>;
}

export interface SpecializationScore {
  domain: TopicDomain;
  label: string;
  count: number;
  share: number;
  score: number;
  availability: TopicAvailability;
  matchedKeywords: string[];
}

export interface FingerprintClassification {
  label: SpecializationLabel;
  primary: TopicDomain | null;
  secondary: TopicDomain[];
  confidence: SpecializationConfidence;
  explanations: string[];
}

export interface DomainCoverage {
  availability: TopicAvailability;
  measured: boolean;
  missingFields: string[];
  count: number;
  share: number;
}

export interface FingerprintDataCoverage {
  domains: Record<TopicDomain, DomainCoverage>;
  missingFields: string[];
  incomplete: boolean;
  unclassifiedCount: number;
  totalClassified: number;
}

export interface BaselineStatus {
  status: "unavailable";
  reason: string;
}

export interface SpecializationFingerprintResult {
  topics: SpecializationScore[];
  classification: FingerprintClassification;
  dataCoverage: FingerprintDataCoverage;
  scoreModel: { weights: Record<string, number>; rationale: string };
  baseline: BaselineStatus;
  summary: string;
}

export interface BuildSpecializationFingerprintInput {
  activities: KaggleActivity[];
}

export const TOPIC_DOMAIN_ORDER: TopicDomain[] = [
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "NLP",
  "Data Science",
  "Time Series",
  "Tabular AI",
  "Reinforcement Learning",
  "Data Engineering",
];

export const TOPIC_LABELS: Record<TopicDomain, string> = {
  "Machine Learning": "Machine Learning",
  "Deep Learning": "Deep Learning",
  "Computer Vision": "Computer Vision",
  NLP: "Natural Language Processing",
  "Data Science": "Data Science",
  "Time Series": "Time Series",
  "Tabular AI": "Tabular AI",
  "Reinforcement Learning": "Reinforcement Learning",
  "Data Engineering": "Data Engineering",
};

export const TOPIC_TAXONOMY: Record<TopicDomain, TopicKeywordMap> = {
  "Machine Learning": {
    label: "Machine Learning",
    keywords: [
      "machine learning", "ml", "scikit-learn", "sklearn", "random forest", "xgboost",
      "lightgbm", "catboost", "gradient boosting", "decision tree", "svm", "support vector",
      "k-nearest", "knn", "logistic regression", "linear regression", "k-means", "clustering",
      "supervised", "unsupervised", "classification", "regression",
    ],
    subtopics: ["classification", "regression", "clustering", "ensemble methods"],
  },
  "Deep Learning": {
    label: "Deep Learning",
    keywords: [
      "deep learning", "neural network", "cnn", "rnn", "lstm", "gru", "transformer", "bert",
      "gpt", "resnet", "vgg", "pytorch", "tensorflow", "keras", "autoencoder", "gan",
      "diffusion", "dl",
    ],
    subtopics: ["cnn", "rnn", "transformer", "autoencoder", "gan"],
  },
  "Computer Vision": {
    label: "Computer Vision",
    keywords: [
      "computer vision", "cv", "image classification", "object detection", "segmentation",
      "opencv", "face detection", "image recognition", "ocr", "visual", "image processing",
    ],
    subtopics: ["object detection", "segmentation", "face recognition", "image classification"],
  },
  NLP: {
    label: "Natural Language Processing",
    keywords: [
      "nlp", "natural language processing", "text classification", "sentiment analysis",
      "tokenization", "named entity", "ner", "text mining", "language model", "text generation",
      "summarization", "nltk", "spacy",
    ],
    subtopics: ["sentiment analysis", "named entity recognition", "text classification", "language modeling"],
  },
  "Data Science": {
    label: "Data Science",
    keywords: [
      "data science", "data analysis", "eda", "exploratory data analysis", "pandas", "numpy",
      "matplotlib", "seaborn", "visualization", "statistics", "statistical", "data cleaning",
      "data wrangling", "hypothesis testing", "anomaly detection",
    ],
    subtopics: ["exploratory data analysis", "statistical analysis", "data visualization", "data cleaning"],
  },
  "Time Series": {
    label: "Time Series",
    keywords: [
      "time series", "forecasting", "arima", "sarima", "prophet", "seasonal", "trend",
      "time-series", "temporal", "time series analysis",
    ],
    subtopics: ["forecasting", "seasonal decomposition", "arima", "prophet"],
  },
  "Tabular AI": {
    label: "Tabular AI",
    keywords: [
      "tabular", "tabular data", "structured data", "feature engineering", "feature selection",
    ],
    subtopics: ["feature engineering", "feature selection", "structured data modeling"],
  },
  "Reinforcement Learning": {
    label: "Reinforcement Learning",
    keywords: [
      "reinforcement learning", "rl", "q-learning", "dqn", "ppo", "a3c", "agent", "environment",
      "reward", "policy", "marl",
    ],
    subtopics: ["q-learning", "policy gradient", "dqn", "multi-agent"],
  },
  "Data Engineering": {
    label: "Data Engineering",
    keywords: [
      "data engineering", "etl", "elt", "data pipeline", "data warehouse", "data lake",
      "sql", "bigquery", "spark", "airflow", "data ingestion", "data modeling",
    ],
    subtopics: ["etl pipelines", "data warehousing", "data ingestion", "data modeling"],
  },
};

export const TOPIC_KEYWORD_MAP = Object.fromEntries(
  TOPIC_DOMAIN_ORDER.map((domain) => [domain, TOPIC_TAXONOMY[domain].keywords]),
) as Record<TopicDomain, string[]>;

export const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is",
  "it", "its", "of", "on", "or", "that", "the", "to", "was", "were", "will", "with",
]);

/**
 * Minimum total classified items for confidence tiers.
 * medium >= 3, high >= 10 (documented, tunable constants).
 */
export const SPECIALIZATION_MIN_TOTAL_MEDIUM = 3;
export const SPECIALIZATION_MIN_TOTAL_HIGH = 10;

/**
 * Dominance cutoff: a single domain holding at least this share of classified
 * items qualifies as a dominant specialization (Specialist).
 */
export const SPECIALIZATION_DOMINANCE_CUTOFF = 0.5;

/**
 * Secondary share cutoff: a non-primary domain qualifies as significant when it
 * holds at least this share of classified items.
 */
export const SPECIALIZATION_SECONDARY_SHARE_CUTOFF = 0.15;

/**
 * Emerging Specialist upper bound: few items (below medium threshold) concentrated
 * in a single domain.
 */
export const SPECIALIZATION_EMERGING_MAX_ITEMS = SPECIALIZATION_MIN_TOTAL_MEDIUM - 1;

/**
 * Contribution-type weights applied to each matched item. Notebooks carry the
 * strongest domain signal (code + narrative), datasets slightly less, competitions
 * least (task framing is often domain-agnostic). Documented and auditable.
 */
export const SPECIALIZATION_TYPE_WEIGHTS: Record<string, number> = {
  Notebook: 1.0,
  Dataset: 0.85,
  Competition: 0.6,
  Model: 0.5,
  Discussion: 0.25,
};

export const DEFAULT_DOMAIN_AVAILABILITY: Record<TopicDomain, TopicAvailability> = {
  "Machine Learning": "available",
  "Deep Learning": "available",
  "Computer Vision": "available",
  NLP: "available",
  "Data Science": "available",
  "Time Series": "available",
  "Tabular AI": "available",
  "Reinforcement Learning": "available",
  "Data Engineering": "available",
};

export const DOMAIN_NOTES: Record<TopicDomain, string[]> = {
  "Machine Learning": ["Matched from title + description + language via keyword taxonomy."],
  "Deep Learning": ["Matched from title + description + language via keyword taxonomy."],
  "Computer Vision": ["Matched from title + description + language via keyword taxonomy."],
  NLP: ["Matched from title + description + language via keyword taxonomy."],
  "Data Science": ["Matched from title + description + language via keyword taxonomy."],
  "Time Series": ["Matched from title + description + language via keyword taxonomy."],
  "Tabular AI": ["Matched from title + description + language via keyword taxonomy."],
  "Reinforcement Learning": ["Matched from title + description + language via keyword taxonomy."],
  "Data Engineering": ["Matched from title + description + language via keyword taxonomy."],
};

export const DOMAIN_MISSING_FIELDS: Record<TopicDomain, string[]> = {
  "Machine Learning": [],
  "Deep Learning": [],
  "Computer Vision": [],
  NLP: [],
  "Data Science": [],
  "Time Series": [],
  "Tabular AI": [],
  "Reinforcement Learning": [],
  "Data Engineering": [],
};

export const GLOBAL_MISSING_FIELDS = ["topic tags (not exposed in current activity feed)"];

export const SPECIALIZATION_MODEL_DOC = {
  version: "v1",
  source: "title + description + language (rule-based keyword matching)",
  taxonomy: TOPIC_DOMAIN_ORDER.join(", "),
  weights: SPECIALIZATION_TYPE_WEIGHTS,
  thresholds: {
    dominance: SPECIALIZATION_DOMINANCE_CUTOFF,
    secondaryShare: SPECIALIZATION_SECONDARY_SHARE_CUTOFF,
    minTotalMedium: SPECIALIZATION_MIN_TOTAL_MEDIUM,
    minTotalHigh: SPECIALIZATION_MIN_TOTAL_HIGH,
    emergingMaxItems: SPECIALIZATION_EMERGING_MAX_ITEMS,
  },
  rationale:
    "Rule-based keyword/taxonomy matching over title, description and language. Blocked/unavailable "
    + "domains are reported separately, never as zero contribution. No NLP embeddings in v1.",
};
