"use client";

import { useEffect, useMemo, useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { getUserData } from "../utils/api";
import type {
    ActivityType,
    KaggleActivity,
    KaggleUserData,
} from "../utils/api";

const ACTIVITY_TYPES: ActivityType[] = [
    "Notebook",
    "Dataset",
    "Model",
    "Competition",
    "Discussion",
];

const TYPE_COLORS: Record<ActivityType, string> = {
    Notebook: "#20a879",
    Dataset: "#4e7cf5",
    Model: "#9b6bdf",
    Competition: "#e5a331",
    Discussion: "#e56e77",
};

const dateKey = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDate = (value: string | null) => {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
};

const getActivityDate = (activity: KaggleActivity) =>
    activity.date ? new Date(activity.date).getTime() : Number.NEGATIVE_INFINITY;

const buildHeatmap = (activities: KaggleActivity[]) => {
    const counts = new Map<string, number>();
    for (const activity of activities) {
        if (!activity.date) continue;
        const date = new Date(activity.date);
        if (Number.isNaN(date.getTime())) continue;
        const key = dateKey(date);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 363);
    start.setUTCDate(start.getUTCDate() - start.getUTCDay());

    const days: { date: Date; count: number }[] = [];
    for (const date = new Date(start); date <= today; date.setUTCDate(date.getUTCDate() + 1)) {
        days.push({
            date: new Date(date),
            count: counts.get(dateKey(date)) ?? 0,
        });
    }

    const weeks: typeof days[] = [];
    for (let index = 0; index < days.length; index += 7) {
        weeks.push(days.slice(index, index + 7));
    }

    return { weeks, total: days.reduce((sum, day) => sum + day.count, 0) };
};

const buildMonthlyActivity = (activities: KaggleActivity[]) => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
        const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1));
        const nextMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
        return {
            date,
            label: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(date),
            count: activities.filter((activity) => {
                if (!activity.date) return false;
                const timestamp = new Date(activity.date).getTime();
                return timestamp >= date.getTime() && timestamp < nextMonth.getTime();
            }).length,
        };
    });
};

const heatLevel = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
};

const latestLabel = (activity: KaggleActivity | undefined) =>
    activity ? formatDate(activity.date) : "No activity yet";

const DashboardSkeleton = () => (
    <main className="dashboard-shell">
        <div className="ambient-decoration" aria-hidden="true">
            <span className="ambient-orb ambient-orb-one" />
            <span className="ambient-orb ambient-orb-two" />
            <span className="ambient-symbol ambient-symbol-one">✳</span>
            <span className="ambient-symbol ambient-symbol-two">◇</span>
            <span className="ambient-symbol ambient-symbol-three">＋</span>
            <span className="ambient-symbol ambient-symbol-four">⌘</span>
        </div>
        <div className="dashboard-container dashboard-skeleton" aria-label="Loading dashboard" role="status">
            <span className="visually-hidden">Loading your Kaggle activity dashboard…</span>
            <section className="dashboard-heading">
                <div className="skeleton-heading">
                    <span className="skeleton-block skeleton-eyebrow" />
                    <span className="skeleton-block skeleton-title" />
                    <span className="skeleton-block skeleton-subtitle" />
                </div>
                <span className="skeleton-block skeleton-button" />
            </section>
            <section className="stats-grid" aria-hidden="true">
                {[0, 1, 2, 3].map((item) => (
                    <div className="stat-card skeleton-card" key={item}>
                        <span className="skeleton-block skeleton-label" />
                        <span className="skeleton-block skeleton-number" />
                        <span className="skeleton-block skeleton-footnote" />
                    </div>
                ))}
            </section>
            <section className="panel skeleton-panel" aria-hidden="true">
                <div className="skeleton-block skeleton-label" />
                <div className="skeleton-heatmap">
                    {Array.from({ length: 154 }, (_, index) => (
                        <span className="skeleton-block" key={index} />
                    ))}
                </div>
            </section>
            <div className="visualization-grid" aria-hidden="true">
                {[0, 1].map((item) => (
                    <section className="panel skeleton-panel" key={item}>
                        <span className="skeleton-block skeleton-label" />
                        <div className={`skeleton-chart skeleton-chart-${item}`}>
                            {[38, 68, 46, 88, 57, 75].map((height, index) => (
                                <span className="skeleton-block" key={index} style={{ height: `${height}%` }} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            <section className="panel skeleton-panel" aria-hidden="true">
                <span className="skeleton-block skeleton-label" />
                {[0, 1, 2, 3].map((item) => (
                    <div className="skeleton-activity" key={item}>
                        <span className="skeleton-block skeleton-avatar" />
                        <span className="skeleton-block skeleton-activity-title" />
                        <span className="skeleton-block skeleton-activity-date" />
                    </div>
                ))}
            </section>
        </div>
    </main>
);

export const Dashboard = () => {
    const [userData, setUserData] = useState<KaggleUserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [heatmapMode, setHeatmapMode] = useState<"2d" | "3d">("2d");
    const [heatmap, setHeatmap] = useState<ReturnType<typeof buildHeatmap> | null>(null);
    const [monthlyActivity, setMonthlyActivity] = useState<
        ReturnType<typeof buildMonthlyActivity>
    >([]);

    useEffect(() => {
        const savedTheme = window.localStorage.getItem("kaggle-pulse-theme");
        if (savedTheme === "light" || savedTheme === "dark") {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        window.localStorage.setItem("kaggle-pulse-theme", theme);
    }, [theme]);

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
            })),
        [activities],
    );
    const maxMonthlyActivity = Math.max(1, ...monthlyActivity.map((month) => month.count));
    const maxTypeCount = Math.max(1, ...typeCounts.map(({ count }) => count));
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
                <section className="dashboard-heading">
                    <div>
                        <div className="eyebrow"><span className="status-dot" /> KAGGLE CREATOR OVERVIEW</div>
                        <h1>Your activity, at a glance.</h1>
                        <p className="dashboard-subtitle">
                            A snapshot of the work you have shared with the Kaggle community.
                        </p>
                    </div>
                    <div className="dashboard-actions">
                        <button
                            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                            aria-pressed={theme === "dark"}
                            className="theme-toggle"
                            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
                            type="button"
                        >
                            <span className="theme-toggle-icon" aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
                            <span>{theme === "light" ? "Dark mode" : "Light mode"}</span>
                        </button>
                        <a className="profile-link" href={profileUrl} target="_blank" rel="noreferrer">
                            View Kaggle profile <span aria-hidden="true">↗</span>
                        </a>
                    </div>
                </section>

                {error && (
                    <div className="dashboard-alert" role="alert">
                        <strong>Couldn’t load your Kaggle activity.</strong>
                        <span>{error}</span>
                    </div>
                )}

                <section className="stats-grid" aria-label="Activity summary">
                    <article className="stat-card stat-card-primary">
                        <div className="stat-topline"><span>Total activity</span><span className="stat-icon">↗</span></div>
                        <strong>{loading ? "—" : userData?.stats.total ?? 0}</strong>
                        <span className="stat-footnote">Across your Kaggle profile</span>
                    </article>
                    <article className="stat-card">
                        <div className="stat-topline"><span>Notebooks</span><span className="stat-icon stat-icon-green">▤</span></div>
                        <strong>{loading ? "—" : userData?.stats.notebooks ?? 0}</strong>
                        <span className="stat-footnote">Code and analysis published</span>
                    </article>
                    <article className="stat-card">
                        <div className="stat-topline"><span>Datasets</span><span className="stat-icon stat-icon-blue">◫</span></div>
                        <strong>{loading ? "—" : userData?.stats.datasets ?? 0}</strong>
                        <span className="stat-footnote">Shared with the community</span>
                    </article>
                    <article className="stat-card">
                        <div className="stat-topline"><span>Latest activity</span><span className="stat-icon stat-icon-violet">◷</span></div>
                        <strong className="stat-date">{loading ? "Loading" : latestLabel(latestActivity)}</strong>
                        <span className="stat-footnote">Most recent contribution</span>
                    </article>
                </section>

                <section className="panel heatmap-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Contribution activity</h2>
                            <p>{loading ? "Loading activity history…" : `${heatmap?.total ?? 0} activities over the last year`}</p>
                        </div>
                        <div className="heatmap-controls">
                            <div className="heatmap-view-toggle" role="group" aria-label="Heatmap view">
                                <button
                                    aria-pressed={heatmapMode === "2d"}
                                    className={heatmapMode === "2d" ? "is-active" : ""}
                                    onClick={() => setHeatmapMode("2d")}
                                    type="button"
                                >
                                    2D
                                </button>
                                <button
                                    aria-pressed={heatmapMode === "3d"}
                                    className={heatmapMode === "3d" ? "is-active" : ""}
                                    onClick={() => setHeatmapMode("3d")}
                                    type="button"
                                >
                                    3D
                                </button>
                            </div>
                            {heatmapMode === "2d" && (
                                <div className="heatmap-legend" aria-label="Less to more activity">
                                    <span>Less</span>
                                    {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`heat-cell heat-level-${level}`} />)}
                                    <span>More</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <Tooltip.Provider delayDuration={150}>
                        <div className={`heatmap-scroll ${heatmapMode === "3d" ? "heatmap-scroll-3d" : ""}`}>
                            <div className={`heatmap-calendar ${heatmapMode === "3d" ? "heatmap-calendar-3d" : ""}`}>
                                <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${heatmap?.weeks.length ?? 0}, 12px)` }}>
                                    {(heatmap?.weeks ?? []).map((week, index) => {
                                        const firstDay = week[0]?.date;
                                        const previous = heatmap?.weeks[index - 1]?.[0]?.date;
                                        const showLabel = firstDay && (!previous || firstDay.getUTCMonth() !== previous.getUTCMonth());
                                        return <span key={index}>{showLabel ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(firstDay) : ""}</span>;
                                    })}
                                </div>
                                <div className={`heatmap-body ${heatmapMode === "3d" ? "heatmap-body-3d" : ""}`}>
                                    <div className="weekday-labels" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
                                    <div className={`heatmap-grid ${heatmapMode === "3d" ? "heatmap-grid-3d" : ""}`} style={{ gridTemplateColumns: `repeat(${heatmap?.weeks.length ?? 0}, 12px)` }}>
                                        {(heatmap?.weeks ?? []).map((week, weekIndex) => (
                                            <div className={`heatmap-week ${heatmapMode === "3d" ? "heatmap-week-3d" : ""}`} key={weekIndex}>
                                                {week.map(({ date, count }) => {
                                                    const dateLabel = formatDate(date.toISOString());
                                                    const activityLabel = `${count} ${count === 1 ? "activity" : "activities"}`;
                                                    return (
                                                        <Tooltip.Root key={dateKey(date)}>
                                                            <Tooltip.Trigger asChild>
                                                                <button
                                                                    aria-label={`${activityLabel} on ${dateLabel}`}
                                                                    className={`heat-cell heat-level-${heatLevel(count)} ${heatmapMode === "3d" ? "heat-cell-3d" : ""}`}
                                                                    type="button"
                                                                />
                                                            </Tooltip.Trigger>
                                                            <Tooltip.Portal>
                                                                <Tooltip.Content className="heatmap-tooltip" side="top" sideOffset={7}>
                                                                    <strong>{activityLabel}</strong>
                                                                    <span>{dateLabel}</span>
                                                                    <Tooltip.Arrow className="heatmap-tooltip-arrow" />
                                                                </Tooltip.Content>
                                                            </Tooltip.Portal>
                                                        </Tooltip.Root>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tooltip.Provider>
                </section>

                <div className="visualization-grid">
                    <section className="panel chart-panel">
                        <div className="panel-heading">
                            <div><h2>Activity by month</h2><p>Your publishing rhythm over the last 6 months</p></div>
                            <span className="chart-period">6 MONTHS</span>
                        </div>
                        <div className="monthly-chart" role="img" aria-label={monthlyActivity.map(({ label, count }) => `${label}: ${count}`).join(", ")}>
                            {monthlyActivity.map(({ label, count }) => (
                                <div className="month-column" key={`${label}-${count}`}>
                                    <span className="month-count">{count || ""}</span>
                                    <div className="month-track">
                                        <span className="month-bar" style={{ height: `${Math.max(count ? 12 : 4, (count / maxMonthlyActivity) * 100)}%` }} />
                                    </div>
                                    <span className="month-label">{label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="panel types-panel">
                        <div className="panel-heading">
                            <div><h2>What you create</h2><p>Breakdown by activity type</p></div>
                        </div>
                        <div className="type-list">
                            {typeCounts.map(({ type, count }) => (
                                <div className="type-row" key={type}>
                                    <div className="type-label">
                                        <span className="type-dot" style={{ backgroundColor: TYPE_COLORS[type] }} />
                                        <span>{type === "Notebook" ? "Notebooks" : `${type}s`}</span>
                                        <strong>{count}</strong>
                                    </div>
                                    <div className="type-track">
                                        <span style={{ width: `${(count / maxTypeCount) * 100}%`, backgroundColor: TYPE_COLORS[type] }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <section className="panel recent-panel">
                    <div className="panel-heading recent-heading">
                        <div><h2>Recent activity</h2><p>Your latest notebooks and datasets</p></div>
                        {userData && <span className="activity-count">{userData.stats.total} items</span>}
                    </div>
                    {loading ? (
                        <div className="empty-state">Fetching your latest Kaggle activity…</div>
                    ) : sortedActivities.length > 0 ? (
                        <div className="activity-list">
                            {sortedActivities.slice(0, 6).map((activity) => (
                                <a
                                    className="activity-item"
                                    href={activity.url || profileUrl}
                                    key={activity.id}
                                    rel="noreferrer"
                                    target="_blank"
                                >
                                    <span className="activity-type-mark" style={{ color: TYPE_COLORS[activity.type] }}>
                                        {activity.type === "Notebook" ? "▤" : activity.type === "Dataset" ? "◫" : "◈"}
                                    </span>
                                    <span className="activity-details">
                                        <strong>{activity.title}</strong>
                                        <span>{activity.type}{activity.language ? ` · ${activity.language}` : ""}</span>
                                    </span>
                                    <span className="activity-date">{formatDate(activity.date)}</span>
                                    <span className="activity-arrow" aria-hidden="true">↗</span>
                                </a>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">{error ? "Activity could not be loaded." : "No activity found for this profile yet."}</div>
                    )}
                </section>

                <p className="dashboard-attribution">
                    Showing public activity for <a href={profileUrl} target="_blank" rel="noreferrer">@{userData?.username}</a>
                </p>
            </div>
        </main>
    );
};
