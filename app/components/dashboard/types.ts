import type { KaggleActivity, ActivityType } from "../../utils/api";

export type { ActivityType };
export interface HeatmapData {
    weeks: { date: Date; count: number }[][];
    total: number;
}

export interface MonthlyActivity {
    date: Date;
    label: string;
    count: number;
}

export interface TypeCount {
    type: string;
    count: number;
}

export interface HeatmapCellData {
    date: Date;
    count: number;
    level: number;
    weekIndex: number;
    dayIndex: number;
}

export type HeatmapMode = "2d" | "3d";

export interface DashboardData {
    userData: any;
    heatmap: HeatmapData | null;
    monthlyActivity: MonthlyActivity[];
    activities: KaggleActivity[];
}