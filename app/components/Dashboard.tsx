"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserData } from "../utils/api";
import type { KaggleUserData, KaggleActivity } from "../utils/api";
import { buildHeatmap, buildMonthlyActivity, getActivityDate, ACTIVITY_TYPES } from "./dashboard/utils";
import type { TypeCount, MonthlyActivity } from "./dashboard/types";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { StatsGrid } from "./dashboard/StatsGrid";
import { HeatmapPanel } from "./dashboard/HeatmapPanel";
import { VisualizationGrid } from "./dashboard/VisualizationGrid";
import { RecentActivityPanel } from "./dashboard/RecentActivityPanel";
import { DashboardAttribution } from "./dashboard/DashboardAttribution";

export const Dashboard = () => {
    const [userData, setUserData] = useState<KaggleUserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [heatmap, setHeatmap] = useState<ReturnType<typeof buildHeatmap> | null>(null);
    const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await getUserData({
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
    }, []);

    const activities = userData?.activities ?? [];
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
                        <strong>Couldn't load your Kaggle activity.</strong>
                        <span>{error}</span>
                    </div>
                )}

                <StatsGrid userData={userData} loading={loading} latestActivity={latestActivity} />

                <HeatmapPanel heatmap={heatmap} loading={loading} />

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