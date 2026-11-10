"use client";

import { useRef, useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { formatDate, heatLevel, getHeatLevelColor, getHeatLevelHeight, dateKey } from "./utils";
import type { HeatmapData } from "./types";

export interface Heatmap3DConfig {
    camera: {
        position: [number, number, number];
        fov: number;
    };
    orbitControls: {
        enablePan: boolean;
        enableZoom: boolean;
        enableRotate: boolean;
        minPolarAngle: number;
        maxPolarAngle: number;
        minDistance: number;
        maxDistance: number;
    };
    lights: {
        ambientIntensity: number;
        directionalIntensity: number;
        directionalPosition: [number, number, number];
    };
}

export const DEFAULT_HEATMAP_3D_CONFIG: Heatmap3DConfig = {
    camera: {
        position: [0, 150, 150],
        fov: 40,
    },
    orbitControls: {
        enablePan: true,
        enableZoom: true,
        enableRotate: true,
        minPolarAngle: 0,
        maxPolarAngle: Math.PI / 2 - 0.1,
        minDistance: 10,
        maxDistance: 800,
    },
    lights: {
        ambientIntensity: 0.6,
        directionalIntensity: 1,
        directionalPosition: [50, 100, 50],
    },
};

export interface Heatmap3DActions {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    togglePan: () => void;
    setTopDownView: () => void;
    setDefaultView: () => void;
}

interface Heatmap3DProps {
    heatmap: HeatmapData | null;
    config?: Partial<Heatmap3DConfig>;
    onReady?: (actions: Heatmap3DActions) => void;
}

const TOOLTIP_AUTO_CLOSE_MS = 3000;

const Heatmap3D = forwardRef<Heatmap3DActions, Heatmap3DProps>(
    ({ heatmap, config, onReady }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const canvasRef = useRef<any>(null);
        const orbitControlsRef = useRef<any>(null);
        const cameraRef = useRef<any>(null);
        const [activeCell, setActiveCell] = useState<{ date: string; count: number; dayIndex: number } | null>(null);
        const [panEnabled, setPanEnabled] = useState(true);
        const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const mergedConfig = useMemo(() => ({
            ...DEFAULT_HEATMAP_3D_CONFIG,
            ...config,
            camera: { ...DEFAULT_HEATMAP_3D_CONFIG.camera, ...config?.camera },
            orbitControls: { ...DEFAULT_HEATMAP_3D_CONFIG.orbitControls, ...config?.orbitControls },
            lights: { ...DEFAULT_HEATMAP_3D_CONFIG.lights, ...config?.lights },
        }), [config]);

        const defaultCameraPosition = mergedConfig.camera.position;
        const defaultCameraFov = mergedConfig.camera.fov;

        useImperativeHandle(ref, () => ({
            zoomIn: () => {
                if (orbitControlsRef.current) {
                    orbitControlsRef.current.dollyIn(1.2);
                }
            },
            zoomOut: () => {
                if (orbitControlsRef.current) {
                    orbitControlsRef.current.dollyOut(1.2);
                }
            },
            resetView: () => {
                if (cameraRef.current && orbitControlsRef.current) {
                    cameraRef.current.position.set(...defaultCameraPosition);
                    cameraRef.current.lookAt(0, 0, 0);
                    orbitControlsRef.current.target.set(0, 0, 0);
                    orbitControlsRef.current.update();
                }
            },
            togglePan: () => {
                if (orbitControlsRef.current) {
                    const newPanEnabled = !panEnabled;
                    setPanEnabled(newPanEnabled);
                    orbitControlsRef.current.enablePan = newPanEnabled;
                }
            },
            setTopDownView: () => {
                if (cameraRef.current && orbitControlsRef.current) {
                    cameraRef.current.position.set(0, 300, 0);
                    cameraRef.current.lookAt(0, 0, 0);
                    orbitControlsRef.current.target.set(0, 0, 0);
                    orbitControlsRef.current.update();
                }
            },
            setDefaultView: () => {
                if (cameraRef.current && orbitControlsRef.current) {
                    cameraRef.current.position.set(...defaultCameraPosition);
                    cameraRef.current.lookAt(0, 0, 0);
                    orbitControlsRef.current.target.set(0, 0, 0);
                    orbitControlsRef.current.update();
                }
            },
        }));

        useEffect(() => {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    setActiveCell(null);
                }
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, []);

        const clearTooltipTimeout = () => {
            if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
            }
        };

        const setActiveCellWithTimeout = (cell: { date: string; count: number; dayIndex: number } | null) => {
            clearTooltipTimeout();
            setActiveCell(cell);
            if (cell) {
                tooltipTimeoutRef.current = setTimeout(() => {
                    setActiveCell(null);
                }, TOOLTIP_AUTO_CLOSE_MS);
            }
        };

        useEffect(() => {
            return () => clearTooltipTimeout();
        }, []);

        if (!heatmap) return null;

        const cellSize = 12;
        const gap = 4;

        const cells = useMemo(() => {
            const result: Array<{
                position: [number, number, number];
                level: number;
                date: Date;
                count: number;
                weekIndex: number;
                dayIndex: number;
            }> = [];

            heatmap.weeks.forEach((week, weekIndex) => {
                week.forEach(({ date, count }, dayIndex) => {
                    const level = heatLevel(count);
                    const x = (weekIndex - heatmap.weeks.length / 2) * (cellSize + gap);
                    const z = (dayIndex - 3) * (cellSize + gap);
                    const height = getHeatLevelHeight(level);
                    result.push({
                        position: [x, height / 2, z],
                        level,
                        date,
                        count,
                        weekIndex,
                        dayIndex,
                    });
                });
            });

            return result;
        }, [heatmap]);

        const monthLabels = useMemo(() => {
            const labels: Array<{ position: [number, number, number]; rotation?: [number, number, number]; label: string }> = [];
            const seenMonths = new Set<string>();

            heatmap.weeks.forEach((week, weekIndex) => {
                const firstDay = week[0]?.date;
                const previous = heatmap.weeks[weekIndex - 1]?.[0]?.date;
                const showLabel = firstDay && (!previous || firstDay.getUTCMonth() !== previous.getUTCMonth());

                if (showLabel && firstDay) {
                    const monthKey = `${firstDay.getUTCFullYear()}-${firstDay.getUTCMonth()}`;
                    if (!seenMonths.has(monthKey)) {
                        seenMonths.add(monthKey);
                        const x = (weekIndex - heatmap.weeks.length / 2) * (cellSize + gap);
                        labels.push({
                            position: [x, 2, -70],
                            rotation: [0, 0, 90 * (Math.PI / 180)],
                            label: new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(firstDay),
                        });
                    }
                }
            });

            return labels;
        }, [heatmap]);

        const dayLabels = useMemo(() => {
            const days = ["Mon", "Wed", "Fri"];
            return days.map((day, dayIndex) => ({
                label: day,
                z: (dayIndex - 1) * (cellSize + gap) * 2,
            }));
        }, []);

        return (
            <div ref={containerRef} className="heatmap-3d-container" style={{ width: "100%", height: "580px" }}>
                <Canvas
                    ref={canvasRef}
                    camera={{ position: defaultCameraPosition, fov: defaultCameraFov }}
                    onCreated={({ gl, camera }) => {
                        gl.setClearColor(0x000000, 0);
                        cameraRef.current = camera;
                    }}
                >
                    <ambientLight intensity={mergedConfig.lights.ambientIntensity} />
                    <directionalLight
                        position={mergedConfig.lights.directionalPosition}
                        intensity={mergedConfig.lights.directionalIntensity}
                    />
                    <directionalLight
                        position={[-mergedConfig.lights.directionalPosition[0], 100, -mergedConfig.lights.directionalPosition[2]]}
                        intensity={mergedConfig.lights.directionalIntensity * 0.5}
                    />

                    <OrbitControls
                        ref={orbitControlsRef}
                        enablePan={mergedConfig.orbitControls.enablePan}
                        enableZoom={mergedConfig.orbitControls.enableZoom}
                        enableRotate={mergedConfig.orbitControls.enableRotate}
                        minPolarAngle={mergedConfig.orbitControls.minPolarAngle}
                        maxPolarAngle={mergedConfig.orbitControls.maxPolarAngle}
                        minDistance={mergedConfig.orbitControls.minDistance}
                        maxDistance={mergedConfig.orbitControls.maxDistance}
                    />

                    <group>
                        {monthLabels.map((ml, index) => (
                            <MonthLabel3D
                                key={index}
                                position={ml.position}
                                label={ml.label}
                            />
                        ))}

                        {dayLabels.map((dl, index) => (
                            <DayLabel3D
                                key={index}
                                position={[-heatmap.weeks.length / 2 * (cellSize + gap) - 20, 2, dl.z]}
                                label={dl.label}
                            />
                        ))}

                        {cells.map((cell) => (
                            <HeatmapCell3D
                                key={`${cell.weekIndex}-${cell.dayIndex}`}
                                position={cell.position}
                                level={cell.level}
                                height={getHeatLevelHeight(cell.level)}
                                color={getHeatLevelColor(cell.level, true)}
                                date={cell.date}
                                count={cell.count}
                                dayIndex={cell.dayIndex}
                                onClick={() => setActiveCellWithTimeout({ date: formatDate(cell.date.toISOString()), count: cell.count, dayIndex: cell.dayIndex })}
                            />
                        ))}
                    </group>
                </Canvas>

                {activeCell && (
                    <div className="heatmap-tooltip heatmap-tooltip-3d" style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        zIndex: 10,
                        pointerEvents: "none",
                        animation: "tooltip-enter 120ms ease-out",
                    }}>
                        <strong>{activeCell.count} {activeCell.count === 1 ? "activity" : "activities"}</strong>
                        <span>{activeCell.date}</span>
                        <button onClick={() => setActiveCellWithTimeout(null)} className="tooltip-close" aria-label="Close">×</button>
                    </div>
                )}
            </div>
        );
    }
);

const HeatmapCell3D = ({
    position,
    level,
    height,
    color,
    date,
    count,
    dayIndex,
    onClick,
}: {
    position: [number, number, number];
    level: number;
    height: number;
    color: string;
    date: Date;
    count: number;
    dayIndex: number;
    onClick: () => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);

    return (
        <mesh
            ref={meshRef}
            position={position}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={onClick}
        >
            <boxGeometry args={[12, height, 12]} />
            <meshStandardMaterial
                color={color}
                roughness={0.7}
                metalness={0.1}
                transparent
                opacity={hovered ? 0.9 : 1}
            />
        </mesh>
    );
};

const MonthLabel3D = ({ position, label }: { position: [number, number, number]; label: string }) => (
    <group position={position}>
        <mesh>
            <planeGeometry args={[60, 16]} />
            <meshBasicMaterial
                color="#17231e"
                transparent
                opacity={0.8}
                side={THREE.DoubleSide}
            />
        </mesh>
        <Text
            position={[0, 0, 0.1]}
            fontSize={8}
            color="#8ec6a0"
            anchorX="center"
            anchorY="middle"
        >
            {label}
        </Text>
    </group>
);

const DayLabel3D = ({ position, label }: { position: [number, number, number]; label: string }) => (
    <group position={position}>
        <mesh>
            <planeGeometry args={[30, 14]} />
            <meshBasicMaterial
                color="#17231e"
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
            />
        </mesh>
        <Text
            position={[0, 0, 0.1]}
            fontSize={7}
            color="#a0afa5"
            anchorX="center"
            anchorY="middle"
        >
            {label}
        </Text>
    </group>
);

Heatmap3D.displayName = "Heatmap3D";

export default Heatmap3D;