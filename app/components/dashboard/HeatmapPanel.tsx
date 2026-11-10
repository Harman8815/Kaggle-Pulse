"use client";

import { useState, useRef, useCallback } from "react";
import { Heatmap2D } from "./Heatmap2D";
import { Heatmap3D, Heatmap3DActions } from "./Heatmap3D";
import type { HeatmapData } from "./types";

interface HeatmapPanelProps {
    heatmap: HeatmapData | null;
    loading: boolean;
}

export const HeatmapPanel = ({ heatmap, loading }: HeatmapPanelProps) => {
    const [heatmapMode, setHeatmapMode] = useState<"2d" | "3d">("2d");
    const heatmap3DRef = useRef<Heatmap3DActions>(null);

    const handleZoomIn = useCallback(() => {
        heatmap3DRef.current?.zoomIn();
    }, []);

    const handleZoomOut = useCallback(() => {
        heatmap3DRef.current?.zoomOut();
    }, []);

    const handleResetView = useCallback(() => {
        heatmap3DRef.current?.resetView();
    }, []);

    const handleTogglePan = useCallback(() => {
        heatmap3DRef.current?.togglePan();
    }, []);

    const handleTopDownView = useCallback(() => {
        heatmap3DRef.current?.setTopDownView();
    }, []);

    const handleDefaultView = useCallback(() => {
        heatmap3DRef.current?.setDefaultView();
    }, []);

    return (
        <section className="panel heatmap-panel">
            <div className="panel-heading">
                <div>
                    <h2>Contribution activity</h2>
                    <p>{loading ? "Loading activity history…" : `${heatmap?.total ?? 0} activities over the last year`}</p>
                </div>
                <div className="heatmap-controls">
                    <div className="heatmap-view-toggle" role="group" aria-label="Heatmap view">
                        <button
                            aria-pressed={heatmapMode === "2d"}
                            className={heatmapMode === "2d" ? "is-active" : ""}
                            onClick={() => setHeatmapMode("2d")}
                            type="button"
                        >
                            2D
                        </button>
                        <button
                            aria-pressed={heatmapMode === "3d"}
                            className={heatmapMode === "3d" ? "is-active" : ""}
                            onClick={() => setHeatmapMode("3d")}
                            type="button"
                        >
                            3D
                        </button>
                    </div>
                    {heatmapMode === "2d" && (
                        <div className="heatmap-legend" aria-label="Less to more activity">
                            <span>Less</span>
                            {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`heat-cell heat-level-${level}`} />)}
                            <span>More</span>
                        </div>
                    )}
                    {heatmapMode === "3d" && (
                        <Heatmap3DControls
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onResetView={handleResetView}
                            onTogglePan={handleTogglePan}
                            onTopDownView={handleTopDownView}
                            onDefaultView={handleDefaultView}
                        />
                    )}
                </div>
            </div>
            {heatmapMode === "2d" ? (
                <Heatmap2D heatmap={heatmap} />
            ) : (
                <Heatmap3D ref={heatmap3DRef} heatmap={heatmap} />
            )}
        </section>
    );
};

interface Heatmap3DControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    onTogglePan: () => void;
    onTopDownView: () => void;
    onDefaultView: () => void;
}

const Heatmap3DControls = ({
    onZoomIn,
    onZoomOut,
    onResetView,
    onTogglePan,
    onTopDownView,
    onDefaultView,
}: Heatmap3DControlsProps) => {
    return (
        <div className="heatmap-3d-controls" role="group" aria-label="3D view controls">
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Zoom in"
                onClick={onZoomIn}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
            </button>
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Zoom out"
                onClick={onZoomOut}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
            </button>
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Reset view"
                onClick={onResetView}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M21 12a9 9 0 1 0-9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                </svg>
            </button>
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Toggle pan mode"
                onClick={onTogglePan}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="5 9 2 12 5 15" />
                    <polyline points="9 5 12 2 15 5" />
                    <polyline points="15 19 12 22 9 19" />
                    <polyline points="19 9 22 12 19 15" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                </svg>
            </button>
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Top-down view"
                onClick={onTopDownView}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" />
                    <path d="M12 8v8M8 12h8" />
                </svg>
            </button>
            <button
                type="button"
                className="heatmap-3d-control-btn"
                aria-label="Default view"
                onClick={onDefaultView}
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                </svg>
            </button>
        </div>
    );
};