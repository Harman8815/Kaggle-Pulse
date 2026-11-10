"use client";

import { useState, useEffect } from "react";
import type { KaggleUserData } from "../../utils/api";

interface DashboardHeaderProps {
    userData: KaggleUserData | null;
    loading: boolean;
    error: string | null;
    onRetry: () => void;
}

export const DashboardHeader = ({ userData, loading, error, onRetry }: DashboardHeaderProps) => {
    const [theme, setTheme] = useState<"light" | "dark">("light");

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

    const profileUrl = userData?.profileUrl ?? "https://www.kaggle.com";

    return (
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
    );
};