"use client";

export const DashboardSkeleton = () => (
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