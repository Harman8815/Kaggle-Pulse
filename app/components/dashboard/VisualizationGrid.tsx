"use client";

import { MonthlyChart } from "./MonthlyChart";
import { TypesPanel } from "./TypesPanel";
import type { MonthlyActivity, TypeCount } from "./types";

interface VisualizationGridProps {
    monthlyActivity: MonthlyActivity[];
    typeCounts: TypeCount[];
}

export const VisualizationGrid = ({ monthlyActivity, typeCounts }: VisualizationGridProps) => (
    <div className="visualization-grid">
        <MonthlyChart monthlyActivity={monthlyActivity} />
        <TypesPanel typeCounts={typeCounts} />
    </div>
);