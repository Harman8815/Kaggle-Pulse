"use client";

import type { MonthlyActivity } from "./types";

interface MonthlyChartProps {
    monthlyActivity: MonthlyActivity[];
}

export const MonthlyChart = ({ monthlyActivity }: MonthlyChartProps) => {
    const maxMonthlyActivity = Math.max(1, ...monthlyActivity.map((month) => month.count));

    return (
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
    );
};