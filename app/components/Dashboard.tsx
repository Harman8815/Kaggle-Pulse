"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
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
import { buildContributionArchetype } from "../lib/analytics/archetype";
import { buildSpecializationFingerprint } from "../lib/analytics/specialization";
import { ArchetypePanel } from "./dashboard/archetype/ArchetypePanel";
import { SpecializationPanel } from "./dashboard/specialization/SpecializationPanel";
import { BehavioralSummaryPanel } from "./dashboard/consistency/BehavioralSummaryPanel";
import { ConsistencyPanel } from "./dashboard/consistency/ConsistencyPanel";
import { BurstinessPanel } from "./dashboard/consistency/BurstinessPanel";
import { RecoveryPanel } from "./dashboard/consistency/RecoveryPanel";
import { WeeklyPatternPanel } from "./dashboard/consistency/WeeklyPatternPanel";
import { ClassificationPanel } from "./dashboard/consistency/ClassificationPanel";

interface DashboardProps {
    username?: string;
}

const dashboardTabGroups = [
    [
        { id: "stats", label: "Stats" },
        { id: "activity", label: "Activity" },
    ],
    [
        { id: "overview", label: "Overview" },
        { id: "trends", label: "Trends" },
        { id: "habits", label: "Habits" },
        { id: "creator", label: "Creator" },
        { id: "specialization", label: "Specialization" },
    ],
    [
        { id: "recent", label: "Recent" },
        { id: "more", label: "More" },
    ],
] as const;

const dashboardTabs = dashboardTabGroups.flat();
type DashboardTabId = (typeof dashboardTabs)[number]["id"];

export const Dashboard = ({ username }: DashboardProps) => {
    const [userData, setUserData] = useState<KaggleUserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [heatmap, setHeatmap] = useState<ReturnType<typeof buildHeatmap> | null>(null);
    const [monthlyActivity, setMonthlyActivity] = useState<MonthlyActivity[]>([]);
    const [analyticsWindow, setAnalyticsWindow] = useState<AnalyticsWindow>("all");
    const [habitsOpen, setHabitsOpen] = useState(true);
    const [archetypeOpen, setArchetypeOpen] = useState(true);
    const [specializationOpen, setSpecializationOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTabId>("overview");
    const [transitionDirection, setTransitionDirection] = useState<"left" | "right">("right");
    const tabsRef = useRef<HTMLDivElement>(null);

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
    const archetype = useMemo(
        () => buildContributionArchetype({ stats: userData?.stats, activities }),
        [userData, activities],
    );
    const specialization = useMemo(
        () => buildSpecializationFingerprint({ activities }),
        [activities],
    );
    const latestActivity = sortedActivities[0];
    const profileUrl = userData?.profileUrl ?? `https://www.kaggle.com/${userData?.username}`;

    const selectTab = (tabId: DashboardTabId) => {
        const currentIndex = dashboardTabs.findIndex((tab) => tab.id === activeTab);
        const nextIndex = dashboardTabs.findIndex((tab) => tab.id === tabId);
        setTransitionDirection(nextIndex >= currentIndex ? "right" : "left");
        setActiveTab(tabId);
    };

    const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        let nextIndex = currentIndex;

        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % dashboardTabs.length;
        else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + dashboardTabs.length) % dashboardTabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = dashboardTabs.length - 1;
        else return;

        event.preventDefault();
        const nextTab = dashboardTabs[nextIndex];
        selectTab(nextTab.id);
        tabsRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
    };

    const renderActiveTab = () => {
        switch (activeTab) {
            case "stats":
                return (
                    <section className="panel">
                        <div className="panel-heading">
                            <div><h2>Contribution totals</h2><p>A detailed count of each activity type</p></div>
                        </div>
                        <div className="stats-grid">
                            {typeCounts.map(({ type, count }) => (
                                <article className="stat-card" key={type}>
                                    <div className="stat-topline"><span>{type === "Notebook" ? "Notebooks" : `${type}s`}</span></div>
                                    <strong>{loading ? "—" : count}</strong>
                                    <span className="stat-footnote">Public contributions</span>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            case "activity":
                return <HeatmapPanel heatmap={heatmap} loading={loading} />;
            case "overview":
                return (
                    <>
                        <StatsGrid userData={userData} loading={loading} latestActivity={latestActivity} />
                        <HeatmapPanel heatmap={heatmap} loading={loading} />
                        <VisualizationGrid monthlyActivity={monthlyActivity} typeCounts={typeCounts} />
                    </>
                );
            case "trends":
                return <VisualizationGrid monthlyActivity={monthlyActivity} typeCounts={typeCounts} />;
            case "habits":
                return (
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
                );
            case "creator":
                return (
                    <section className="panel rhythm-section archetype-section">
                        <div className="panel-heading rhythm-section-heading">
                            <div>
                                <h2>Contribution archetype</h2>
                                <p>Participation identity derived from measurable contribution categories.</p>
                            </div>
                            <button
                                type="button"
                                className="rhythm-collapse-btn"
                                aria-expanded={archetypeOpen}
                                onClick={() => setArchetypeOpen((v) => !v)}
                            >
                                {archetypeOpen ? "Collapse" : "Expand"}
                            </button>
                        </div>
                        {archetypeOpen && <ArchetypePanel result={archetype} />}
                    </section>
                );
            case "specialization":
                return (
                    <section className="panel rhythm-section specialization-section">
                        <div className="panel-heading rhythm-section-heading">
                            <div>
                                <h2>Specialization fingerprint</h2>
                                <p>Topic intelligence derived from notebook, dataset and competition metadata.</p>
                            </div>
                            <button
                                type="button"
                                className="rhythm-collapse-btn"
                                aria-expanded={specializationOpen}
                                onClick={() => setSpecializationOpen((v) => !v)}
                            >
                                {specializationOpen ? "Collapse" : "Expand"}
                            </button>
                        </div>
                        {specializationOpen && <SpecializationPanel result={specialization} />}
                    </section>
                );
            case "recent":
                return (
                    <RecentActivityPanel
                        activities={activities}
                        loading={loading}
                        error={error}
                        userData={userData}
                        profileUrl={profileUrl}
                    />
                );
            case "more":
                return (
                    <section className="panel dashboard-more-panel">
                        <div className="panel-heading">
                            <div><h2>Explore Kaggle Pulse</h2><p>Open another workspace for more ways to explore creator activity</p></div>
                        </div>
                        <div className="dashboard-more-links">
                            {[
                                { href: "/compare", label: "Compare creators", description: "Compare activity across profiles" },
                                { href: "/history", label: "History", description: "Browse creator activity history" },
                                { href: "/cohorts", label: "Cohorts", description: "Explore creator groups" },
                                { href: "/pulse", label: "Pulse", description: "See community activity trends" },
                                { href: "/network", label: "Network", description: "Explore creator connections" },
                                { href: "/atlas", label: "Atlas", description: "Discover the Kaggle creator landscape" },
                            ].map((item) => (
                                <Link className="dashboard-more-link" href={item.href} key={item.href}>
                                    <strong>{item.label}</strong>
                                    <span>{item.description}</span>
                                    <span aria-hidden="true">↗</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                );
        }
    };

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

                <div
                    aria-label="Dashboard sections"
                    className="dashboard-tab-navigation"
                    ref={tabsRef}
                    role="tablist"
                >
                    {dashboardTabGroups.map((group, groupIndex) => (
                        <div
                            className={`dashboard-tab-group${groupIndex === 1 ? " dashboard-tab-group-primary" : ""}`}
                            key={groupIndex}
                        >
                            {group.map((tab) => {
                                const tabIndex = dashboardTabs.findIndex((item) => item.id === tab.id);
                                const selected = activeTab === tab.id;

                                return (
                                    <button
                                        aria-controls="dashboard-tab-panel"
                                        aria-selected={selected}
                                        className={`dashboard-tab${selected ? " is-active" : ""}`}
                                        id={`dashboard-tab-${tab.id}`}
                                        key={tab.id}
                                        onClick={() => selectTab(tab.id)}
                                        onKeyDown={(event) => handleTabKeyDown(event, tabIndex)}
                                        role="tab"
                                        tabIndex={selected ? 0 : -1}
                                        type="button"
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <section
                    aria-labelledby={`dashboard-tab-${activeTab}`}
                    className="dashboard-tab-panel"
                    id="dashboard-tab-panel"
                    key={activeTab}
                    role="tabpanel"
                    data-direction={transitionDirection}
                    tabIndex={0}
                >
                    {renderActiveTab()}
                    <DashboardAttribution userData={userData} />
                </section>
            </div>
        </main>
    );
};