"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserData } from "../utils/api";
import type { KaggleUserData } from "../utils/api";
import { buildHeatmap, buildMonthlyActivity, getActivityDate, ACTIVITY_TYPES } from "./dashboard/utils";
import type { TypeCount, MonthlyActivity } from "./dashboard/types";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { StatsGrid } from "./dashboard/StatsGrid";
import { HeatmapPanel } from "./dashboard/HeatmapPanel";
import { VisualizationGrid } from "./dashboard/VisualizationGrid";
import { RecentActivityPanel } from "./dashboard/RecentActivityPanel";
import { DashboardAttribution } from "./dashboard/DashboardAttribution";
import { buildBehavioralSummary, type AnalyticsWindow } from "../lib/analytics/consistency";
import { BehavioralSummaryPanel } from "./dashboard/consistency/BehavioralSummaryPanel";
import { ConsistencyPanel } from "./dashboard/consistency/ConsistencyPanel";
import { BurstinessPanel } from "./dashboard/consistency/BurstinessPanel";
import { RecoveryPanel } from "./dashboard/consistency/RecoveryPanel";
import { WeeklyPatternPanel } from "./dashboard/consistency/WeeklyPatternPanel";
import { ClassificationPanel } from "./dashboard/consistency/ClassificationPanel";

interface DashboardProps {
    username?: string;
}

export const Dashboard = ({ username }: DashboardProps) => {
    const [userData, setUserData] = useState<KaggleUserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [heatmap, setHeatmap] = useState<ReturnType<typeof buildHeatmap> | null>(null);
    const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([]);
    const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>("all");
    const [habitsOpen, setHabitsOpen] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getUserData({
                    username,
                    limit: 500,
                    sort: "desc",
                    signal: controller.signal,
                });
                setUserData(data);
                setHeatmap(buildHeatmap(data.activities));
                setMonthlyActivity(buildMonthlyActivity(data.activities));
            } catch (error) {
                if (error instanceof Error && error.name !== "AbortError") {
                    setError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchData();
        return () => controller.abort();
    }, [username]);

    const activities = useMemo(() => userData?.activities ?? [], [userData]);
    const sortedActivities = useMemo(
        () => [...activities].sort((a, b) => getActivityDate(b) - getActivityDate(a)),
        [activities],
    );
    const typeCounts = useMemo(
        () =>
            ACTIVITY_TYPES.map((type) => ({
                type,
                count: activities.filter((activity) => activity.type === type).length,
            })) as TypeCount[],
        [activities],
    );
    const behavioralSummary = useMemo(
        () => buildBehavioralSummary(activities, analyticsWindow),
        [activities, analyticsWindow],
    );
    const latestActivity = sortedActivities[0];
    const profileUrl = userData?.profileUrl ?? `https://www.kaggle.com/${userData?.username}`;

    if (loading && !userData) {
        return <DashboardSkeleton />;
    }

    return (
        <main className="dashboard-shell">
            <div className="ambient-decoration" aria-hidden="true">
                <span className="ambient-orb ambient-orb-one" />
                <span className="ambient-orb ambient-orb-two" />
                <span className="ambient-symbol ambient-symbol-one">✳</span>
                <span className="ambient-symbol ambient-symbol-two">◇</span>
                <span className="ambient-symbol ambient-symbol-three">＋</span>
                <span className="ambient-symbol ambient-symbol-four">⌘</span>
            </div>
            <div className="dashboard-container">
                <DashboardHeader userData={userData} loading={loading} error={error} onRetry={() => window.location.reload()} />

                {error && (
                    <div className="dashboard-alert" role="alert">
                        <strong>Couldn&apos;t load your Kaggle activity.</strong>
                        <span>{error}</span>
                    </div>
                )}

                <StatsGrid userData={userData} loading={loading} latestActivity={latestActivity} />

                <HeatmapPanel heatmap={heatmap} loading={loading} />

                <section className="panel rhythm-section">
                    <div className="panel-heading rhythm-section-heading">
                        <div>
                            <h2>Working habits</h2>
                            <p>Rhythm and consistency profile derived from dated contribution activity</p>
                        </div>
                        <div className="rhythm-controls">
                            <div className="heatmap-view-toggle" role="group" aria-label="Analytics window">
                                {(["30d", "90d", "all"] as const).map((w) => (
                                    <button
                                        key={w}
                                        type="button"
                                        aria-pressed={analyticsWindow === w}
                                        className={analyticsWindow === w ? "is-active" : ""}
                                        onClick={() => setAnalyticsWindow(w)}
                                    >
                                        {w === "all" ? "All" : w.replace("d", "D")}
                                    </button>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="rhythm-collapse-btn"
                                aria-expanded={habitsOpen}
                                onClick={() => setHabitsOpen((v) => !v)}
                            >
                                {habitsOpen ? "Collapse" : "Expand"}
                            </button>
                        </div>
                    </div>
                    {habitsOpen && (
                        <div className="rhythm-panels">
                            <BehavioralSummaryPanel summary={behavioralSummary} />
                            <div className="visualization-grid">
                                <ConsistencyPanel metrics={behavioralSummary.consistency} />
                                <ClassificationPanel classifications={behavioralSummary.classifications} />
                            </div>
                            <BurstinessPanel
                                metrics={behavioralSummary.burstiness}
                                daily={behavioralSummary.daily}
                                start={behavioralSummary.observedStart}
                                end={behavioralSummary.observedEnd}
                            />
                            <div className="visualization-grid">
                                <RecoveryPanel metrics={behavioralSummary.recovery} />
                                <WeeklyPatternPanel patterns={behavioralSummary.patterns} />
                            </div>
                        </div>
                    )}
                </section>

                <VisualizationGrid monthlyActivity={monthlyActivity} typeCounts={typeCounts} />

                <RecentActivityPanel
                    activities={activities}
                    loading={loading}
                    error={error}
                    userData={userData}
                    profileUrl={profileUrl}
                />

                <DashboardAttribution userData={userData} />
            </div>
        </main>
    );
};