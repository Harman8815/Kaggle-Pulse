"use client";

import type { KaggleUserData } from "../../utils/api";
import { latestLabel } from "./utils";

interface StatsGridProps {
    userData: KaggleUserData | null;
    loading: boolean;
    latestActivity: any;
}

export const StatsGrid = ({ userData, loading, latestActivity }: StatsGridProps) => (
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
);