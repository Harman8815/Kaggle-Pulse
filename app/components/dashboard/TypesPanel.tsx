"use client";

import { TYPE_COLORS } from "./utils";
import type { TypeCount, ActivityType } from "./types";

interface TypesPanelProps {
    typeCounts: TypeCount[];
}

export const TypesPanel = ({ typeCounts }: TypesPanelProps) => {
    const maxTypeCount = Math.max(1, ...typeCounts.map(({ count }) => count));

    const getColor = (type: string) => TYPE_COLORS[type as ActivityType] ?? "#888888";

    return (
        <section className="panel types-panel">
            <div className="panel-heading">
                <div><h2>What you create</h2><p>Breakdown by activity type</p></div>
            </div>
            <div className="type-list">
                {typeCounts.map(({ type, count }) => (
                    <div className="type-row" key={type}>
                        <div className="type-label">
                            <span className="type-dot" style={{ backgroundColor: getColor(type) }} />
                            <span>{type === "Notebook" ? "Notebooks" : `${type}s`}</span>
                            <strong>{count}</strong>
                        </div>
                        <div className="type-track">
                            <span style={{ width: `${(count / maxTypeCount) * 100}%`, backgroundColor: getColor(type) }} />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};