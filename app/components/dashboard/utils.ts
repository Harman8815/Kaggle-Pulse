"use client";

import type { ActivityType, KaggleActivity } from "../../utils/api";

export const ACTIVITY_TYPES: ActivityType[] = [
    "Notebook",
    "Dataset",
    "Model",
    "Competition",
    "Discussion",
];

export const TYPE_COLORS: Record<ActivityType, string> = {
    Notebook: "#20a879",
    Dataset: "#4e7cf5",
    Model: "#9b6bdf",
    Competition: "#e5a331",
    Discussion: "#e56e77",
};

export const TYPE_ICONS: Record<ActivityType, string> = {
    Notebook: "▤",
    Dataset: "◫",
    Model: "◈",
    Competition: "◆",
    Discussion: "◆",
};

export const dateKey = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const formatDate = (value: string | null) => {
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

export const getActivityDate = (activity: KaggleActivity) =>
    activity.date ? new Date(activity.date).getTime() : Number.NEGATIVE_INFINITY;

export const buildHeatmap = (activities: KaggleActivity[]) => {
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

export const buildMonthlyActivity = (activities: KaggleActivity[]) => {
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

export const heatLevel = (count: number) => {
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count === 2) return 2;
    if (count <= 4) return 3;
    return 4;
};

export const latestLabel = (activity: KaggleActivity | undefined) =>
    activity ? formatDate(activity.date) : "No activity yet";

export const getHeatLevelColor = (level: number, isDark: boolean): string => {
    if (isDark) {
        const colors = ["#26332c", "#28523d", "#28714e", "#299460", "#36ba7a"];
        return colors[level] ?? colors[0];
    }
    const colors = ["#eff2f0", "#c9eadb", "#88d0ad", "#4eb889", "#16835d"];
    return colors[level] ?? colors[0];
};

export const getHeatLevelHeight = (level: number): number => {
    const heights = [1, 2, 4, 6, 8];
    return heights[level] ?? 1;
};