"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { formatDate, heatLevel, dateKey } from "./utils";
import type { HeatmapData } from "./types";

interface Heatmap2DProps {
    heatmap: HeatmapData | null;
}

export const Heatmap2D = ({ heatmap }: Heatmap2DProps) => {
    if (!heatmap) return null;

    return (
        <Tooltip.Provider delayDuration={150}>
            <div className="heatmap-scroll">
                <div className="heatmap-calendar">
                    <div className="heatmap-months" style={{ gridTemplateColumns: `repeat(${heatmap.weeks.length}, 12px)` }}>
                        {heatmap.weeks.map((week, index) => {
                            const firstDay = week[0]?.date;
                            const previous = heatmap.weeks[index - 1]?.[0]?.date;
                            const showLabel = firstDay && (!previous || firstDay.getUTCMonth() !== previous.getUTCMonth());
                            return <span key={index}>{showLabel ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(firstDay) : ""}</span>;
                        })}
                    </div>
                    <div className="heatmap-body">
                        <div className="weekday-labels" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
                        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${heatmap.weeks.length}, 12px)` }}>
                            {heatmap.weeks.map((week, weekIndex) => (
                                <div className="heatmap-week" key={weekIndex}>
                                    {week.map(({ date, count }) => {
                                        const dateLabel = formatDate(date.toISOString());
                                        const activityLabel = `${count} ${count === 1 ? "activity" : "activities"}`;
                                        return (
                                            <Tooltip.Root key={dateKey(date)}>
                                                <Tooltip.Trigger asChild>
                                                    <button
                                                        aria-label={`${activityLabel} on ${dateLabel}`}
                                                        className={`heat-cell heat-level-${heatLevel(count)}`}
                                                        type="button"
                                                    />
                                                </Tooltip.Trigger>
                                                <Tooltip.Portal>
                                                    <Tooltip.Content className="heatmap-tooltip" side="top" sideOffset={7}>
                                                        <strong>{activityLabel}</strong>
                                                        <span>{dateLabel}</span>
                                                        <Tooltip.Arrow className="heatmap-tooltip-arrow" />
                                                    </Tooltip.Content>
                                                </Tooltip.Portal>
                                            </Tooltip.Root>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Tooltip.Provider>
    );
};