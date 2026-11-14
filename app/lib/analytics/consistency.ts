import type { KaggleActivity } from "../../utils/api";
import { dateKey } from "../../components/dashboard/utils";
import type {
  ActivityClassification,
  AnalyticsWindow,
  BehavioralSummary,
  BurstinessMetrics,
  ConsistencyMetrics,
  DailyContribution,
  MonthlyPattern,
  PatternsMetrics,
  RecoveryGap,
  RecoveryMetrics,
  WeeklyPattern,
} from "./consistency.types";

export type { AnalyticsWindow, BehavioralSummary } from "./consistency.types";

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function toDateKeyUTC(date: Date): string {
  return dateKey(date);
}

function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateKeyUTC(d);
}

function dayDiff(a: string, b: string): number {
  // b - a in days
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / DAY_MS);
}

function clampWindowEnd(latest: string): string {
  return latest;
}

export function getWindowStart(endKey: string, window: AnalyticsWindow): string | null {
  if (window === "all") return null;
  const days = window === "30d" ? 29 : 89;
  return addDays(endKey, -days);
}

export function filterActivitiesByWindow(
  activities: KaggleActivity[],
  window: AnalyticsWindow,
): { filtered: KaggleActivity[]; start: string | null; end: string | null } {
  const dated = activities.filter((a) => a.date && !Number.isNaN(new Date(a.date).getTime()));
  if (dated.length === 0) return { filtered: [], start: null, end: null };
  const dates = dated.map((a) => toDateKeyUTC(new Date(a.date as string))).sort();
  const end = clampWindowEnd(dates[dates.length - 1]);
  const start = getWindowStart(end, window);
  const filtered = dated.filter((a) => {
    const k = toDateKeyUTC(new Date(a.date as string));
    if (start && k < start) return false;
    if (k > end) return false;
    return true;
  });
  return { filtered, start: start ?? dates[0], end };
}

export function buildDailyContributions(
  activities: KaggleActivity[],
  window: AnalyticsWindow = "all",
): { daily: DailyContribution[]; byDate: Map<string, DailyContribution>; start: string | null; end: string | null } {
  const { filtered, start, end } = filterActivitiesByWindow(activities, window);
  const byDate = new Map<string, DailyContribution>();
  for (const activity of filtered) {
    if (!activity.date) continue;
    const d = new Date(activity.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = toDateKeyUTC(d);
    const existing = byDate.get(key);
    if (existing) {
      existing.count += 1;
      if (!existing.types.includes(activity.type)) existing.types.push(activity.type);
    } else {
      byDate.set(key, { date: key, count: 1, types: [activity.type] });
    }
  }
  const daily = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  return { daily, byDate, start, end };
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / values.length;
  return Math.sqrt(variance);
}

export function computeConsistency(
  daily: DailyContribution[],
  start: string | null,
  end: string | null,
): ConsistencyMetrics {
  if (!start || !end || daily.length === 0) {
    return {
      activeDays: 0,
      inactiveDays: 0,
      observedDays: 0,
      activeDayPercentage: 0,
      averageContributionsPerActiveDay: 0,
      averageDailyContributions: 0,
      longestActiveStreak: 0,
      currentActiveStreak: 0,
      longestInactivityPeriod: 0,
      anchorDate: null,
    };
  }
  const days = enumerateDays(start, end);
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const activeDays = daily.length;
  const observedDays = days.length;
  const inactiveDays = Math.max(0, observedDays - activeDays);
  const total = daily.reduce((sum, d) => sum + d.count, 0);
  const activeDayPercentage = observedDays ? (activeDays / observedDays) * 100 : 0;
  const averageContributionsPerActiveDay = activeDays ? total / activeDays : 0;
  const averageDailyContributions = observedDays ? total / observedDays : 0;

  let longestActiveStreak = 0;
  let longestInactivityPeriod = 0;
  let curActive = 0;
  let curInactive = 0;
  for (const day of days) {
    const count = byDate.get(day) ?? 0;
    if (count > 0) {
      curActive += 1;
      curInactive = 0;
      if (curActive > longestActiveStreak) longestActiveStreak = curActive;
    } else {
      curInactive += 1;
      curActive = 0;
      if (curInactive > longestInactivityPeriod) longestInactivityPeriod = curInactive;
    }
  }

  // current active streak anchored to latest activity date (end) for reproducibility
  let currentActiveStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const count = byDate.get(days[i]) ?? 0;
    if (count > 0) currentActiveStreak += 1;
    else break;
  }

  return {
    activeDays,
    inactiveDays,
    observedDays,
    activeDayPercentage,
    averageContributionsPerActiveDay,
    averageDailyContributions,
    longestActiveStreak,
    currentActiveStreak,
    longestInactivityPeriod,
    anchorDate: end,
  };
}

export function computeBurstiness(
  daily: DailyContribution[],
  start: string | null,
  end: string | null,
): BurstinessMetrics {
  if (!start || !end || daily.length === 0) {
    return {
      meanDaily: 0,
      stdDevDaily: 0,
      coefficientOfVariation: 0,
      averageIntervalBetweenActiveDays: null,
      highActivityThreshold: 0,
      highActivityPeriods: [],
      lowActivityPeriods: [],
      classification: "irregular",
      explanation: "No dated activity available to assess burstiness.",
    };
  }
  const days = enumerateDays(start, end);
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const counts = days.map((d) => byDate.get(d) ?? 0);
  const activeCounts = daily.map((d) => d.count);
  const m = mean(counts);
  const sd = stdDev(counts);
  const cv = m > 0 ? sd / m : 0;
  const activeMean = mean(activeCounts);
  const activeSd = stdDev(activeCounts);
  const highActivityThreshold = activeMean + activeSd;

  const sortedActiveDates = daily.map((d) => d.date).sort();
  let averageIntervalBetweenActiveDays: number | null = null;
  if (sortedActiveDates.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < sortedActiveDates.length; i++) {
      intervals.push(dayDiff(sortedActiveDates[i - 1], sortedActiveDates[i]));
    }
    averageIntervalBetweenActiveDays = mean(intervals);
  }

  const highActivityPeriods: BurstinessMetrics["highActivityPeriods"] = [];
  const lowActivityPeriods: BurstinessMetrics["lowActivityPeriods"] = [];
  // identify runs: high if count >= threshold and threshold>0; low/inactive runs of >=3 days
  let runStart: string | null = null;
  let runTotal = 0;
  let runDays = 0;
  let runType: "high" | "low" | null = null;
  const flush = () => {
    if (!runStart || !runType) return;
    const period = { start: runStart, end: addDays(runStart, runDays - 1), total: runTotal, days: runDays };
    if (runType === "high" && runDays >= 1) highActivityPeriods.push(period);
    if (runType === "low" && runDays >= 3) lowActivityPeriods.push(period);
  };
  for (const day of days) {
    const count = byDate.get(day) ?? 0;
    const isHigh = highActivityThreshold > 0 ? count >= highActivityThreshold && count > 0 : count > 0;
    const isLow = count === 0;
    const type: "high" | "low" | null = isHigh ? "high" : isLow ? "low" : null;
    if (type === runType && runType !== null) {
      runTotal += count;
      runDays += 1;
    } else {
      flush();
      runStart = type ? day : null;
      runTotal = type ? count : 0;
      runDays = type ? 1 : 0;
      runType = type;
    }
  }
  flush();

  let classification: BurstinessMetrics["classification"];
  let explanation: string;
  const activeRatio = daily.length / days.length;
  if (activeRatio >= 0.5 && cv <= 1.0) {
    classification = "consistent";
    explanation = "Activity is spread across many days with relatively stable daily counts.";
  } else if (cv > 1.3 || (activeRatio < 0.35 && daily.length >= 3)) {
    classification = "burst-oriented";
    explanation = "Contributions concentrate into spikes or short runs separated by quieter periods.";
  } else {
    classification = "irregular";
    explanation = "Activity shows mixed spacing and variability without a stable rhythm.";
  }

  return {
    meanDaily: m,
    stdDevDaily: sd,
    coefficientOfVariation: cv,
    averageIntervalBetweenActiveDays,
    highActivityThreshold,
    highActivityPeriods,
    lowActivityPeriods,
    classification,
    explanation,
  };
}

export function computeRecovery(
  daily: DailyContribution[],
  start: string | null,
  end: string | null,
): RecoveryMetrics {
  if (!start || !end || daily.length === 0) {
    return {
      significantGapThreshold: 7,
      gaps: [],
      significantGaps: [],
      averageRecoveryTime: null,
      successfulReturns: 0,
      longestBreakFollowedByRenewedActivity: null,
    };
  }
  const days = enumerateDays(start, end);
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const gaps: RecoveryGap[] = [];
  let i = 0;
  while (i < days.length) {
    if ((byDate.get(days[i]) ?? 0) === 0) {
      const gapStart = days[i];
      let j = i;
      while (j < days.length && (byDate.get(days[j]) ?? 0) === 0) j++;
      const gapEnd = days[j - 1];
      const length = j - i;
      const recoveryDate = j < days.length ? days[j] : null;
      const recoveryTime = recoveryDate ? dayDiff(gapEnd, recoveryDate) : null;
      gaps.push({ start: gapStart, end: gapEnd, length, recoveryDate, recoveryTime });
      i = j;
    } else {
      i++;
    }
  }
  const significantGapThreshold = 7;
  const significantGaps = gaps.filter((g) => g.length >= significantGapThreshold);
  const recovered = gaps.filter((g) => g.recoveryDate != null && g.recoveryTime != null);
  const averageRecoveryTime = recovered.length ? mean(recovered.map((g) => g.recoveryTime as number)) : null;
  const successfulReturns = recovered.length;
  let longestBreakFollowedByRenewedActivity: RecoveryGap | null = null;
  for (const g of recovered) {
    if (!longestBreakFollowedByRenewedActivity || g.length > longestBreakFollowedByRenewedActivity.length) {
      longestBreakFollowedByRenewedActivity = g;
    }
  }
  return {
    significantGapThreshold,
    gaps,
    significantGaps,
    averageRecoveryTime,
    successfulReturns,
    longestBreakFollowedByRenewedActivity,
  };
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export function computePatterns(
  daily: DailyContribution[],
  start: string | null,
  end: string | null,
): PatternsMetrics {
  if (!start || !end || daily.length === 0) {
    return {
      weekdays: WEEKDAY_LABELS.map((label, weekday) => ({ weekday, label, total: 0, activeDays: 0, average: 0 })),
      mostActiveWeekday: null,
      leastActiveWeekday: null,
      monthly: [],
      mostActiveMonth: null,
      recentPeriod: null,
      previousPeriod: null,
      recentVsPreviousChange: null,
      recentVsPreviousPercentChange: null,
    };
  }
  const days = enumerateDays(start, end);
  const byDate = new Map(daily.map((d) => [d.date, d.count]));

  const weekdayAgg = WEEKDAY_LABELS.map((label, weekday) => ({ weekday, label, total: 0, activeDays: 0, daysSeen: 0 }));
  for (const day of days) {
    const wd = parseDateKey(day).getUTCDay();
    const count = byDate.get(day) ?? 0;
    weekdayAgg[wd].daysSeen += 1;
    weekdayAgg[wd].total += count;
    if (count > 0) weekdayAgg[wd].activeDays += 1;
  }
  const weekdays: WeeklyPattern[] = weekdayAgg.map((w) => ({
    weekday: w.weekday,
    label: w.label,
    total: w.total,
    activeDays: w.activeDays,
    average: w.daysSeen ? w.total / w.daysSeen : 0,
  }));
  const sortedByTotal = [...weekdays].sort((a, b) => b.total - a.total || a.weekday - b.weekday);
  const mostActiveWeekday = sortedByTotal[0] ?? null;
  const leastActiveWeekday = sortedByTotal[sortedByTotal.length - 1] ?? null;

  const monthMap = new Map<string, number>();
  for (const d of daily) {
    const mk = monthKey(d.date);
    monthMap.set(mk, (monthMap.get(mk) ?? 0) + d.count);
  }
  const monthly: MonthlyPattern[] = Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, total]) => ({ month: m, label: monthLabel(m), total }));
  const mostActiveMonth = monthly.reduce<MonthlyPattern | null>((best, cur) => (!best || cur.total > best.total ? cur : best), null);

  // recent vs previous: compare last up-to-6-month window vs preceding equal-length window within observed range
  const windowDays = Math.min(183, dayDiff(start, end) + 1); // cap ~6 months
  const recentDays = Math.min(windowDays, Math.floor((dayDiff(start, end) + 1) / 2) || dayDiff(start, end) + 1);
  const recentEnd = end;
  const recentStart = addDays(recentEnd, -(recentDays - 1));
  const prevEnd = addDays(recentStart, -1);
  const prevStartCandidate = addDays(prevEnd, -(recentDays - 1));
  const prevStart = prevStartCandidate < start ? start : prevStartCandidate;
  const recentTotal = daily.filter((d) => d.date >= recentStart && d.date <= recentEnd).reduce((s, d) => s + d.count, 0);
  let recentPeriod: PatternsMetrics["recentPeriod"] = { label: "Recent period", total: recentTotal, start: recentStart, end: recentEnd };
  let previousPeriod: PatternsMetrics["previousPeriod"] = null;
  let recentVsPreviousChange: number | null = null;
  let recentVsPreviousPercentChange: number | null = null;
  if (prevEnd >= start) {
    const prevTotal = daily.filter((d) => d.date >= prevStart && d.date <= prevEnd).reduce((s, d) => s + d.count, 0);
    previousPeriod = { label: "Previous period", total: prevTotal, start: prevStart, end: prevEnd };
    recentVsPreviousChange = recentTotal - prevTotal;
    recentVsPreviousPercentChange = prevTotal > 0 ? ((recentTotal - prevTotal) / prevTotal) * 100 : recentTotal > 0 ? 100 : 0;
  } else {
    recentPeriod = { label: "Observed period", total: daily.reduce((s, d) => s + d.count, 0), start, end };
  }

  return {
    weekdays,
    mostActiveWeekday,
    leastActiveWeekday,
    monthly,
    mostActiveMonth,
    recentPeriod,
    previousPeriod,
    recentVsPreviousChange,
    recentVsPreviousPercentChange,
  };
}

export function classifyActivity(
  consistency: ConsistencyMetrics,
  burstiness: BurstinessMetrics,
  recovery: RecoveryMetrics,
  patterns: PatternsMetrics,
): ActivityClassification[] {
  const out: ActivityClassification[] = [];
  const { observedDays, activeDays, activeDayPercentage, averageDailyContributions } = consistency;

  if (observedDays === 0 || activeDays === 0) {
    return [{ label: "Emerging Contributor", confidence: "low", explanation: "No dated activity in the observed window." }];
  }

  // Emerging: short observed span or very recent start
  if (observedDays <= 21 || activeDays <= 3) {
    out.push({
      label: "Emerging Contributor",
      confidence: observedDays <= 14 ? "high" : "medium",
      explanation: `Activity is limited to ${observedDays} observed day(s) with ${activeDays} active day(s).`,
    });
  }

  // Consistent
  if (activeDayPercentage >= 45 && burstiness.coefficientOfVariation <= 1.2) {
    out.push({
      label: "Consistent Contributor",
      confidence: activeDayPercentage >= 60 ? "high" : "medium",
      explanation: `Active on ${activeDayPercentage.toFixed(1)}% of observed days with relatively stable daily counts.`,
    });
  }

  // Sprint/Burst
  if (burstiness.classification === "burst-oriented" || (activeDayPercentage < 35 && averageDailyContributions >= 0.5 && activeDays >= 3)) {
    out.push({
      label: "Sprint Contributor",
      confidence: burstiness.coefficientOfVariation > 1.5 ? "high" : "medium",
      explanation: "Activity clusters into bursts or short high-activity runs.",
    });
  }

  // Weekend
  const weekend = patterns.weekdays.filter((w) => w.weekday === 0 || w.weekday === 6).reduce((s, w) => s + w.total, 0);
  const weekdayTotal = patterns.weekdays.filter((w) => w.weekday >= 1 && w.weekday <= 5).reduce((s, w) => s + w.total, 0);
  const total = weekend + weekdayTotal;
  if (total > 0 && weekend / total >= 0.6) {
    out.push({
      label: "Weekend Contributor",
      confidence: weekend / total >= 0.75 ? "high" : "medium",
      explanation: `${Math.round((weekend / total) * 100)}% of contributions occur on Saturday/Sunday (UTC).`,
    });
  }

  // Returning
  if (recovery.significantGaps.length > 0 && recovery.successfulReturns > 0) {
    out.push({
      label: "Returning Contributor",
      confidence: recovery.successfulReturns >= 2 ? "high" : "medium",
      explanation: `Returned to activity after ${recovery.successfulReturns} significant break(s).`,
    });
  }

  // Irregular (only if no strong positive pattern)
  if (
    out.length === 0 ||
    (burstiness.classification === "irregular" && activeDayPercentage < 45 && out.every((c) => c.label === "Emerging Contributor"))
  ) {
    if (!out.some((c) => c.label === "Irregular Contributor")) {
      out.push({
        label: "Irregular Contributor",
        confidence: "medium",
        explanation: "No stable, dominant rhythm detected across the observed period.",
      });
    }
  }

  // de-duplicate by label keeping highest confidence not necessary; labels are distinct by construction except maybe irregular added
  const seen = new Set<string>();
  return out.filter((c) => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });
}

function buildSummaryText(summary: Omit<BehavioralSummary, "summary">): string {
  if (summary.totalActivities === 0 || summary.daily.length === 0) {
    return "No dated contribution activity available for the selected window.";
  }
  const labels = summary.classifications.map((c) => c.label).join(", ") || "Unclassified";
  const pct = summary.consistency.activeDayPercentage.toFixed(1);
  return `Active on ${summary.consistency.activeDays} of ${summary.consistency.observedDays} observed days (${pct}%). Classified as: ${labels}.`;
}

export function buildBehavioralSummary(
  activities: KaggleActivity[],
  window: AnalyticsWindow = "all",
): BehavioralSummary {
  const { daily, start, end } = buildDailyContributions(activities, window);
  const consistency = computeConsistency(daily, start, end);
  const burstiness = computeBurstiness(daily, start, end);
  const recovery = computeRecovery(daily, start, end);
  const patterns = computePatterns(daily, start, end);
  const classifications = classifyActivity(consistency, burstiness, recovery, patterns);
  const activitiesWithDates = activities.filter((a) => a.date && !Number.isNaN(new Date(a.date).getTime())).length;
  const activitiesWithoutDates = activities.length - activitiesWithDates;
  const totalActivities = daily.reduce((s, d) => s + d.count, 0);

  const base = {
    window,
    observedStart: start,
    observedEnd: end,
    totalActivities,
    daily,
    consistency,
    burstiness,
    recovery,
    patterns,
    classifications,
    dataCoverage: { activitiesWithDates, activitiesWithoutDates },
  };

  return { ...base, summary: buildSummaryText(base) };
}
