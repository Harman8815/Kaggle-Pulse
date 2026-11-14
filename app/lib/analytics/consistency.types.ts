export type AnalyticsWindow = "30d" | "90d" | "all";

export interface DailyContribution {
  date: string; // YYYY-MM-DD UTC
  count: number;
  types: string[];
}

export interface ConsistencyMetrics {
  activeDays: number;
  inactiveDays: number;
  observedDays: number;
  activeDayPercentage: number;
  averageContributionsPerActiveDay: number;
  averageDailyContributions: number;
  longestActiveStreak: number;
  currentActiveStreak: number;
  longestInactivityPeriod: number;
  anchorDate: string | null; // latest activity date used for reproducible streaks
}

export interface BurstinessMetrics {
  meanDaily: number;
  stdDevDaily: number;
  coefficientOfVariation: number;
  averageIntervalBetweenActiveDays: number | null;
  highActivityThreshold: number;
  highActivityPeriods: Array<{ start: string; end: string; total: number; days: number }>;
  lowActivityPeriods: Array<{ start: string; end: string; total: number; days: number }>;
  classification: "consistent" | "burst-oriented" | "irregular";
  explanation: string;
}

export interface RecoveryGap {
  start: string; // first inactive day
  end: string; // last inactive day
  length: number;
  recoveryDate: string | null; // next active day
  recoveryTime: number | null; // days from gap end to recovery (0 means immediate next day after start? computed as diff)
}

export interface RecoveryMetrics {
  significantGapThreshold: number;
  gaps: RecoveryGap[];
  significantGaps: RecoveryGap[];
  averageRecoveryTime: number | null;
  successfulReturns: number;
  longestBreakFollowedByRenewedActivity: RecoveryGap | null;
}

export interface WeeklyPattern {
  weekday: number; // 0=Sun UTC
  label: string;
  total: number;
  activeDays: number;
  average: number;
}

export interface MonthlyPattern {
  month: string; // YYYY-MM
  label: string;
  total: number;
}

export interface PatternsMetrics {
  weekdays: WeeklyPattern[];
  mostActiveWeekday: WeeklyPattern | null;
  leastActiveWeekday: WeeklyPattern | null;
  monthly: MonthlyPattern[];
  mostActiveMonth: MonthlyPattern | null;
  recentPeriod: { label: string; total: number; start: string; end: string } | null;
  previousPeriod: { label: string; total: number; start: string; end: string } | null;
  recentVsPreviousChange: number | null; // difference recent - previous
  recentVsPreviousPercentChange: number | null;
}

export type ClassificationLabel =
  | "Consistent Contributor"
  | "Sprint Contributor"
  | "Weekend Contributor"
  | "Returning Contributor"
  | "Irregular Contributor"
  | "Emerging Contributor";

export interface ActivityClassification {
  label: ClassificationLabel;
  confidence: "high" | "medium" | "low";
  explanation: string;
}

export interface BehavioralSummary {
  window: AnalyticsWindow;
  observedStart: string | null;
  observedEnd: string | null;
  totalActivities: number;
  daily: DailyContribution[];
  consistency: ConsistencyMetrics;
  burstiness: BurstinessMetrics;
  recovery: RecoveryMetrics;
  patterns: PatternsMetrics;
  classifications: ActivityClassification[];
  summary: string;
  dataCoverage: {
    activitiesWithDates: number;
    activitiesWithoutDates: number;
  };
}
