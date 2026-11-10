"use client";

import type { KaggleUserData } from "../../utils/api";

interface DashboardAttributionProps {
    userData: KaggleUserData | null;
}

export const DashboardAttribution = ({ userData }: DashboardAttributionProps) => {
    const profileUrl = userData?.profileUrl ?? "https://www.kaggle.com";

    return (
        <p className="dashboard-attribution">
            Showing public activity for <a href={profileUrl} target="_blank" rel="noreferrer">@{userData?.username}</a>
        </p>
    );
};