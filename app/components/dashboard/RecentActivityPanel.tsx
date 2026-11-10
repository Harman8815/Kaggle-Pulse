"use client";

import { formatDate, TYPE_COLORS, TYPE_ICONS } from "./utils";
import type { KaggleActivity, KaggleUserData } from "../../utils/api";

interface RecentActivityPanelProps {
    activities: KaggleActivity[];
    loading: boolean;
    error: string | null;
    userData: KaggleUserData | null;
    profileUrl: string;
}

export const RecentActivityPanel = ({
    activities,
    loading,
    error,
    userData,
    profileUrl,
}: RecentActivityPanelProps) => {
    const sortedActivities = [...activities].sort((a, b) =>
        (b.date ? new Date(b.date).getTime() : Number.NEGATIVE_INFINITY) -
        (a.date ? new Date(a.date).getTime() : Number.NEGATIVE_INFINITY)
    );

    return (
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
                                {TYPE_ICONS[activity.type]}
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
    );
};