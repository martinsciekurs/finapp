"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let path = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[Math.min(points.length - 1, i + 2)]!;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

export function SparklineChart({
  data,
  width = 80,
  height = 28,
  className,
  color,
}: SparklineChartProps) {
  const prefersReducedMotion = useReducedMotion();

  if (data.length < 2) return null;

  const max = Math.max(...data);
  if (max === 0) return null;

  const padding = 2;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * chartWidth,
    y: padding + chartHeight - (value / max) * chartHeight,
  }));

  const linePath = buildSmoothPath(points);
  const firstPoint = points[0]!;
  const lastPoint = points[points.length - 1]!;
  const areaPath = `${linePath} L ${lastPoint.x} ${height - padding} L ${firstPoint.x} ${height - padding} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <motion.path
        d={areaPath}
        fill={color ?? "currentColor"}
        initial={prefersReducedMotion ? { opacity: 0.12 } : { opacity: 0 }}
        animate={{ opacity: 0.12 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.25, delay: 0.05 }
        }
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={color ?? "currentColor"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={
          prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.25, ease: "easeOut" }
        }
      />
    </svg>
  );
}
